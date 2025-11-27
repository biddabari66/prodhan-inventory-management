import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

const formatCurrency = (amount) => `BDT ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getDisplayName = (item) => item.english_item_name || item.item_name || 'Unknown Item';
const getDepartmentName = (dept) => {
    const names = { 'boibari': 'Boibari.com', 'prodhan_com_e_commerce': 'Prodhan.com' };
    return names[dept] || dept;
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        let params = { department: 'all', startDate: null, endDate: null, category: 'all' };
        try { params = { ...params, ...(await req.json()) }; } catch (e) {}

        const [inventory, orders, movements] = await Promise.all([
            base44.asServiceRole.entities.Inventory.list(),
            base44.asServiceRole.entities.Order.list(),
            base44.asServiceRole.entities.InventoryMovement.list()
        ]);

        // Filter inventory by department and category
        let filteredInventory = inventory;
        if (params.department !== 'all') {
            filteredInventory = filteredInventory.filter(i => i.department === params.department);
        }
        if (params.category !== 'all') {
            filteredInventory = filteredInventory.filter(i => i.category === params.category);
        }

        const inventoryIds = new Set(filteredInventory.map(i => i.id));

        // Filter orders by date range
        let filteredOrders = orders.filter(o => o.order_status !== 'cancelled');
        if (params.startDate) {
            filteredOrders = filteredOrders.filter(o => new Date(o.created_date) >= new Date(params.startDate));
        }
        if (params.endDate) {
            filteredOrders = filteredOrders.filter(o => new Date(o.created_date) <= new Date(params.endDate));
        }

        // Calculate sales metrics per product
        const salesByProduct = {};
        filteredOrders.forEach(order => {
            (order.order_items || []).forEach(item => {
                if (!inventoryIds.has(item.inventory_id)) return;
                if (!salesByProduct[item.inventory_id]) {
                    salesByProduct[item.inventory_id] = { qty: 0, revenue: 0, orders: 0, profit: 0 };
                }
                salesByProduct[item.inventory_id].qty += item.quantity || 0;
                salesByProduct[item.inventory_id].revenue += item.total_price || 0;
                salesByProduct[item.inventory_id].orders += 1;
            });
        });

        // Enrich with inventory data
        const salesData = filteredInventory.map(item => {
            const sales = salesByProduct[item.id] || { qty: 0, revenue: 0, orders: 0 };
            const profit = sales.qty * ((item.selling_price || 0) - (item.purchase_price || 0));
            return {
                name: getDisplayName(item),
                category: item.category || 'N/A',
                department: item.department,
                unitsSold: sales.qty,
                revenue: sales.revenue,
                orders: sales.orders,
                purchasePrice: item.purchase_price || 0,
                sellingPrice: item.selling_price || 0,
                profit: profit,
                profitMargin: item.purchase_price > 0 ? ((item.selling_price - item.purchase_price) / item.purchase_price * 100) : 0
            };
        }).filter(d => d.unitsSold > 0).sort((a, b) => b.revenue - a.revenue);

        // Calculate totals
        const totals = salesData.reduce((acc, d) => ({
            unitsSold: acc.unitsSold + d.unitsSold,
            revenue: acc.revenue + d.revenue,
            profit: acc.profit + d.profit,
            orders: acc.orders + d.orders
        }), { unitsSold: 0, revenue: 0, profit: 0, orders: 0 });

        // Generate PDF
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Header
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('INVENTORY SALES REPORT', 14, 18);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        const deptText = params.department === 'all' ? 'All Departments' : getDepartmentName(params.department);
        const dateText = params.startDate && params.endDate 
            ? `${new Date(params.startDate).toLocaleDateString('en-US')} - ${new Date(params.endDate).toLocaleDateString('en-US')}`
            : 'All Time';
        doc.text(`${deptText} | ${dateText}`, 14, 28);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - 14, 18, { align: 'right' });
        doc.text(`By: ${user.full_name || user.email}`, pageWidth - 14, 28, { align: 'right' });

        doc.setTextColor(0, 0, 0);

        // Summary Box
        doc.setFillColor(240, 253, 244);
        doc.rect(10, 42, pageWidth - 20, 25, 'F');
        doc.setDrawColor(187, 247, 208);
        doc.rect(10, 42, pageWidth - 20, 25, 'S');

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(20, 83, 45);
        doc.text('SALES SUMMARY', 14, 52);

        const summaryY = 60;
        const colW = (pageWidth - 28) / 4;
        const summaryItems = [
            { label: 'Total Units Sold', value: totals.unitsSold.toLocaleString() },
            { label: 'Total Revenue', value: formatCurrency(totals.revenue) },
            { label: 'Total Profit', value: formatCurrency(totals.profit) },
            { label: 'Total Orders', value: totals.orders.toLocaleString() }
        ];
        doc.setFontSize(9);
        summaryItems.forEach((item, i) => {
            doc.setTextColor(51, 65, 85);
            doc.setFont(undefined, 'bold');
            doc.text(item.label, 14 + colW * i, summaryY);
            doc.setTextColor(16, 185, 129);
            doc.setFont(undefined, 'normal');
            doc.text(item.value, 14 + colW * i, summaryY + 5);
        });

        doc.setTextColor(0, 0, 0);

        // Top Selling Products
        if (salesData.length > 0) {
            const tableColumns = ['Product Name', 'Category', 'Dept', 'Units Sold', 'Revenue', 'Profit', 'Margin %', 'Orders'];
            const tableRows = salesData.map(d => [
                d.name.substring(0, 30) + (d.name.length > 30 ? '...' : ''),
                d.category,
                d.department === 'boibari' ? 'Boibari' : 'Prodhan',
                d.unitsSold,
                formatCurrency(d.revenue),
                formatCurrency(d.profit),
                d.profitMargin.toFixed(1) + '%',
                d.orders
            ]);

            doc.autoTable({
                head: [tableColumns],
                body: tableRows,
                startY: 72,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center' },
                alternateRowStyles: { fillColor: [240, 253, 244] },
                columnStyles: {
                    0: { cellWidth: 50 },
                    3: { halign: 'center' },
                    4: { halign: 'right' },
                    5: { halign: 'right' },
                    6: { halign: 'center' },
                    7: { halign: 'center' }
                },
                didDrawPage: function() {
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
                    doc.text('Confidential - Bee ERP', 14, pageHeight - 10);
                }
            });
        } else {
            doc.setFontSize(14);
            doc.setTextColor(107, 114, 128);
            doc.text('No sales data found for the selected period.', pageWidth / 2, 90, { align: 'center' });
        }

        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            status: 200,
            headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=inventory_sales_report.pdf' }
        });
    } catch (error) {
        console.error('Error generating sales report:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
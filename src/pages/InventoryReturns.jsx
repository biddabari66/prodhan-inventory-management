import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

const formatCurrency = (amount) => `BDT ${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getDisplayName = (item) => item.english_item_name || item.item_name || 'Unknown Item';
const getDepartmentName = (dept) => {
    const names = { 'boibari': 'Boibari.com', 'prodhan_com_e_commerce': 'Prodhan.com' };
    return names[dept] || dept;
};

// ✅ Safe date helpers — fixes RangeError: Invalid time value
const safeDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

const safeFormatDate = (value, fallback = 'N/A') => {
    const d = safeDate(value);
    return d ? d.toLocaleDateString('en-US') : fallback;
};

const safeFormatDateLong = (value, fallback = 'N/A') => {
    const d = safeDate(value);
    return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : fallback;
};

const safeFilterByDate = (value, compareDate, mode = 'gte') => {
    const d = safeDate(value);
    if (!d) return false;
    return mode === 'gte' ? d >= compareDate : d <= compareDate;
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        let params = { department: 'all', startDate: null, endDate: null };
        try { params = { ...params, ...(await req.json()) }; } catch (e) {}

        const [inventory, movements] = await Promise.all([
            base44.asServiceRole.entities.Inventory.list(),
            base44.asServiceRole.entities.InventoryMovement.list()
        ]);

        const inventoryMap = new Map(inventory.map(i => [i.id, i]));

        // Filter damage movements
        let damagedMovements = movements.filter(m => 
            m.reference_type === 'damage' || 
            m.movement_type === 'adjustment' && m.notes?.toLowerCase().includes('damage')
        );

        // ✅ Safe date filtering
        if (params.startDate) {
            const start = new Date(params.startDate);
            damagedMovements = damagedMovements.filter(m =>
                safeFilterByDate(m.movement_date || m.created_date, start, 'gte')
            );
        }
        if (params.endDate) {
            const end = new Date(params.endDate);
            damagedMovements = damagedMovements.filter(m =>
                safeFilterByDate(m.movement_date || m.created_date, end, 'lte')
            );
        }
        if (params.department !== 'all') {
            damagedMovements = damagedMovements.filter(m => {
                const item = inventoryMap.get(m.inventory_item_id);
                return item && item.department === params.department;
            });
        }

        // Aggregate by product
        const damageByProduct = {};
        damagedMovements.forEach(m => {
            const item = inventoryMap.get(m.inventory_item_id);
            if (!item) return;
            
            if (!damageByProduct[m.inventory_item_id]) {
                damageByProduct[m.inventory_item_id] = {
                    name: getDisplayName(item),
                    category: item.category || 'N/A',
                    department: item.department,
                    totalQty: 0,
                    totalValue: 0,
                    incidents: [],
                    purchasePrice: item.purchase_price || 0
                };
            }
            
            const qty = Math.abs(m.quantity || 0);
            const value = Math.abs(m.total_value || qty * (item.purchase_price || 0));
            
            damageByProduct[m.inventory_item_id].totalQty += qty;
            damageByProduct[m.inventory_item_id].totalValue += value;
            damageByProduct[m.inventory_item_id].incidents.push({
                date: m.movement_date || m.created_date || null, // ✅ explicit null fallback
                qty: qty,
                value: value,
                reason: m.notes || m.reason || 'Not specified'
            });
        });

        const damageData = Object.values(damageByProduct).sort((a, b) => b.totalValue - a.totalValue);

        // Calculate totals
        const totals = damageData.reduce((acc, d) => ({
            totalQty: acc.totalQty + d.totalQty,
            totalValue: acc.totalValue + d.totalValue,
            incidents: acc.incidents + d.incidents.length
        }), { totalQty: 0, totalValue: 0, incidents: 0 });

        // Generate PDF
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Header
        doc.setFillColor(239, 68, 68);
        doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('DAMAGED INVENTORY REPORT', 14, 18);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        const deptText = params.department === 'all' ? 'All Departments' : getDepartmentName(params.department);

        // ✅ Safe date formatting for header
        const dateText = params.startDate && params.endDate 
            ? `${safeFormatDate(params.startDate)} - ${safeFormatDate(params.endDate)}`
            : 'All Time';
        doc.text(`${deptText} | ${dateText}`, 14, 28);
        doc.setFontSize(10);
        doc.text(`Generated: ${safeFormatDateLong(new Date())}`, pageWidth - 14, 18, { align: 'right' });
        doc.text(`By: ${user.full_name || user.email}`, pageWidth - 14, 28, { align: 'right' });

        doc.setTextColor(0, 0, 0);

        // Summary Box
        doc.setFillColor(254, 242, 242);
        doc.rect(10, 42, pageWidth - 20, 25, 'F');
        doc.setDrawColor(254, 202, 202);
        doc.rect(10, 42, pageWidth - 20, 25, 'S');

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(153, 27, 27);
        doc.text('DAMAGE SUMMARY', 14, 52);

        const summaryY = 60;
        const colW = (pageWidth - 28) / 4;
        const summaryItems = [
            { label: 'Total Products Affected', value: damageData.length.toString() },
            { label: 'Total Units Damaged', value: totals.totalQty.toLocaleString() },
            { label: 'Total Value Lost', value: formatCurrency(totals.totalValue) },
            { label: 'Total Incidents', value: totals.incidents.toLocaleString() }
        ];
        doc.setFontSize(9);
        summaryItems.forEach((item, i) => {
            doc.setTextColor(51, 65, 85);
            doc.setFont(undefined, 'bold');
            doc.text(item.label, 14 + colW * i, summaryY);
            doc.setTextColor(239, 68, 68);
            doc.setFont(undefined, 'normal');
            doc.text(item.value, 14 + colW * i, summaryY + 5);
        });

        doc.setTextColor(0, 0, 0);

        if (damageData.length > 0) {
            const tableColumns = ['Product Name', 'Category', 'Department', 'Units Damaged', 'Unit Cost', 'Total Loss', 'Incidents'];
            const tableRows = damageData.map(d => [
                d.name.substring(0, 35) + (d.name.length > 35 ? '...' : ''),
                d.category,
                d.department === 'boibari' ? 'Boibari' : 'Prodhan',
                d.totalQty,
                formatCurrency(d.purchasePrice),
                formatCurrency(d.totalValue),
                d.incidents.length
            ]);

            doc.autoTable({
                head: [tableColumns],
                body: tableRows,
                startY: 72,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', halign: 'center' },
                alternateRowStyles: { fillColor: [254, 242, 242] },
                columnStyles: {
                    0: { cellWidth: 55 },
                    3: { halign: 'center' },
                    4: { halign: 'right' },
                    5: { halign: 'right' },
                    6: { halign: 'center' }
                },
                didDrawPage: function() {
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184);
                    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
                    doc.text('Confidential - Bee ERP', 14, pageHeight - 10);
                }
            });

            // Detailed Incident List
            const detailY = doc.lastAutoTable.finalY + 15;
            if (detailY + 50 < pageHeight) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(51, 65, 85);
                doc.text('RECENT DAMAGE INCIDENTS', 14, detailY);

                const recentIncidents = [];
                damageData.forEach(product => {
                    product.incidents.slice(0, 3).forEach(inc => {
                        recentIncidents.push([
                            safeFormatDate(inc.date), // ✅ safe — no more RangeError
                            product.name.substring(0, 25) + (product.name.length > 25 ? '...' : ''),
                            inc.qty,
                            formatCurrency(inc.value),
                            inc.reason.substring(0, 40) + (inc.reason.length > 40 ? '...' : '')
                        ]);
                    });
                });

                doc.autoTable({
                    head: [['Date', 'Product', 'Qty', 'Value', 'Reason']],
                    body: recentIncidents.slice(0, 15),
                    startY: detailY + 5,
                    styles: { fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: [107, 114, 128], textColor: 255, fontStyle: 'bold' },
                    columnStyles: { 0: { cellWidth: 25 }, 4: { cellWidth: 60 } }
                });
            }
        } else {
            doc.setFontSize(14);
            doc.setTextColor(16, 185, 129);
            doc.text('No damage incidents found for the selected period.', pageWidth / 2, 90, { align: 'center' });
        }

        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            status: 200,
            headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=damaged_inventory_report.pdf' }
        });
    } catch (error) {
        console.error('Error generating damaged report:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
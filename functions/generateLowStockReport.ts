import { createClient } from 'npm:@base44/sdk@0.1.0';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        base44.auth.setToken(authHeader.split(' ')[1]);

        const inventoryItems = await base44.entities.Inventory.list();
        const lowStockItems = inventoryItems.filter(item => (item.current_stock || 0) < (item.minimum_stock || 0));

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Low Stock Alert Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        if (lowStockItems.length === 0) {
            doc.setFontSize(12);
            doc.text("All items are above minimum stock levels. No alerts found.", 14, 45);
        } else {
            const tableColumn = ["Item Name", "Category", "Current Stock", "Minimum Stock", "Shortfall"];
            const tableRows = [];

            lowStockItems.forEach(item => {
                const shortfall = (item.minimum_stock || 0) - (item.current_stock || 0);
                const itemData = [
                    item.item_name,
                    item.category,
                    item.current_stock || 0,
                    item.minimum_stock || 0,
                    shortfall
                ];
                tableRows.push(itemData);
            });
            doc.autoTable(tableColumn, tableRows, { startY: 40 });
        }
        
        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            status: 200,
            headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=low_stock_report.pdf' }
        });

    } catch (error) {
        console.error('Error generating report:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
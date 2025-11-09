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
        
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Stock Valuation Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Item Name", "Category", "Current Stock", "Purchase Price (BDT)", "Total Value (BDT)"];
        const tableRows = [];
        let grandTotal = 0;

        inventoryItems.forEach(item => {
            const totalValue = (item.current_stock || 0) * (item.purchase_price || 0);
            grandTotal += totalValue;
            const itemData = [
                item.item_name,
                item.category,
                item.current_stock || 0,
                (item.purchase_price || 0).toFixed(2),
                totalValue.toFixed(2)
            ];
            tableRows.push(itemData);
        });

        doc.autoTable(tableColumn, tableRows, { startY: 40 });
        
        const finalY = doc.lastAutoTable.finalY || 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Grand Total Stock Value: BDT ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 10);
        
        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            status: 200,
            headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=stock_valuation.pdf' }
        });

    } catch (error) {
        console.error('Error generating report:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
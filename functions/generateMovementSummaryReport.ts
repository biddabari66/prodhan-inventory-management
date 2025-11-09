import { createClient } from 'npm:@base44/sdk@0.1.0';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        base44.auth.setToken(authHeader.split(' ')[1]);

        const [movements, inventory] = await Promise.all([
            base44.entities.InventoryMovement.list(),
            base44.entities.Inventory.list()
        ]);

        const inventoryMap = new Map(inventory.map(item => [item.id, item.item_name]));
        
        const summary = movements.reduce((acc, move) => {
            const itemName = inventoryMap.get(move.inventory_item_id) || 'Unknown Item';
            if (!acc[itemName]) {
                acc[itemName] = { stock_in: 0, stock_out: 0 };
            }
            
            const quantity = move.quantity || 0;

            if (quantity > 0) {
                acc[itemName].stock_in += quantity;
            } else {
                acc[itemName].stock_out += Math.abs(quantity);
            }
            
            return acc;
        }, {});

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Inventory Movement Summary Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text('This report summarizes all recorded stock movements.', 14, 35);
        
        const tableColumn = ["Item Name", "Total Stock In", "Total Stock Out", "Net Change"];
        const tableRows = [];

        Object.keys(summary).forEach(itemName => {
            const data = summary[itemName];
            const netChange = data.stock_in - data.stock_out;
            const itemData = [
                itemName,
                data.stock_in,
                data.stock_out,
                netChange > 0 ? `+${netChange}` : netChange
            ];
            tableRows.push(itemData);
        });

        doc.autoTable(tableColumn, tableRows, { startY: 45 });
        
        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            status: 200,
            headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename=movement_summary_report.pdf' }
        });

    } catch (error) {
        console.error('Error generating report:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
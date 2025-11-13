import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch inventory items and movements
        const [inventoryItems, movements] = await Promise.all([
            base44.asServiceRole.entities.Inventory.list(),
            base44.asServiceRole.entities.InventoryMovement.list()
        ]);

        // Aggregate movements by inventory item
        const movementsByItem = {};
        movements.forEach(m => {
            if (!movementsByItem[m.inventory_item_id]) {
                movementsByItem[m.inventory_item_id] = {
                    total_returned_qty: 0,
                    total_damaged_qty: 0,
                    total_returned_value: 0,
                    total_damaged_value: 0
                };
            }

            const movementData = movementsByItem[m.inventory_item_id];
            
            if (m.movement_type === 'return') {
                movementData.total_returned_qty += Math.abs(m.quantity || 0);
                movementData.total_returned_value += Math.abs(m.total_value || 0);
            } else if (m.movement_type === 'adjustment' || m.reference_type === 'damage') {
                movementData.total_damaged_qty += Math.abs(m.quantity || 0);
                movementData.total_damaged_value += Math.abs(m.total_value || 0);
            }
        });

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Stock Valuation Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = [
            "Item Name", 
            "Category", 
            "Stock", 
            "Price (৳)", 
            "Value (৳)",
            "Returned",
            "Damaged"
        ];
        const tableRows = [];
        let grandTotal = 0;
        let totalReturned = 0;
        let totalDamaged = 0;

        inventoryItems.forEach(item => {
            const totalValue = (item.current_stock || 0) * (item.purchase_price || 0);
            const returnedQty = movementsByItem[item.id]?.total_returned_qty || 0;
            const damagedQty = movementsByItem[item.id]?.total_damaged_qty || 0;
            const returnedValue = movementsByItem[item.id]?.total_returned_value || 0;
            const damagedValue = movementsByItem[item.id]?.total_damaged_value || 0;

            grandTotal += totalValue;
            totalReturned += returnedValue;
            totalDamaged += damagedValue;

            const itemData = [
                item.item_name,
                item.category,
                item.current_stock || 0,
                (item.purchase_price || 0).toFixed(2),
                totalValue.toFixed(2),
                `${returnedQty} (৳${returnedValue.toFixed(2)})`,
                `${damagedQty} (৳${damagedValue.toFixed(2)})`
            ];
            tableRows.push(itemData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [124, 58, 237], textColor: 255 }
        });
        
        const finalY = doc.lastAutoTable.finalY || 40;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Grand Total Stock Value: ৳${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 14, finalY + 10);
        doc.text(`Total Returned Value: ৳${totalReturned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 14, finalY + 18);
        doc.text(`Total Damaged Value: ৳${totalDamaged.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 14, finalY + 26);
        
        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            status: 200,
            headers: { 
                'Content-Type': 'application/pdf', 
                'Content-Disposition': 'attachment; filename=stock_valuation_with_returns_damages.pdf' 
            }
        });

    } catch (error) {
        console.error('Error generating report:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
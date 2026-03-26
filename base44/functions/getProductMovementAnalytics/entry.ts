import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productIds, startDate, endDate, department } = await req.json();

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return Response.json({ error: 'Product IDs are required' }, { status: 400 });
        }

        // Fetch all required data in parallel
        const [inventory, orders, movements] = await Promise.all([
            base44.asServiceRole.entities.Inventory.list(),
            base44.asServiceRole.entities.Order.list(),
            base44.asServiceRole.entities.InventoryMovement.list()
        ]);

        // Filter inventory by requested products and department
        const relevantInventory = inventory.filter(item => {
            const matchesId = productIds.includes(item.id);
            const matchesDept = !department || department === 'all' || item.department === department;
            return matchesId && matchesDept;
        });

        // Parse dates
        const cutoffDate = startDate ? new Date(startDate) : new Date(0);
        const endDateObj = endDate ? new Date(endDate) : new Date();

        // Filter orders within date range
        const relevantOrders = orders.filter(order => {
            const orderDate = new Date(order.order_date);
            return orderDate >= cutoffDate && orderDate <= endDateObj;
        });

        // Process each product
        const productAnalytics = relevantInventory.map(product => {
            // Filter movements for this product
            const productMovements = movements.filter(m => m.inventory_item_id === product.id);
            
            // Filter movements within date range
            const dateFilteredMovements = productMovements.filter(m => {
                const movementDate = new Date(m.movement_date);
                return movementDate >= cutoffDate && movementDate <= endDateObj;
            });

            // PURCHASES: movement_type === 'in' and reference_type !== 'return'
            const purchaseMovements = dateFilteredMovements.filter(m => 
                m.movement_type === 'in' && m.reference_type !== 'return'
            );
            const totalPurchasedQty = purchaseMovements.reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);
            const totalPurchasedValue = purchaseMovements.reduce((sum, m) => sum + Math.abs(m.total_value || 0), 0);

            // RETURNS: reference_type === 'return' (regardless of movement_type)
            const returnMovements = dateFilteredMovements.filter(m => m.reference_type === 'return');
            const totalReturnedQty = returnMovements.reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);
            const totalReturnedValue = returnMovements.reduce((sum, m) => sum + Math.abs(m.total_value || 0), 0);

            // DAMAGES: reference_type === 'damage' or 'expired'
            const damageMovements = dateFilteredMovements.filter(m => 
                m.reference_type === 'damage' || m.reference_type === 'expired'
            );
            const totalDamagedQty = damageMovements.reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);
            const totalDamagedValue = damageMovements.reduce((sum, m) => sum + Math.abs(m.total_value || 0), 0);

            // SALES: from orders
            const productOrders = relevantOrders.filter(order =>
                order.order_items?.some(item => item.inventory_id === product.id)
            );

            const totalSold = productOrders.reduce((sum, order) => {
                const item = order.order_items.find(i => i.inventory_id === product.id);
                return sum + (item?.quantity || 0);
            }, 0);

            const totalRevenue = productOrders.reduce((sum, order) => {
                const item = order.order_items.find(i => i.inventory_id === product.id);
                return sum + (item?.subtotal || 0);
            }, 0);

            const avgOrderValue = productOrders.length > 0 ? totalRevenue / productOrders.length : 0;

            // Stock metrics
            const stockValue = product.current_stock * product.purchase_price;
            const potentialRevenue = product.current_stock * product.selling_price;
            const profitMargin = product.selling_price > 0 
                ? ((product.selling_price - product.purchase_price) / product.selling_price) * 100 
                : 0;

            // All outbound movements for "Total Movements" count
            const outboundMovements = dateFilteredMovements.filter(m => m.movement_type === 'out');
            const totalMovements = outboundMovements.length;
            const movementValue = Math.abs(outboundMovements.reduce((sum, m) => sum + (m.total_value || 0), 0));

            return {
                product_id: product.id,
                product_name: product.item_name,
                category: product.category,
                department: product.department,
                current_stock: product.current_stock,
                minimum_stock: product.minimum_stock,
                purchase_price: product.purchase_price,
                selling_price: product.selling_price,
                supplier_name: product.supplier_name,
                supplier_contact: product.supplier_contact,
                supplier_lead_time_days: product.supplier_lead_time_days,
                isbn: product.isbn,
                barcode: product.barcode,
                
                // Sales metrics
                totalSold,
                totalRevenue,
                totalOrders: productOrders.length,
                avgOrderValue,
                
                // Stock metrics
                stockValue,
                potentialRevenue,
                profitMargin,
                
                // Movement metrics
                totalMovements,
                movementValue,
                
                // Purchase metrics
                totalPurchasedQty,
                totalPurchasedValue,
                
                // Return metrics
                totalReturnedQty,
                totalReturnedValue,
                
                // Damage metrics
                totalDamagedQty,
                totalDamagedValue,
                
                // Aggregate loss
                totalLossValue: totalReturnedValue + totalDamagedValue
            };
        });

        return Response.json({
            success: true,
            data: productAnalytics,
            metadata: {
                productCount: productAnalytics.length,
                dateRange: { start: startDate, end: endDate },
                department: department || 'all',
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error generating product movement analytics:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});
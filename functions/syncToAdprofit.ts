import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Fetch the order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    const order = orders[0];

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if already synced
    if (order.adprofit_synced) {
      return Response.json({ 
        success: true, 
        message: 'Already synced to Adprofit',
        already_synced: true 
      });
    }

    // Transform order items to Adprofit sales format
    const salesData = order.items.map(item => ({
      product_id: item.product_id,
      date: order.order_date || new Date().toISOString().split('T')[0],
      quantity: item.quantity,
      sale_price: item.price,
      notes: `Order #${order.order_number} - Customer: ${order.customer_name || 'N/A'} - Delivered`
    }));

    // Send each item as a separate sale to Adprofit
    const syncResults = [];
    for (const saleData of salesData) {
      try {
        const response = await fetch(
          'https://app.base44.com/api/apps/695229a34998792cb0a1cbeb/entities/Sale',
          {
            method: 'POST',
            headers: {
              'api_key': '656fbd615f1540248c9a12f2a58c2c40',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(saleData)
          }
        );

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(`API Error: ${JSON.stringify(result)}`);
        }

        syncResults.push({ success: true, product_id: saleData.product_id, sale_id: result.id });
      } catch (error) {
        syncResults.push({ success: false, product_id: saleData.product_id, error: error.message });
      }
    }

    // Check if all syncs succeeded
    const allSuccess = syncResults.every(r => r.success);

    // Update order with sync status
    await base44.asServiceRole.entities.Order.update(order_id, {
      adprofit_synced: allSuccess,
      adprofit_sync_date: new Date().toISOString(),
      adprofit_sync_results: JSON.stringify(syncResults)
    });

    return Response.json({
      success: allSuccess,
      message: allSuccess 
        ? `Successfully synced ${syncResults.length} items to Adprofit`
        : 'Partial sync - some items failed',
      results: syncResults,
      order_id: order_id
    });

  } catch (error) {
    console.error('Adprofit sync error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
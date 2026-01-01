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
      return Response.json({ error: 'order_id required' }, { status: 400 });
    }

    // Fetch order details
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    
    if (orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Check if order is delivered
    if (order.order_status !== 'delivered') {
      return Response.json({ 
        error: 'Order must be in delivered status',
        current_status: order.order_status 
      }, { status: 400 });
    }

    // Check if already synced
    if (order.adprofit_synced) {
      return Response.json({ 
        success: false,
        message: 'Order already synced to Adprofit',
        synced_at: order.adprofit_sync_date
      });
    }

    // Prepare sale data for each order item
    const syncResults = [];
    
    for (const item of order.items || []) {
      const saleData = {
        erp_sale_id: `${order.order_number}-${item.product_id}`,
        erp_product_id: item.product_id,
        quantity: item.quantity,
        sale_price: item.price,
        date: order.order_date || new Date().toISOString().split('T')[0],
        customer_name: order.customer_name || 'N/A',
        notes: `Order: ${order.order_number} | Customer: ${order.customer_name || 'N/A'}`
      };

      // Send to Adprofit API
      const adprofitResponse = await fetch(
        'https://app.base44.com/api/apps/695229a34998792cb0a1cbeb/functions/receiveSaleFromERP',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(saleData)
        }
      );

      const result = await adprofitResponse.json();
      
      syncResults.push({
        product_id: item.product_id,
        product_name: item.product_name,
        success: adprofitResponse.ok,
        result
      });
    }

    // Update order sync status
    await base44.asServiceRole.entities.Order.update(order_id, {
      adprofit_synced: true,
      adprofit_sync_date: new Date().toISOString(),
      adprofit_sync_results: syncResults
    });

    return Response.json({
      success: true,
      message: 'Order synced to Adprofit successfully',
      order_number: order.order_number,
      items_synced: syncResults.length,
      results: syncResults
    });

  } catch (error) {
    console.error('Adprofit sync error:', error);
    return Response.json({ 
      error: 'Sync failed', 
      details: error.message 
    }, { status: 500 });
  }
});
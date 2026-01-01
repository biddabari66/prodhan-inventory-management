import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ADPROFIT SYNC FUNCTION
 * Automatically syncs delivered orders to Adprofit for profit tracking
 * Triggers when order status changes to "delivered"
 */

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

    // Get order details
    const orders = await base44.entities.Order.filter({ id: order_id });
    const order = orders[0];

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if already synced
    if (order.adprofit_synced) {
      return Response.json({ 
        success: true, 
        message: 'Order already synced to Adprofit',
        skipped: true 
      });
    }

    // Get Adprofit credentials from secrets
    const ADPROFIT_API_KEY = Deno.env.get('ADPROFIT_API_KEY');
    const ADPROFIT_APP_ID = Deno.env.get('ADPROFIT_APP_ID');

    if (!ADPROFIT_API_KEY || !ADPROFIT_APP_ID) {
      console.error('Missing Adprofit credentials');
      return Response.json({ 
        error: 'Adprofit integration not configured. Please set ADPROFIT_API_KEY and ADPROFIT_APP_ID.' 
      }, { status: 500 });
    }

    const adprofitEndpoint = `https://app.base44.com/api/apps/${ADPROFIT_APP_ID}/functions/receiveSaleFromERP`;

    // Sync each order item to Adprofit
    const syncResults = [];
    const orderDate = order.actual_delivery_date || order.order_date;
    const formattedDate = new Date(orderDate).toISOString().split('T')[0]; // YYYY-MM-DD

    for (const item of order.order_items || []) {
      try {
        const adprofitPayload = {
          erp_sale_id: `${order.order_number}-${item.inventory_id}`, // Unique per product
          erp_product_id: item.inventory_id, // Product ID from Bee ERP
          quantity: item.quantity,
          sale_price: item.unit_price,
          date: formattedDate,
          customer_name: order.customer_name
        };

        console.log('Sending to Adprofit:', adprofitPayload);

        const response = await fetch(adprofitEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key': ADPROFIT_API_KEY
          },
          body: JSON.stringify(adprofitPayload)
        });

        const result = await response.json();

        if (response.ok) {
          syncResults.push({
            item_name: item.item_name,
            inventory_id: item.inventory_id,
            status: 'success',
            action: result.action || 'created',
            adprofit_response: result
          });
        } else {
          syncResults.push({
            item_name: item.item_name,
            inventory_id: item.inventory_id,
            status: 'failed',
            error: result.error || 'Unknown error'
          });
        }
      } catch (itemError) {
        console.error('Error syncing item:', item.item_name, itemError);
        syncResults.push({
          item_name: item.item_name,
          inventory_id: item.inventory_id,
          status: 'failed',
          error: itemError.message
        });
      }
    }

    // Check if all items synced successfully
    const allSuccess = syncResults.every(r => r.status === 'success');
    const anySuccess = syncResults.some(r => r.status === 'success');

    // Update order with sync status
    await base44.entities.Order.update(order_id, {
      adprofit_synced: allSuccess,
      adprofit_sync_date: new Date().toISOString(),
      adprofit_sync_status: allSuccess ? 'success' : (anySuccess ? 'partial' : 'failed'),
      adprofit_sync_results: syncResults
    });

    return Response.json({
      success: allSuccess,
      partial: anySuccess && !allSuccess,
      order_number: order.order_number,
      synced_items: syncResults.filter(r => r.status === 'success').length,
      failed_items: syncResults.filter(r => r.status === 'failed').length,
      total_items: syncResults.length,
      details: syncResults
    });

  } catch (error) {
    console.error('Adprofit sync error:', error);
    return Response.json({ 
      error: 'Sync to Adprofit failed', 
      details: error.message 
    }, { status: 500 });
  }
});
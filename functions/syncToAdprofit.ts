import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ADPROFIT SYNC FUNCTION
 * Automatically syncs delivered BEE ERP orders to Adprofit for profit analysis
 * 
 * Triggered when order status changes to "delivered"
 * Creates sales records in Adprofit with product_id mapping
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id } = await req.json();

    if (!order_id) {
      return Response.json({ 
        error: 'Missing required parameter: order_id' 
      }, { status: 400 });
    }

    // Fetch the order
    const orders = await base44.entities.Order.filter({ id: order_id });
    const order = orders[0];

    if (!order) {
      return Response.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Check if order is delivered
    if (order.order_status !== 'delivered') {
      return Response.json({ 
        error: 'Order must be in delivered status to sync',
        current_status: order.order_status
      }, { status: 400 });
    }

    // Check if already synced
    if (order.adprofit_synced) {
      return Response.json({ 
        message: 'Order already synced to Adprofit',
        synced_date: order.adprofit_sync_date
      });
    }

    const ADPROFIT_API_URL = 'https://prodhan-profitpulse.base44.app/api/apps/695229a34998792cb0a1cbeb/functions/receiveSaleFromERP';
    const ADPROFIT_API_KEY = '656fbd615f1540248c9a12f2a58c2c40';

    const syncResults = [];
    const errors = [];

    // Sync each order item as a separate sale in Adprofit
    for (const item of order.order_items) {
      try {
        // Fetch inventory item to get product details
        const inventoryItems = await base44.entities.Inventory.filter({ id: item.inventory_id });
        const inventoryItem = inventoryItems[0];

        if (!inventoryItem) {
          errors.push({
            item_name: item.item_name,
            error: 'Inventory item not found'
          });
          continue;
        }

        // Prepare Adprofit payload - using SKU (barcode) as product_id
        if (!inventoryItem.barcode) {
          errors.push({
            item_name: item.item_name,
            error: 'Product missing SKU/barcode - cannot sync to Adprofit'
          });
          continue;
        }

        const adprofitPayload = {
          erp_sale_id: `${order.order_number}-${item.inventory_id}`, // Unique per item
          erp_product_id: inventoryItem.barcode, // SKU/barcode as required by Adprofit
          quantity: item.quantity,
          sale_price: item.unit_price,
          date: order.actual_delivery_date || new Date().toISOString().split('T')[0],
          customer_name: order.customer_name
        };

        // Send to Adprofit
        const response = await fetch(ADPROFIT_API_URL, {
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
            status: 'success',
            action: result.action || 'created',
            adprofit_sale_id: result.sale?.id
          });
        } else {
          errors.push({
            item_name: item.item_name,
            error: result.error || 'Unknown error from Adprofit'
          });
        }
      } catch (itemError) {
        errors.push({
          item_name: item.item_name,
          error: itemError.message
        });
      }
    }

    // Update order sync status
    const updateData = {
      adprofit_sync_date: new Date().toISOString()
    };

    if (errors.length === 0) {
      // Full success
      updateData.adprofit_synced = true;
      updateData.adprofit_sync_error = null;
    } else if (syncResults.length > 0) {
      // Partial success
      updateData.adprofit_synced = true;
      updateData.adprofit_sync_error = `Partial sync: ${errors.length} items failed`;
    } else {
      // Complete failure
      updateData.adprofit_synced = false;
      updateData.adprofit_sync_error = `All items failed to sync`;
    }

    await base44.entities.Order.update(order_id, updateData);

    return Response.json({
      success: true,
      order_number: order.order_number,
      synced_items: syncResults.length,
      failed_items: errors.length,
      sync_results: syncResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Adprofit sync error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ADPROFIT SYNC FUNCTION
 * Automatically syncs delivered BEE ERP orders to Adprofit for profit analysis
 * 
 * Triggered when order status changes to "delivered"
 * Creates sales records in Adprofit with product_id mapping
 * Uses Asia/Dhaka (BDT) timezone for all dates
 */

// Convert date to Bangladesh (Dhaka) timezone
const toBDTDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

Deno.serve(async (req) => {
  console.log('🚀 Adprofit sync function called');
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      console.error('❌ Authentication failed');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.email);

    const { order_id } = await req.json();
    console.log('📦 Syncing order ID:', order_id);

    if (!order_id) {
      return Response.json({ 
        error: 'Missing required parameter: order_id' 
      }, { status: 400 });
    }

    // Fetch the order
    const orders = await base44.entities.Order.filter({ id: order_id });
    const order = orders[0];

    if (!order) {
      console.error('❌ Order not found:', order_id);
      return Response.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    console.log('✅ Order found:', order.order_number, 'Status:', order.order_status);

    // Check if order is delivered
    if (order.order_status !== 'delivered') {
      console.warn('⚠️ Order not delivered:', order.order_status);
      return Response.json({ 
        error: 'Order must be in delivered status to sync',
        current_status: order.order_status
      }, { status: 400 });
    }

    // Check if already synced
    if (order.adprofit_synced) {
      console.log('ℹ️ Order already synced');
      return Response.json({ 
        message: 'Order already synced to Adprofit',
        synced_date: order.adprofit_sync_date
      });
    }

    console.log(`📋 Processing ${order.order_items.length} items`);

    const ADPROFIT_API_URL = 'https://prodhan-profitpulse.base44.app/api/apps/695229a34998792cb0a1cbeb/functions/receiveSaleFromERP';
    const ADPROFIT_API_KEY = '656fbd615f1540248c9a12f2a58c2c40';

    const syncResults = [];
    const errors = [];

    // Sync each order item as a separate sale in Adprofit
    for (const item of order.order_items) {
      console.log(`🔄 Processing item: ${item.item_name}`);
      
      try {
        // Fetch inventory item to get product details
        const inventoryItems = await base44.entities.Inventory.filter({ id: item.inventory_id });
        const inventoryItem = inventoryItems[0];

        if (!inventoryItem) {
          console.error('❌ Inventory item not found:', item.inventory_id);
          errors.push({
            item_name: item.item_name,
            error: 'Inventory item not found'
          });
          continue;
        }

        // Prepare Adprofit payload - using SKU (barcode) as product_id
        if (!inventoryItem.barcode) {
          console.error('❌ Missing SKU/barcode for:', item.item_name);
          errors.push({
            item_name: item.item_name,
            error: 'Product missing SKU/barcode - cannot sync to Adprofit'
          });
          continue;
        }

        const adprofitPayload = {
          erp_sale_id: `${order.order_number}-${item.inventory_id}`,
          erp_product_id: inventoryItem.barcode,
          quantity: item.quantity,
          sale_price: item.unit_price,
          date: toBDTDate(order.actual_delivery_date),
          customer_name: order.customer_name
        };

        console.log('📤 Sending to Adprofit:', JSON.stringify(adprofitPayload, null, 2));

        // Send to Adprofit
        const response = await fetch(ADPROFIT_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key': ADPROFIT_API_KEY
          },
          body: JSON.stringify(adprofitPayload)
        });

        console.log('📥 Adprofit response status:', response.status);
        
        const result = await response.json();
        console.log('📥 Adprofit response:', JSON.stringify(result, null, 2));

        if (response.ok) {
          console.log('✅ Item synced successfully:', item.item_name);
          syncResults.push({
            item_name: item.item_name,
            status: 'success',
            action: result.action || 'created',
            adprofit_sale_id: result.sale?.id
          });
        } else {
          console.error('❌ Adprofit API error:', result.error);
          errors.push({
            item_name: item.item_name,
            error: result.error || 'Unknown error from Adprofit'
          });
        }
      } catch (itemError) {
        console.error('❌ Item sync failed:', itemError.message);
        errors.push({
          item_name: item.item_name,
          error: itemError.message
        });
      }
    }

    console.log(`📊 Sync complete: ${syncResults.length} success, ${errors.length} failed`);

    // Update order sync status (using BDT timezone)
    const updateData = {
      adprofit_sync_date: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
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
    console.log('✅ Order sync status updated');

    const response = {
      success: true,
      order_number: order.order_number,
      synced_items: syncResults.length,
      failed_items: errors.length,
      sync_results: syncResults,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('🎉 Final response:', JSON.stringify(response, null, 2));
    return Response.json(response);

  } catch (error) {
    console.error('💥 Critical error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      stack: error.stack
    }, { status: 500 });
  }
});
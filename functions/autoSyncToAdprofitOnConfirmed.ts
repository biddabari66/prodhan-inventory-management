import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUTO ADPROFIT SYNC - PRODUCTION TRIGGER
 * Automatically syncs orders to Adprofit when they reach confirmed status
 * This function should be called by the order status change webhook/handler
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin auth required
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { order_id } = await req.json();
    
    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    console.log('🔄 Auto-sync triggered for order:', order_id);

    // Get the order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    const order = orders?.[0];

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only sync if confirmed or later, and not already synced
    const validStatuses = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    
    if (!validStatuses.includes(order.order_status)) {
      return Response.json({ 
        success: false, 
        message: 'Order not in syncable status',
        current_status: order.order_status 
      });
    }

    if (order.adprofit_synced) {
      return Response.json({ 
        success: true, 
        message: 'Order already synced',
        synced_date: order.adprofit_sync_date 
      });
    }

    // Trigger the sync
    console.log('📤 Invoking syncToAdprofit for order:', order.order_number || order.id);
    const syncResult = await base44.asServiceRole.functions.invoke('syncToAdprofit', { order_id });

    console.log('✅ Auto-sync completed:', syncResult.data);

    return Response.json({
      success: true,
      sync_result: syncResult.data,
      order_number: order.order_number || order.id
    });

  } catch (error) {
    console.error('❌ Auto-sync error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
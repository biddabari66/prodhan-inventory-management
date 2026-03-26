import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MANUAL/WEBHOOK ORDER STATUS UPDATE
 * Called from:
 * 1. Sales page "Update" button (sends to n8n, n8n returns status here)
 * 2. External n8n webhook (n8n sends delivery_status directly)
 * 
 * Accepts: order_number, tracking_code, consignment_id, delivery_status
 */

function mapSteadfastStatus(steadfastStatus) {
  const statusStr = (steadfastStatus || '').toLowerCase();
  
  // Delivered states
  if (statusStr.includes('delivered') || statusStr.includes('complete') || statusStr.includes('partial_delivered')) {
    return 'delivered';
  }
  
  // Cancelled/Returned states - maps to 'cancelled' order status
  if (statusStr.includes('cancelled') || statusStr.includes('cancel') || 
      statusStr.includes('return') || statusStr.includes('returned')) {
    return 'cancelled';
  }
  
  // All other states remain as 'shipped'
  return 'shipped';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse the incoming payload
    const payload = await req.json();
    const { 
      order_number, 
      tracking_code, 
      consignment_id, 
      delivery_status, 
      status,
      action // Optional: 'get_status' to fetch from Steadfast
    } = payload;
    
    console.log(`📦 Received update request:`, { order_number, tracking_code, consignment_id });
    
    // Find order by various identifiers
    let order = null;
    
    // Try by order number first
    if (order_number) {
      const ordersByNumber = await base44.asServiceRole.entities.Order.filter({ order_number });
      order = ordersByNumber[0];
    }
    
    // Try by tracking code
    if (!order && tracking_code) {
      const ordersByTracking = await base44.asServiceRole.entities.Order.filter({ courier_tracking_code: tracking_code });
      order = ordersByTracking[0];
    }
    
    // Try by consignment ID
    if (!order && consignment_id) {
      const ordersByConsignment = await base44.asServiceRole.entities.Order.filter({ courier_consignment_id: String(consignment_id) });
      order = ordersByConsignment[0];
    }
    
    if (!order) {
      return Response.json({ 
        success: false, 
        error: 'Order not found',
        searched: { order_number, tracking_code, consignment_id }
      }, { status: 404 });
    }
    
    // Get status from payload (should be provided by n8n after fetching from Steadfast)
    let externalStatus = delivery_status || status;
    
    // If no status provided, return info about the order for manual lookup
    if (!externalStatus) {
      return Response.json({ 
        success: false, 
        error: 'No delivery_status provided. Please configure your n8n workflow to fetch status from Steadfast and include delivery_status in the response.',
        order_number: order.order_number,
        order_id: order.id,
        consignment_id: order.courier_consignment_id,
        tracking_code: order.courier_tracking_code,
        current_status: order.order_status,
        current_courier_status: order.courier_status,
        hint: 'Your n8n workflow should call Steadfast API: GET https://portal.packzy.com/api/v1/status_by_cid/{consignment_id} with Api-Key and Secret-Key headers'
      }, { status: 400 });
    }
    
    // Map external status to internal order status
    const newOrderStatus = mapSteadfastStatus(externalStatus);
    
    // Only update order_status for delivered or cancelled, keep as shipped for other states
    const shouldUpdateOrderStatus = (newOrderStatus === 'delivered' || newOrderStatus === 'cancelled');
    
    // Prepare update data
    const updateData = {
      courier_status: externalStatus,
      // Only update order_status for delivered or cancelled
      ...(newOrderStatus === 'delivered' && {
        order_status: 'delivered',
        delivery_date: new Date().toISOString().split('T')[0]
      }),
      ...(newOrderStatus === 'cancelled' && {
        order_status: 'cancelled'
      })
      // For all other states (pending, in_review, hold, etc.), keep order_status as 'shipped'
    };
    
    // Update order
    await base44.asServiceRole.entities.Order.update(order.id, updateData);
    
    // If cancelled and was shipped, revert inventory
    let inventoryReverted = false;
    if (newOrderStatus === 'cancelled' && order.order_status === 'shipped') {
      try {
        await base44.asServiceRole.functions.invoke('revertInventoryOnCancel', {
          order_id: order.id,
          reason: `Cancelled via webhook/manual update: ${externalStatus}`
        });
        inventoryReverted = true;
        console.log(`✅ Inventory reverted for cancelled order ${order.order_number}`);
      } catch (revertError) {
        console.error(`Failed to revert inventory for ${order.order_number}:`, revertError);
      }
    }
    
    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: 'system',
      user_name: action === 'get_status' ? 'Manual Status Check' : 'Webhook Update',
      action: 'update',
      entity_type: 'Order',
      entity_id: order.id,
      module: 'sales',
      description: `Order ${order.order_number} courier: ${order.courier_status || 'unknown'} → ${externalStatus}${shouldUpdateOrderStatus ? ` | order: ${newOrderStatus}` : ''}${inventoryReverted ? ' | Inventory reverted' : ''}`,
      new_values: updateData,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Updated ${order.order_number}: courier=${externalStatus}, order=${shouldUpdateOrderStatus ? newOrderStatus : 'unchanged'}`);
    
    return Response.json({ 
      success: true, 
      order_number: order.order_number,
      order_id: order.id,
      previous_order_status: order.order_status,
      previous_courier_status: order.courier_status,
      new_order_status: shouldUpdateOrderStatus ? newOrderStatus : order.order_status,
      new_courier_status: externalStatus,
      order_status_changed: shouldUpdateOrderStatus,
      inventory_reverted: inventoryReverted,
      tracking_code: order.courier_tracking_code,
      consignment_id: order.courier_consignment_id
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
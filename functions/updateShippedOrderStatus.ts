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
  
  if (statusStr.includes('delivered') || statusStr.includes('complete')) {
    return 'delivered';
  }
  if (statusStr.includes('cancelled') || statusStr.includes('return')) {
    return 'returned';
  }
  if (statusStr.includes('partial')) {
    return 'delivered';
  }
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
    
    // Prepare update data
    const updateData = {
      courier_status: externalStatus,
      ...(newOrderStatus === 'delivered' && {
        order_status: 'delivered',
        delivery_date: new Date().toISOString().split('T')[0]
      }),
      ...(newOrderStatus === 'returned' && {
        order_status: 'returned'
      })
    };
    
    // Update order
    await base44.asServiceRole.entities.Order.update(order.id, updateData);
    
    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: 'system',
      user_name: action === 'get_status' ? 'Manual Status Check' : 'Webhook Update',
      action: 'update',
      entity_type: 'Order',
      entity_id: order.id,
      module: 'sales',
      description: `Order ${order.order_number} status: ${order.courier_status || 'unknown'} → ${externalStatus}`,
      new_values: updateData,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Updated ${order.order_number}: ${externalStatus} → ${newOrderStatus}`);
    
    return Response.json({ 
      success: true, 
      order_number: order.order_number,
      order_id: order.id,
      previous_status: order.order_status,
      previous_courier_status: order.courier_status,
      new_status: newOrderStatus,
      steadfast_status: externalStatus,
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
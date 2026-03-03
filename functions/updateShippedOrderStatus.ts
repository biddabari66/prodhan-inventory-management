import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse the incoming webhook payload
    const payload = await req.json();
    
    // Extract order tracking info and status from payload
    const { tracking_code, consignment_id, delivery_status, status } = payload;
    
    // Find order by tracking code or consignment ID
    let order = null;
    
    if (tracking_code) {
      const ordersByTracking = await base44.entities.Order.filter({ courier_tracking_code: tracking_code });
      order = ordersByTracking[0];
    }
    
    if (!order && consignment_id) {
      const ordersByConsignment = await base44.entities.Order.filter({ courier_consignment_id: String(consignment_id) });
      order = ordersByConsignment[0];
    }
    
    if (!order) {
      return Response.json({ 
        success: false, 
        error: 'Order not found',
        tracking_code,
        consignment_id
      }, { status: 404 });
    }
    
    // Determine new order status based on delivery status
    const externalStatus = (delivery_status || status || '').toLowerCase();
    let newOrderStatus = 'shipped'; // Default to shipped
    
    if (externalStatus.includes('delivered') || externalStatus.includes('complete')) {
      newOrderStatus = 'delivered';
    }
    
    // Update order status and courier info
    await base44.entities.Order.update(order.id, {
      order_status: newOrderStatus,
      courier_status: delivery_status || status || 'shipped',
      ...(newOrderStatus === 'delivered' && { delivery_date: new Date().toISOString().split('T')[0] })
    });
    
    // Create audit log
    await base44.entities.AuditLog.create({
      user_id: 'system',
      user_name: 'Courier Webhook',
      action: 'update',
      entity_type: 'Order',
      entity_id: order.id,
      module: 'sales',
      description: `Order ${order.order_number} status updated via webhook: ${externalStatus} → ${newOrderStatus}`,
      new_values: { order_status: newOrderStatus, courier_status: externalStatus },
      timestamp: new Date().toISOString()
    });
    
    return Response.json({ 
      success: true, 
      order_number: order.order_number,
      previous_status: order.order_status,
      new_status: newOrderStatus,
      external_status: externalStatus
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
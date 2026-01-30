import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Steadfast Status Webhook Handler
 * Receives POST requests from https://primary-production-2437.up.railway.app/webhook/...
 * Updates order status based on Steadfast courier status
 */

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        // Parse webhook payload
        const payload = await req.json();
        
        console.log('Received Steadfast status webhook:', payload);
        
        // Extract order ID and status from payload
        const orderId = payload.order_id || payload.invoice || payload.consignment_id;
        const steadfastStatus = payload.status || payload.delivery_status;
        
        if (!orderId) {
            return Response.json({ 
                success: false, 
                error: 'No order ID provided in webhook' 
            }, { status: 400 });
        }
        
        // Find order by order number (starts with PD)
        const orders = await base44.asServiceRole.entities.Order.filter({ 
            order_number: orderId 
        });
        
        if (!orders || orders.length === 0) {
            console.warn(`Order not found for ID: ${orderId}`);
            return Response.json({ 
                success: false, 
                error: `Order ${orderId} not found` 
            }, { status: 404 });
        }
        
        const order = orders[0];
        
        // Map Steadfast status to internal order status
        const statusMapping = {
            'pending': 'confirmed',
            'delivered_approval_pending': 'delivered',
            'partial_delivered_approval_pending': 'delivered',
            'cancelled_approval_pending': 'cancelled',
            'unknown_approval_pending': 'pending',
            'delivered': 'delivered',
            'partial_delivered': 'delivered',
            'cancelled': 'cancelled',
            'hold': 'pending',
            'in_review': 'processing',
            'unknown': 'pending'
        };
        
        const newOrderStatus = statusMapping[steadfastStatus?.toLowerCase()] || 'processing';
        
        // Update order status
        await base44.asServiceRole.entities.Order.update(order.id, {
            order_status: newOrderStatus,
            courier_status: steadfastStatus,
            courier_status_updated_at: new Date().toISOString()
        });
        
        console.log(`Updated order ${orderId} status to ${newOrderStatus} (Steadfast: ${steadfastStatus})`);
        
        return Response.json({
            success: true,
            message: `Order ${orderId} status updated to ${newOrderStatus}`,
            order_id: orderId,
            new_status: newOrderStatus,
            steadfast_status: steadfastStatus
        });
        
    } catch (error) {
        console.error('Webhook processing error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
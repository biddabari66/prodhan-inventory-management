import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Steadfast Status Webhook Handler
 * Receives POST requests and fetches status from Steadfast API
 * Uses BDT timezone (Asia/Dhaka) for all timestamps
 */

// Map Steadfast delivery status to internal order status
const STEADFAST_STATUS_MAPPING = {
    'pending': 'shipped',
    'delivered_approval_pending': 'out_for_delivery',
    'partial_delivered_approval_pending': 'out_for_delivery',
    'cancelled_approval_pending': 'cancelled',
    'unknown_approval_pending': 'shipped',
    'delivered': 'delivered',
    'partial_delivered': 'delivered',
    'cancelled': 'cancelled',
    'hold': 'shipped',
    'in_review': 'processing',
    'unknown': 'shipped'
};

// Map Steadfast status to payment status
const PAYMENT_STATUS_MAPPING = {
    'delivered': 'paid',
    'partial_delivered': 'partial'
};

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const payload = await req.json();
        console.log('Steadfast webhook payload:', JSON.stringify(payload));
        
        const orderId = payload.order_id || payload.invoice;
        const action = payload.action;
        
        if (!orderId) {
            return Response.json({ 
                success: false, 
                error: 'No order_id provided' 
            }, { status: 400 });
        }
        
        // Find order by order_number (PD format)
        const orders = await base44.asServiceRole.entities.Order.filter({ 
            order_number: orderId 
        });
        
        if (!orders || orders.length === 0) {
            console.warn(`Order not found: ${orderId}`);
            return Response.json({ 
                success: false, 
                error: `Order ${orderId} not found` 
            }, { status: 404 });
        }
        
        const order = orders[0];
        
        // If action is 'get_status', fetch from Steadfast API
        if (action === 'get_status') {
            // Call Steadfast API to get status
            const apiKey = Deno.env.get('STEADFAST_API_KEY');
            const secretKey = Deno.env.get('STEADFAST_SECRET_KEY');
            
            if (!apiKey || !secretKey) {
                return Response.json({ 
                    success: false, 
                    error: 'Steadfast API credentials not configured' 
                }, { status: 500 });
            }
            
            // Use consignment_id if available, otherwise use order_number as invoice
            const trackingId = order.courier_consignment_id || orderId;
            
            const steadfastResponse = await fetch(
                `https://portal.packzy.com/api/v1/status_by_invoice/${orderId}`,
                {
                    method: 'GET',
                    headers: {
                        'Api-Key': apiKey,
                        'Secret-Key': secretKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!steadfastResponse.ok) {
                const errorText = await steadfastResponse.text();
                console.error('Steadfast API error:', errorText);
                return Response.json({ 
                    success: false, 
                    error: 'Failed to fetch status from Steadfast',
                    details: errorText
                }, { status: 502 });
            }
            
            const steadfastData = await steadfastResponse.json();
            console.log('Steadfast API response:', JSON.stringify(steadfastData));
            
            // Extract delivery status
            const deliveryStatus = steadfastData?.delivery_status || steadfastData?.status || 'unknown';
            const newOrderStatus = STEADFAST_STATUS_MAPPING[deliveryStatus.toLowerCase()] || 'shipped';
            const newPaymentStatus = PAYMENT_STATUS_MAPPING[deliveryStatus.toLowerCase()];
            
            // Get current BDT time
            const bdtTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
            const bdtISOString = new Date(bdtTime).toISOString();
            
            // Update order
            const updateData = {
                order_status: newOrderStatus,
                courier_status: deliveryStatus,
                courier_status_updated_at: bdtISOString
            };
            
            // Update payment status for delivered orders
            if (newPaymentStatus && order.payment_method === 'cod') {
                updateData.payment_status = newPaymentStatus;
            }
            
            await base44.asServiceRole.entities.Order.update(order.id, updateData);
            
            console.log(`Updated order ${orderId}: ${newOrderStatus} (Steadfast: ${deliveryStatus})`);
            
            return Response.json({
                success: true,
                order_id: orderId,
                steadfast_status: deliveryStatus,
                new_order_status: newOrderStatus,
                updated_at: bdtISOString
            });
        }
        
        // Handle webhook callback from Steadfast (status push)
        const steadfastStatus = payload.status || payload.delivery_status || 'unknown';
        const newOrderStatus = STEADFAST_STATUS_MAPPING[steadfastStatus.toLowerCase()] || 'shipped';
        
        const bdtTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
        const bdtISOString = new Date(bdtTime).toISOString();
        
        await base44.asServiceRole.entities.Order.update(order.id, {
            order_status: newOrderStatus,
            courier_status: steadfastStatus,
            courier_status_updated_at: bdtISOString
        });
        
        return Response.json({
            success: true,
            order_id: orderId,
            steadfast_status: steadfastStatus,
            new_order_status: newOrderStatus
        });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
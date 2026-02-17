import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Steadfast Status Webhook Handler
 * When "Update" is clicked on the frontend:
 *   1. Finds the order by order_number (PD format)
 *   2. POSTs to the n8n webhook with invoice number
 *   3. Waits for response from n8n (which calls Steadfast API)
 *   4. Maps Steadfast delivery_status to internal order/payment status
 *   5. Only 'delivered' / 'partial_delivered' change status away from 'shipped'
 *      Everything else keeps order as 'shipped' (still in transit)
 *
 * Official Steadfast Delivery Statuses:
 * ┌────────────────────────────────────┬────────────────────────────────────────────────────┐
 * │ pending                            │ Consignment is not delivered or cancelled yet       │
 * │ delivered_approval_pending         │ Delivered but waiting for admin approval            │
 * │ partial_delivered_approval_pending │ Partially delivered, waiting for admin approval     │
 * │ cancelled_approval_pending         │ Cancelled, waiting for admin approval               │
 * │ unknown_approval_pending           │ Unknown pending - contact support                   │
 * │ delivered                          │ Delivered and balance added                         │
 * │ partial_delivered                  │ Partially delivered and balance added               │
 * │ cancelled                          │ Cancelled and balance updated                       │
 * │ hold                               │ Consignment is held                                 │
 * │ in_review                          │ Order placed and waiting to be reviewed             │
 * │ unknown                            │ Unknown status - contact support                    │
 * └────────────────────────────────────┴────────────────────────────────────────────────────┘
 *
 * Uses BDT timezone (Asia/Dhaka) for all timestamps
 */

// Internal order_status mapping
// Rule: ONLY confirmed delivered states change order away from 'shipped'
//       Everything else stays 'shipped' (still in transit / processing)
const ORDER_STATUS_MAP = {
    // Truly delivered — update order to delivered
    'delivered':                          'delivered',
    'partial_delivered':                  'delivered',

    // Cancelled states
    'cancelled':                          'cancelled',
    'cancelled_approval_pending':         'cancelled',

    // Approval pending — balance not settled yet, keep as shipped
    'delivered_approval_pending':         'shipped',
    'partial_delivered_approval_pending': 'shipped',

    // Still in transit / unclear — keep as shipped
    'pending':                            'shipped',
    'hold':                               'shipped',
    'in_review':                          'shipped',
    'unknown_approval_pending':           'shipped',
    'unknown':                            'shipped',
};

// Payment_status mapping (COD only)
// Only update payment when balance is confirmed added by Steadfast
const PAYMENT_STATUS_MAP = {
    'delivered':         'paid',
    'partial_delivered': 'partial',
};

// Human-readable label for frontend toast message
const STEADFAST_LABEL = {
    'pending':                            'Pending (Not delivered yet)',
    'delivered_approval_pending':         'Delivered - Awaiting Approval',
    'partial_delivered_approval_pending': 'Partially Delivered - Awaiting Approval',
    'cancelled_approval_pending':         'Cancelled - Awaiting Approval',
    'unknown_approval_pending':           'Unknown - Contact Support',
    'delivered':                          'Delivered',
    'partial_delivered':                  'Partially Delivered',
    'cancelled':                          'Cancelled',
    'hold':                               'On Hold',
    'in_review':                          'In Review',
    'unknown':                            'Unknown - Contact Support',
};

const N8N_WEBHOOK_URL = 'https://primary-production-2437.up.railway.app/webhook/49c76188-047b-4479-8166-2e5e92fd8b1a';

// Helper: get BDT ISO timestamp
function getBDTISOString() {
    const bdtTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
    return new Date(bdtTime).toISOString();
}

// Helper: extract delivery_status from various n8n/Steadfast response shapes
function extractDeliveryStatus(data) {
    return (
        data?.delivery_status ||
        data?.status ||
        data?.consignment?.status ||
        data?.data?.delivery_status ||
        'unknown'
    ).toLowerCase().trim();
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const payload = await req.json();
        console.log('Steadfast webhook payload:', JSON.stringify(payload));

        const orderId = payload.order_id || payload.invoice;
        const action  = payload.action;

        if (!orderId) {
            return Response.json({
                success: false,
                error: 'No order_id provided'
            }, { status: 400 });
        }

        // 1. Find order by order_number (PD format)
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

        // 2. "Update" button click → action === 'get_status'
        if (action === 'get_status') {

            console.log(`POSTing to n8n webhook for invoice: ${orderId}`);

            // POST to n8n webhook and await response
            let n8nRes;
            try {
                n8nRes = await fetch(N8N_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        invoice:                orderId,
                        order_id:               order.id,
                        courier_consignment_id: order.courier_consignment_id || null,
                        action:                 'get_status'
                    })
                });
            } catch (fetchErr) {
                console.error('Failed to reach n8n webhook:', fetchErr);
                return Response.json({
                    success: false,
                    error: 'Could not reach status webhook: ' + fetchErr.message
                }, { status: 502 });
            }

            if (!n8nRes.ok) {
                const errText = await n8nRes.text();
                console.error('n8n webhook error response:', errText);
                return Response.json({
                    success: false,
                    error: 'Status webhook returned an error',
                    details: errText
                }, { status: 502 });
            }

            // 3. Parse n8n / Steadfast response
            let responseData;
            try {
                responseData = await n8nRes.json();
            } catch {
                return Response.json({
                    success: false,
                    error: 'Status webhook returned non-JSON response'
                }, { status: 502 });
            }

            console.log('n8n response data:', JSON.stringify(responseData));

            // n8n sometimes returns an array — unwrap it
            const data = Array.isArray(responseData) ? responseData[0] : responseData;

            const deliveryStatus   = extractDeliveryStatus(data);
            const newOrderStatus   = ORDER_STATUS_MAP[deliveryStatus]   ?? 'shipped';
            const newPaymentStatus = PAYMENT_STATUS_MAP[deliveryStatus] ?? null;
            const statusLabel      = STEADFAST_LABEL[deliveryStatus]    ?? deliveryStatus;
            const bdtISOString     = getBDTISOString();

            console.log(
                `Order ${orderId} | Steadfast: "${deliveryStatus}" → ` +
                `order_status: "${newOrderStatus}" | payment: "${newPaymentStatus ?? 'unchanged'}"`
            );

            // 4. Build update payload
            const updateData = {
                courier_status:            deliveryStatus,
                courier_status_updated_at: bdtISOString,
                order_status:              newOrderStatus,
            };

            // Only update payment for COD orders on confirmed delivery
            if (newPaymentStatus && order.payment_method === 'cod') {
                updateData.payment_status = newPaymentStatus;
            }

            await base44.asServiceRole.entities.Order.update(order.id, updateData);

            return Response.json({
                success:          true,
                order_id:         orderId,
                steadfast_status: deliveryStatus,
                steadfast_label:  statusLabel,
                new_order_status: newOrderStatus,
                payment_updated:  !!newPaymentStatus,
                updated_at:       bdtISOString
            });
        }

        // Fallback: direct status push from Steadfast
        // (Steadfast calls this endpoint directly with a status payload)
        const deliveryStatus   = extractDeliveryStatus(payload);
        const newOrderStatus   = ORDER_STATUS_MAP[deliveryStatus]   ?? 'shipped';
        const newPaymentStatus = PAYMENT_STATUS_MAP[deliveryStatus] ?? null;
        const bdtISOString     = getBDTISOString();

        const updateData = {
            order_status:              newOrderStatus,
            courier_status:            deliveryStatus,
            courier_status_updated_at: bdtISOString,
        };

        if (newPaymentStatus && order.payment_method === 'cod') {
            updateData.payment_status = newPaymentStatus;
        }

        await base44.asServiceRole.entities.Order.update(order.id, updateData);

        console.log(`Push-updated order ${orderId}: ${newOrderStatus} (Steadfast: ${deliveryStatus})`);

        return Response.json({
            success:          true,
            order_id:         orderId,
            steadfast_status: deliveryStatus,
            new_order_status: newOrderStatus
        });

    } catch (error) {
        console.error('Webhook handler error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
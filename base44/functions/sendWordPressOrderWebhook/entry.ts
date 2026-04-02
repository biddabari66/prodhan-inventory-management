import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Sends order status updates to WordPress landing page webhook.
 * Triggered by entity automation on Order create/update/delete.
 * Does NOT interfere with any other order automations.
 */

const WORDPRESS_WEBHOOK_URL = 'https://primary-production-2437.up.railway.app/webhook/dbe94a65-f5b1-40ce-a6a1-5055c4240f22';

// Human-readable labels for all order statuses
const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  on_hold: 'On Hold',
  call_not_received: 'Call Not Received',
  follow_up: 'Follow Up',
  callback_requested: 'Callback Requested',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  partial: 'Partially Paid',
  paid: 'Paid',
  refunded: 'Refunded',
};

const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on Delivery',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
};

const ORDER_SOURCE_LABELS = {
  website: 'Website',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  walk_in: 'Walk In',
  mobile_app: 'Mobile App',
};

const COURIER_LABELS = {
  steadfast: 'Steadfast',
  pathao: 'Pathao',
  redx: 'RedX',
  sundarban: 'Sundarban Courier',
  sa_paribahan: 'SA Paribahan',
  self_delivery: 'Self Delivery',
};

function getLabel(map, key) {
  if (!key) return null;
  return map[key] || key;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    if (!event || !data) {
      return Response.json({ error: 'Invalid automation payload' }, { status: 400 });
    }

    console.log(`🔔 WordPress Webhook: Order ${event.type} — ${data.order_number || event.entity_id}`);

    // Determine if status actually changed
    const statusChanged = old_data ? (old_data.order_status !== data.order_status) : false;
    const paymentStatusChanged = old_data ? (old_data.payment_status !== data.payment_status) : false;

    // Build comprehensive webhook payload with human-readable labels
    const webhookPayload = {
      event_type: event.type, // "create", "update", "delete"
      timestamp: new Date().toISOString(),
      status_changed: statusChanged,
      payment_status_changed: paymentStatusChanged,
      order: {
        id: event.entity_id,
        order_number: data.order_number || null,
        // Raw status codes
        order_status: data.order_status || null,
        previous_status: old_data?.order_status || null,
        // Human-readable status labels
        order_status_label: getLabel(ORDER_STATUS_LABELS, data.order_status),
        previous_status_label: getLabel(ORDER_STATUS_LABELS, old_data?.order_status),
        payment_status: data.payment_status || null,
        previous_payment_status: old_data?.payment_status || null,
        payment_status_label: getLabel(PAYMENT_STATUS_LABELS, data.payment_status),
        payment_method: data.payment_method || null,
        payment_method_label: getLabel(PAYMENT_METHOD_LABELS, data.payment_method),
        order_source: data.order_source || null,
        order_source_label: getLabel(ORDER_SOURCE_LABELS, data.order_source),
        department: data.department || null,
        order_date: data.order_date || null,
        delivery_date: data.delivery_date || null,
        courier_service: data.courier_service || null,
        courier_service_label: getLabel(COURIER_LABELS, data.courier_service),
        tracking_number: data.tracking_number || null,
        courier_status: data.courier_status || null,
        courier_consignment_id: data.courier_consignment_id || null,
        courier_tracking_code: data.courier_tracking_code || null,
        courier_placed: data.courier_placed || false,
        courier_placed_date: data.courier_placed_date || null,
        discount_code: data.discount_code || null,
        created_date: data.created_date || null,
        updated_date: data.updated_date || null,
      },
      customer: {
        name: data.customer_name || null,
        phone: data.customer_phone || null,
        email: data.customer_email || null,
        id: data.customer_id || null,
      },
      shipping_address: data.shipping_address || null,
      items: (data.order_items || []).map(item => ({
        inventory_id: item.inventory_id || null,
        item_name: item.item_name || null,
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        discount: item.discount || 0,
        subtotal: item.subtotal || 0,
        weight: item.weight || null,
        selected_color: item.selected_color || null,
        is_combo: item.is_combo || false,
      })),
      totals: {
        subtotal: data.subtotal || 0,
        discount_amount: data.discount_amount || 0,
        coupon_discount: data.coupon_discount || 0,
        discount_code: data.discount_code || null,
        shipping_cost: data.shipping_cost || 0,
        total_amount: data.total_amount || 0,
        paid_amount: data.paid_amount || 0,
      },
      notes: data.notes || null,
      customer_notes: data.customer_notes || null,
      tags: data.tags || [],
    };

    // Send to WordPress webhook
    const response = await fetch(WORDPRESS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'prodhan-inventory',
        'X-Event-Type': event.type,
        'X-Order-Status': data.order_status || '',
        'X-Order-Status-Label': getLabel(ORDER_STATUS_LABELS, data.order_status) || '',
        'X-Previous-Status': old_data?.order_status || '',
        'X-Status-Changed': String(statusChanged),
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();
    console.log(`✅ WordPress webhook sent — Status: ${response.status}, Response: ${responseText.substring(0, 200)}`);

    return Response.json({
      success: true,
      webhook_status: response.status,
      order_number: data.order_number,
      event_type: event.type,
      order_status: data.order_status,
    });

  } catch (error) {
    console.error('❌ WordPress webhook error:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});
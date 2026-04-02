import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Sends order status updates to WordPress landing page webhook.
 * Triggered by entity automation on Order create/update/delete.
 * Does NOT interfere with any other order automations.
 */

const WORDPRESS_WEBHOOK_URL = 'https://primary-production-2437.up.railway.app/webhook/dbe94a65-f5b1-40ce-a6a1-5055c4240f22';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    if (!event || !data) {
      return Response.json({ error: 'Invalid automation payload' }, { status: 400 });
    }

    console.log(`🔔 WordPress Webhook: Order ${event.type} — ${data.order_number || event.entity_id}`);

    // Build comprehensive webhook payload
    const webhookPayload = {
      event_type: event.type, // "create", "update", "delete"
      timestamp: new Date().toISOString(),
      order: {
        id: event.entity_id,
        order_number: data.order_number || null,
        order_status: data.order_status || null,
        previous_status: old_data?.order_status || null,
        payment_status: data.payment_status || null,
        payment_method: data.payment_method || null,
        order_source: data.order_source || null,
        department: data.department || null,
        order_date: data.order_date || null,
        delivery_date: data.delivery_date || null,
        courier_service: data.courier_service || null,
        tracking_number: data.tracking_number || null,
        courier_status: data.courier_status || null,
        courier_consignment_id: data.courier_consignment_id || null,
      },
      customer: {
        name: data.customer_name || null,
        phone: data.customer_phone || null,
        email: data.customer_email || null,
      },
      shipping_address: data.shipping_address || null,
      items: (data.order_items || []).map(item => ({
        inventory_id: item.inventory_id || null,
        item_name: item.item_name || null,
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
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
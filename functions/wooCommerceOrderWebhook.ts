import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * WOOCOMMERCE ORDER WEBHOOK HANDLER - PRODUCTION VERSION
 * Automatically receives orders from WooCommerce landing pages and creates them in Sales
 * Matches SKU to inventory and auto-creates customers
 */

// Convert Bangladesh timezone date to ISO
const toBDTDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    console.log('🛒 WooCommerce Order Webhook Triggered');

    // Parse incoming order data
    const body = await req.json();
    console.log('📦 Received order data:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.customer_name || !body.phone || !body.products || body.products.length === 0) {
      console.error('❌ Missing required fields');
      return Response.json({ 
        success: false, 
        error: 'Missing required fields: customer_name, phone, or products' 
      }, { status: 400 });
    }

    // STEP 1: Find or create customer
    let customer = null;
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ phone: body.phone });
    
    if (existingCustomers && existingCustomers.length > 0) {
      customer = existingCustomers[0];
      console.log('✅ Found existing customer:', customer.customer_name);
    } else {
      // Create new customer
      customer = await base44.asServiceRole.entities.Customer.create({
        customer_name: body.customer_name,
        phone: body.phone,
        email: body.email || '',
        address: body.address || body.billing_address || '',
        city: body.city || 'Dhaka',
        customer_type: 'retail',
        source: 'woocommerce_landing'
      });
      console.log('✨ Created new customer:', customer.customer_name);
    }

    // STEP 2: Match SKUs to inventory and prepare order items
    const inventory = await base44.asServiceRole.entities.Inventory.list();
    const orderItems = [];
    let matchedCount = 0;
    let unmatchedProducts = [];

    for (const product of body.products) {
      // Find inventory by SKU (barcode field)
      const inventoryItem = inventory.find(item => 
        item.barcode === product.sku || 
        item.item_name?.toLowerCase() === product.name?.toLowerCase()
      );

      if (inventoryItem) {
        orderItems.push({
          inventory_id: inventoryItem.id,
          product_name: inventoryItem.item_name,
          quantity: product.quantity || 1,
          unit_price: product.unit_price || inventoryItem.selling_price || 0,
          total_price: product.total_price || (product.unit_price * product.quantity),
          weight: product.weight || inventoryItem.weight_kg || 0
        });
        matchedCount++;
        console.log(`✅ Matched SKU ${product.sku} → ${inventoryItem.item_name}`);
      } else {
        unmatchedProducts.push(product.name || product.sku);
        console.warn(`⚠️ SKU not found in inventory: ${product.sku} (${product.name})`);
      }
    }

    if (orderItems.length === 0) {
      console.error('❌ No products matched - cannot create order');
      return Response.json({ 
        success: false, 
        error: 'No products matched in inventory',
        unmatched_products: unmatchedProducts
      }, { status: 400 });
    }

    // STEP 3: Map WooCommerce status to our order status
    const statusMapping = {
      'pending': 'pending',
      'processing': 'confirmed',
      'on-hold': 'pending',
      'completed': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'failed': 'cancelled'
    };

    const orderStatus = statusMapping[body.delivery_status?.toLowerCase()] || 'pending';

    // STEP 4: Create the order
    const orderData = {
      customer_id: customer.id,
      customer_name: body.customer_name,
      customer_phone: body.phone,
      customer_email: body.email || '',
      delivery_address: body.address || body.billing_address || '',
      delivery_city: body.city || 'Dhaka',
      order_items: orderItems,
      subtotal: body.subtotal || 0,
      delivery_charge: body.delivery_charge || 0,
      discount: body.discount || 0,
      grand_total: body.grand_total || body.subtotal + body.delivery_charge - body.discount,
      payment_method: body.payment_method || 'cash_on_delivery',
      payment_status: body.payment_status || 'unpaid',
      order_status: orderStatus,
      order_date: body.order_date || new Date().toISOString(),
      order_source: 'woocommerce_landing',
      order_note: body.order_note || 'Order from WooCommerce landing page',
      wp_order_id: body.wp_order_id || `WP-${Date.now()}`,
      shipping_method: body.shipping_method || 'home_delivery',
      department: 'prodhan_com_e_commerce'
    };

    const createdOrder = await base44.asServiceRole.entities.Order.create(orderData);
    console.log('✅ Order created successfully:', createdOrder.id);

    // STEP 5: If order is confirmed, sync to Adprofit automatically
    let adprofitSyncResult = null;
    if (orderStatus === 'confirmed') {
      console.log('🔄 Order is confirmed - Auto-syncing to Adprofit...');
      try {
        const syncResponse = await base44.asServiceRole.functions.invoke('syncToAdprofit', { 
          order_id: createdOrder.id 
        });
        adprofitSyncResult = syncResponse.data;
        console.log('✅ Adprofit sync completed:', adprofitSyncResult);
      } catch (syncError) {
        console.error('⚠️ Adprofit sync failed:', syncError.message);
        adprofitSyncResult = { success: false, error: syncError.message };
      }
    }

    // STEP 6: Return success response
    return Response.json({ 
      success: true,
      order_id: createdOrder.id,
      order_number: createdOrder.order_number || createdOrder.id,
      customer_id: customer.id,
      matched_products: matchedCount,
      total_products: body.products.length,
      unmatched_products: unmatchedProducts.length > 0 ? unmatchedProducts : null,
      order_status: orderStatus,
      adprofit_synced: adprofitSyncResult?.success || false,
      adprofit_sync_details: adprofitSyncResult
    }, { status: 200 });

  } catch (error) {
    console.error('❌ WooCommerce webhook error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
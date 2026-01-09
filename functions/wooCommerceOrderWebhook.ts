import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PRODUCTION-READY WooCommerce Webhook
 * Creates orders in "pending" state for manual confirmation
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('🛒 WooCommerce Webhook Started');
    
    // Parse JSON body
    const body = await req.json();
    console.log('📦 Received:', JSON.stringify(body, null, 2));
    
    // Handle array wrapper
    const data = Array.isArray(body) ? body[0] : body;
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid payload structure');
    }
    
    // Extract and clean customer data with flexible field mapping
    const customerName = String(data.customer_name || data.name || 'Unknown Customer').trim();
    
    // Phone: accept multiple formats
    let phone = String(
      data.phone || 
      data.customer_phone || 
      data.billing_phone || 
      ''
    ).replace(/[\s\-\+]/g, '');
    
    // Validate phone
    if (!phone || phone.length < 10) {
      throw new Error(`Invalid phone number: ${data.phone}`);
    }
    
    // Normalize BD phone format
    if (!phone.startsWith('88') && !phone.startsWith('0')) {
      phone = '0' + phone;
    }
    
    // Email: flexible field names
    const email = String(
      data.email || 
      data.customer_email || 
      data.billing_email || 
      ''
    ).trim();
    
    // Address: prioritize shipping, then billing, then generic
    const shippingAddress = String(
      data.shipping_address || 
      data.address || 
      data.billing_address || 
      ''
    ).trim();
    
    // City
    const city = String(
      data.city || 
      data.delivery_city || 
      data.billing_city || 
      'Dhaka'
    ).trim();
    
    console.log('✅ Customer:', { customerName, phone, city, shippingAddress });
    
    // Parse products (flexible field names)
    let products = data.products || data.items || data.order_items || [];
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('No products in order');
    }
    
    console.log('📦 Products:', products.length);
    
    // Find or create customer
    let customer;
    const existing = await base44.asServiceRole.entities.Customer.filter({ 
      customer_phone: phone 
    });
    
    if (existing?.length > 0) {
      customer = existing[0];
      console.log('✅ Found customer:', customer.customer_name);
    } else {
      customer = await base44.asServiceRole.entities.Customer.create({
        customer_name: customerName,
        customer_phone: phone,
        customer_email: email,
        customer_address: address,
        customer_city: city,
        customer_type: 'retail',
        source: 'woocommerce',
        department: 'prodhan_com_e_commerce'
      });
      console.log('✨ Created customer:', customer.customer_name);
    }
    
    // Load inventory
    const inventory = await base44.asServiceRole.entities.Inventory.list();
    console.log('📊 Inventory items:', inventory.length);
    
    // Match products to inventory
    const orderItems = [];
    const notFound = [];
    
    for (const prod of products) {
      const sku = String(prod.sku || '').trim();
      const name = String(prod.name || '').trim();
      const qty = parseInt(prod.quantity) || 1;
      const price = parseFloat(prod.unit_price) || 0;
      
      // Find in inventory by SKU (barcode) or name
      const invItem = inventory.find(i => 
        (sku && i.barcode === sku) || 
        (name && i.item_name?.toLowerCase().includes(name.toLowerCase()))
      );
      
      if (invItem) {
        orderItems.push({
          inventory_id: invItem.id,
          item_name: invItem.item_name,
          quantity: qty,
          unit_price: price || invItem.selling_price,
          subtotal: qty * (price || invItem.selling_price),
          weight: parseFloat(prod.weight) || invItem.weight_kg || 0
        });
        console.log(`✅ Matched: ${sku} → ${invItem.item_name}`);
      } else {
        notFound.push({ sku, name });
        console.warn(`⚠️ Not found: ${sku} - ${name}`);
      }
    }
    
    if (orderItems.length === 0) {
      throw new Error(`No products matched. Not found: ${JSON.stringify(notFound)}`);
    }
    
    // Calculate totals
    const subtotal = parseFloat(data.subtotal) || 
      orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryCharge = parseFloat(data.delivery_charge) || 0;
    const discount = parseFloat(data.discount) || 0;
    const total = parseFloat(data.grand_total) || (subtotal + deliveryCharge - discount);
    
    console.log('💰 Total:', total);
    
    // Generate order number
    const timestamp = Date.now();
    const orderNumber = `WC-${timestamp}`;
    
    // Create order with ALL required fields
    const newOrder = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      customer_id: customer.id,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: email,
      shipping_address: address || 'No address provided',
      delivery_city: city,
      order_items: orderItems,
      subtotal: subtotal,
      delivery_charge: deliveryCharge,
      discount: discount,
      total_amount: total,
      payment_method: data.payment_method || 'cod',
      payment_status: 'unpaid',
      order_status: 'pending',
      order_date: new Date().toISOString(),
      order_source: 'woocommerce',
      order_note: String(data.order_note || 'WooCommerce order').trim(),
      wp_order_id: String(data.wp_order_id || `WP-${timestamp}`).trim(),
      shipping_method: String(data.shipping_method || 'home_delivery').trim(),
      department: 'prodhan_com_e_commerce'
    });
    
    console.log('✅ Order created:', newOrder.order_number);
    
    return Response.json({
      success: true,
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      customer: customerName,
      phone: phone,
      items: orderItems.length,
      total: total,
      status: 'pending',
      not_matched: notFound.length > 0 ? notFound : undefined
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    
    return Response.json({
      success: false,
      error: error.message,
      hint: 'Check payload format and required fields'
    }, { status: 500 });
  }
});
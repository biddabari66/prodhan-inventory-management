import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * WooCommerce Order Webhook
 * Creates orders in "pending" state for manual confirmation
 * Auto-sync to Adprofit happens when user confirms in Sales page
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('🛒 WooCommerce Webhook - Incoming request');
    
    // Get request body
    const body = await req.json();
    console.log('📦 JSON Body:', JSON.stringify(body, null, 2));
    
    // Handle array or object
    const data = Array.isArray(body) ? body[0] : body;
    
    // Log what we actually received
    console.log('📋 Order data:', JSON.stringify(data, null, 2));
    console.log('🔑 Data keys:', Object.keys(data));
    
    // Check if data has the expected structure
    const hasCustomerName = !!(data.customer_name || data.billing_first_name || data.name);
    const hasPhone = !!(data.phone || data.billing_phone || data.customer_phone);
    const hasProducts = !!(data.products || data.line_items || data.items);
    
    console.log('✅ Field check:', { 
      hasCustomerName, 
      hasPhone, 
      hasProducts,
      customer_name_field: data.customer_name,
      phone_field: data.phone,
      products_field: data.products 
    });
    
    // Validate required data
    if (!hasCustomerName || !hasPhone || !hasProducts) {
      return Response.json({
        success: false,
        error: 'Missing required order data',
        received_keys: Object.keys(data),
        required: {
          customer_name: data.customer_name || data.billing_first_name || data.name || 'MISSING',
          phone: data.phone || data.billing_phone || data.customer_phone || 'MISSING',
          products: data.products || data.line_items || data.items || 'MISSING'
        },
        example_payload: {
          customer_name: "Shaleh Ahmed Khan",
          phone: "01817180019",
          email: "customer@example.com",
          address: "House no 181 rd no 9 /A Dhanmondi Dhaka",
          city: "Dhaka",
          products: [
            {
              sku: "TB07",
              name: "Prodhan Rosolla Tea",
              quantity: 1,
              unit_price: 389,
              total_price: 389
            }
          ],
          subtotal: 389,
          delivery_charge: 60,
          discount: 0,
          grand_total: 449
        }
      }, { status: 400 });
    }
    
    // Extract customer info with fallbacks
    const customerName = data.customer_name || data.billing_first_name || data.name || 'Unknown Customer';
    const phone = data.phone || data.billing_phone || data.customer_phone;
    const email = data.email || data.billing_email || '';
    const address = data.address || data.billing_address || data.shipping_address || '';
    const city = data.city || data.billing_city || 'Dhaka';
    
    console.log('👤 Customer:', { customerName, phone, email, city });
    
    // Parse products with fallbacks
    let products = data.products || data.line_items || data.items || [];
    
    // Convert to array if needed
    if (!Array.isArray(products)) {
      products = [products];
    }
    
    // Parse if JSON string
    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch (e) {
        console.error('Failed to parse products JSON');
      }
    }
    
    console.log('📦 Products count:', products.length);
    
    if (!Array.isArray(products) || products.length === 0) {
      return Response.json({
        success: false,
        error: 'No valid products in order',
        products_received: products
      }, { status: 400 });
    }
    
    // Find or create customer
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ phone });
    
    let customer;
    if (existingCustomers?.length > 0) {
      customer = existingCustomers[0];
      console.log('✅ Found customer:', customer.customer_name);
    } else {
      customer = await base44.asServiceRole.entities.Customer.create({
        customer_name: customerName,
        phone: phone,
        email: email,
        address: address,
        city: city,
        customer_type: 'retail',
        source: 'woocommerce',
        department: 'prodhan_com_e_commerce'
      });
      console.log('✨ Created customer:', customer.customer_name);
    }
    
    // Load inventory
    const inventory = await base44.asServiceRole.entities.Inventory.list();
    console.log('📊 Inventory loaded:', inventory.length, 'items');
    
    // Match products to inventory
    const orderItems = [];
    const unmatched = [];
    
    for (const prod of products) {
      const sku = prod.sku || prod.product_id || prod.id;
      const name = prod.name || prod.product_name || prod.title;
      const quantity = parseInt(prod.quantity) || 1;
      const price = parseFloat(prod.unit_price || prod.price || 0);
      
      console.log('🔍 Matching:', { sku, name, quantity, price });
      
      // Try to find in inventory
      const invItem = inventory.find(i => 
        (sku && i.barcode === String(sku)) || 
        (name && i.item_name?.toLowerCase().includes(name.toLowerCase()))
      );
      
      if (invItem) {
        orderItems.push({
          inventory_id: invItem.id,
          item_name: invItem.item_name,
          quantity: quantity,
          unit_price: price || invItem.selling_price,
          subtotal: quantity * (price || invItem.selling_price),
          weight: parseFloat(prod.weight) || invItem.weight_kg || 0
        });
        console.log(`✅ Matched: ${sku} → ${invItem.item_name}`);
      } else {
        unmatched.push({ sku, name });
        console.warn(`⚠️ Not found in inventory: ${sku} - ${name}`);
      }
    }
    
    if (orderItems.length === 0) {
      return Response.json({
        success: false,
        error: 'No products matched in inventory',
        unmatched,
        inventory_sample: inventory.slice(0, 5).map(i => ({ 
          id: i.id, 
          name: i.item_name, 
          sku: i.barcode 
        }))
      }, { status: 400 });
    }
    
    // Calculate totals
    const subtotal = parseFloat(data.subtotal) || orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryCharge = parseFloat(data.delivery_charge) || 0;
    const discount = parseFloat(data.discount) || 0;
    const grandTotal = parseFloat(data.grand_total) || (subtotal + deliveryCharge - discount);
    
    console.log('💰 Totals:', { subtotal, deliveryCharge, discount, grandTotal });
    
    // Create order in PENDING state (no Adprofit sync)
    const newOrder = await base44.asServiceRole.entities.Order.create({
      customer_id: customer.id,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: email,
      delivery_address: address,
      delivery_city: city,
      order_items: orderItems,
      subtotal: subtotal,
      delivery_charge: deliveryCharge,
      discount: discount,
      total_amount: grandTotal,
      payment_method: data.payment_method || 'cod',
      payment_status: 'unpaid',
      order_status: 'pending',  // ALWAYS pending from webhook
      order_date: new Date().toISOString(),
      order_source: 'woocommerce',
      order_note: data.order_note || 'Order from WooCommerce',
      wp_order_id: data.wp_order_id || data.order_id || `WC-${Date.now()}`,
      shipping_method: data.shipping_method || 'home_delivery',
      department: 'prodhan_com_e_commerce'
    });
    
    console.log('✅ Order created as PENDING:', newOrder.id);
    console.log('📌 User must confirm in Sales page to sync to Adprofit');
    
    return Response.json({
      success: true,
      message: 'Order created successfully as PENDING',
      order_id: newOrder.id,
      order_number: newOrder.order_number || newOrder.id,
      customer: customerName,
      phone: phone,
      items_count: orderItems.length,
      matched_items: orderItems.map(i => i.item_name),
      unmatched_items: unmatched,
      total_amount: grandTotal,
      status: 'pending',
      note: 'Order awaiting confirmation in Sales page. Adprofit sync will happen on confirmation.'
    });
    
  } catch (error) {
    console.error('❌ Webhook Error:', error.message);
    console.error('Stack:', error.stack);
    
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});
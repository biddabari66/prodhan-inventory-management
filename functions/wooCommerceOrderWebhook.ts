import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * WOOCOMMERCE WEBHOOK - FLEXIBLE INPUT HANDLER
 * Accepts orders from WooCommerce/WordPress in any format
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('🛒 WooCommerce Webhook - Incoming request');
    
    // Try multiple ways to get the data
    let orderData = null;
    let dataSource = '';
    
    // Method 1: Try JSON body
    try {
      const body = await req.json();
      console.log('📦 JSON Body:', JSON.stringify(body, null, 2));
      
      if (body && typeof body === 'object' && Object.keys(body).length > 0) {
        // Check if it's wrapped in an array
        orderData = Array.isArray(body) ? body[0] : body;
        dataSource = 'JSON body';
      }
    } catch (e) {
      console.log('⚠️ No valid JSON body:', e.message);
    }
    
    // Method 2: Try URL parameters if JSON failed
    if (!orderData) {
      const url = new URL(req.url);
      const params = Object.fromEntries(url.searchParams);
      console.log('🔗 URL Params:', JSON.stringify(params, null, 2));
      
      if (Object.keys(params).length > 0) {
        orderData = params;
        dataSource = 'URL parameters';
      }
    }
    
    // Method 3: Try form data
    if (!orderData) {
      try {
        const formData = await req.formData();
        const formObj = {};
        for (const [key, value] of formData.entries()) {
          formObj[key] = value;
        }
        console.log('📝 Form Data:', JSON.stringify(formObj, null, 2));
        
        if (Object.keys(formObj).length > 0) {
          orderData = formObj;
          dataSource = 'Form data';
        }
      } catch (e) {
        console.log('⚠️ No form data');
      }
    }
    
    if (!orderData) {
      return Response.json({
        success: false,
        error: 'No data received. Send JSON body with: customer_name, phone, products[]',
        example: {
          customer_name: "Shaleh Ahmed Khan",
          phone: "01817180019",
          products: [{sku: "TB07", name: "Prodhan Rosolla Tea", quantity: 1, unit_price: 389}]
        }
      }, { status: 400 });
    }
    
    console.log(`✅ Data source: ${dataSource}`);
    console.log('📋 Order data:', JSON.stringify(orderData));
    
    // Parse products if it's a JSON string
    if (orderData.products && typeof orderData.products === 'string') {
      try {
        orderData.products = JSON.parse(orderData.products);
      } catch (e) {
        console.error('Failed to parse products JSON');
      }
    }
    
    // Validate
    if (!orderData.customer_name || !orderData.phone || !Array.isArray(orderData.products) || orderData.products.length === 0) {
      console.error('❌ Invalid data:', {
        has_customer_name: !!orderData.customer_name,
        has_phone: !!orderData.phone,
        has_products: Array.isArray(orderData.products),
        products_count: orderData.products?.length
      });
      
      return Response.json({
        success: false,
        error: 'Missing required fields',
        received: Object.keys(orderData),
        required: ['customer_name', 'phone', 'products'],
        example: {
          customer_name: "Shaleh Ahmed Khan",
          phone: "01817180019",
          address: "House no 181 rd no 9 /A Dhanmondi Dhaka",
          products: [
            {sku: "TB07", name: "Prodhan Rosolla Tea", quantity: 1, unit_price: 389}
          ]
        }
      }, { status: 400 });
    }
    
    console.log('✅ Validation passed');
    
    // Find or create customer
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ 
      phone: orderData.phone 
    });
    
    let customer;
    if (existingCustomers?.length > 0) {
      customer = existingCustomers[0];
      console.log('✅ Found customer:', customer.customer_name);
    } else {
      customer = await base44.asServiceRole.entities.Customer.create({
        customer_name: orderData.customer_name,
        phone: orderData.phone,
        email: orderData.email || '',
        address: orderData.address || orderData.billing_address || '',
        city: orderData.city || 'Dhaka',
        customer_type: 'retail',
        source: 'woocommerce'
      });
      console.log('✨ New customer:', customer.customer_name);
    }
    
    // Match products
    const inventory = await base44.asServiceRole.entities.Inventory.list();
    const orderItems = [];
    const unmatched = [];
    
    for (const prod of orderData.products) {
      const invItem = inventory.find(i => 
        i.barcode === prod.sku || 
        i.item_name?.toLowerCase() === prod.name?.toLowerCase()
      );
      
      if (invItem) {
        orderItems.push({
          inventory_id: invItem.id,
          item_name: invItem.item_name,
          quantity: parseInt(prod.quantity) || 1,
          unit_price: parseFloat(prod.unit_price) || invItem.selling_price || 0,
          subtotal: parseFloat(prod.total_price) || (prod.quantity * prod.unit_price),
          weight: parseFloat(prod.weight) || invItem.weight_kg || 0
        });
        console.log(`✅ SKU ${prod.sku} → ${invItem.item_name}`);
      } else {
        unmatched.push(prod.name || prod.sku);
        console.warn(`⚠️ Not found: ${prod.sku}`);
      }
    }
    
    if (orderItems.length === 0) {
      return Response.json({
        success: false,
        error: 'No products matched in inventory',
        unmatched
      }, { status: 400 });
    }
    
    // Map status
    const statusMap = {
      'pending': 'pending',
      'processing': 'confirmed',
      'completed': 'delivered',
      'cancelled': 'cancelled'
    };
    const orderStatus = statusMap[orderData.delivery_status] || 'pending';
    
    // Create order
    const newOrder = await base44.asServiceRole.entities.Order.create({
      customer_id: customer.id,
      customer_name: orderData.customer_name,
      customer_phone: orderData.phone,
      customer_email: orderData.email || '',
      delivery_address: orderData.address || orderData.billing_address || '',
      delivery_city: orderData.city || 'Dhaka',
      order_items: orderItems,
      subtotal: parseFloat(orderData.subtotal) || 0,
      delivery_charge: parseFloat(orderData.delivery_charge) || 0,
      discount: parseFloat(orderData.discount) || 0,
      total_amount: parseFloat(orderData.grand_total) || orderData.subtotal,
      payment_method: orderData.payment_method || 'cod',
      payment_status: orderData.payment_status || 'pending',
      order_status: orderStatus,
      order_date: orderData.order_date || new Date().toISOString(),
      order_source: 'woocommerce',
      order_note: orderData.order_note || '',
      wp_order_id: orderData.wp_order_id || `WP-${Date.now()}`,
      shipping_method: orderData.shipping_method || 'home_delivery',
      department: 'prodhan_com_e_commerce'
    });
    
    console.log('✅ Order created:', newOrder.id);
    
    // Sync to Adprofit if confirmed
    let syncResult = null;
    if (orderStatus === 'confirmed') {
      try {
        const sync = await base44.asServiceRole.functions.invoke('syncToAdprofit', { 
          order_id: newOrder.id 
        });
        syncResult = sync.data;
        console.log('✅ Adprofit synced');
      } catch (err) {
        console.error('⚠️ Adprofit sync failed:', err.message);
      }
    }
    
    return Response.json({
      success: true,
      message: 'Order created successfully',
      order_id: newOrder.id,
      order_number: newOrder.order_number || newOrder.id,
      customer: customer.customer_name,
      items: orderItems.length,
      total: newOrder.total_amount,
      status: orderStatus,
      data_source: dataSource
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
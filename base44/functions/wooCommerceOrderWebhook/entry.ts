import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('🛒 WooCommerce Webhook Started');
    
    const body = await req.json();
    console.log('📦 Raw payload:', JSON.stringify(body, null, 2));
    
    const data = Array.isArray(body) ? body[0] : body;
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid payload structure');
    }
    
    const customerName = String(
      data.customer_name || data.name || data.billing_name || data.shipping_name || 'Unknown Customer'
    ).trim();
    
    let phone = String(
      data.phone || data.customer_phone || data.billing_phone || data.shipping_phone || data.contact_number || ''
    ).replace(/[\s\-\+]/g, '');
    
    if (!phone || phone.length < 10) {
      throw new Error(`Invalid phone: "${data.phone || 'missing'}"`);
    }
    if (!phone.startsWith('88') && !phone.startsWith('0')) {
      phone = '0' + phone;
    }
    
    const email = String(
      data.email || data.customer_email || data.billing_email || data.contact_email || ''
    ).trim();
    
    const addressLine = String(
      data.address || data.billing_address || data.shipping_address || data.delivery_address || data.address_line || ''
    ).trim();
    
    const city = String(
      data.city || data.delivery_city || data.billing_city || data.shipping_city || 'Dhaka'
    ).trim();
    
    const district = String(data.district || data.region || data.state || '').trim();
    const postalCode = String(data.postal_code || data.zip || data.zip_code || '').trim();
    
    console.log('✅ Customer extracted:', { customerName, phone, email, addressLine, city, district });
    
    let products = data.products || data.items || data.order_items || data.line_items || [];
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('No products in order');
    }
    
    console.log('📦 Products count:', products.length);
    
    // ============= FIND OR CREATE CUSTOMER =============
    let customer;

    // ✅ FIX 1: Safely parse Customer.filter() response (may return string or object)
    const existingRaw = await base44.asServiceRole.entities.Customer.filter({ 
      customer_phone: phone 
    });
    let existing = [];
    if (Array.isArray(existingRaw)) {
      existing = existingRaw;
    } else if (typeof existingRaw === 'string') {
      try { const p = JSON.parse(existingRaw); existing = Array.isArray(p) ? p : p?.items || p?.data || p?.results || []; } catch { existing = []; }
    } else if (existingRaw && typeof existingRaw === 'object') {
      existing = existingRaw?.items || existingRaw?.data || existingRaw?.results || [];
    }
    
    if (existing.length > 0) {
      customer = existing[0];
      console.log('✅ Found customer:', customer.customer_name);
    } else {
      customer = await base44.asServiceRole.entities.Customer.create({
        customer_name: customerName,
        customer_phone: phone,
        customer_email: email,
        customer_address: addressLine,
        customer_city: city,
        customer_type: 'retail',
        source: 'woocommerce',
        department: 'prodhan_com_e_commerce'
      });
      console.log('✨ Created customer:', customer.customer_name);
    }
    
    // ============= LOAD INVENTORY =============
    // ✅ FIX 2: .list() returns a STRING — parse it, then extract the array
    const inventoryRaw = await base44.asServiceRole.entities.Inventory.list();
    console.log('📊 Inventory raw type:', typeof inventoryRaw, '| Is array:', Array.isArray(inventoryRaw));

    let inventoryParsed = inventoryRaw;
    if (typeof inventoryRaw === 'string') {
      try {
        inventoryParsed = JSON.parse(inventoryRaw);
        console.log('📊 Inventory parsed from string successfully');
      } catch(e) {
        console.error('❌ Failed to parse inventory string:', e.message);
        inventoryParsed = [];
      }
    }

    const inventory = Array.isArray(inventoryParsed)
      ? inventoryParsed
      : inventoryParsed?.items   ||
        inventoryParsed?.data    ||
        inventoryParsed?.results ||
        inventoryParsed?.records ||
        Object.values(inventoryParsed || {}).find(v => Array.isArray(v)) ||
        [];

    console.log('📊 Inventory items loaded:', inventory.length);
    if (inventory.length > 0) {
      console.log('🔍 Sample inventory keys:', Object.keys(inventory[0]));
      console.log('🔍 Sample inventory item:', JSON.stringify(inventory[0]));
    }

    // ============= MATCH PRODUCTS TO INVENTORY =============
    const orderItems = [];
    const notFound = [];
    
    for (const prod of products) {
      const sku = String(prod.sku || prod.product_sku || prod.barcode || prod.item_code || '').trim();
      const name = String(prod.name || prod.product_name || prod.item_name || prod.title || '').trim();
      const qty = parseInt(prod.quantity || prod.qty || prod.amount || 1);
      const price = parseFloat(prod.unit_price || prod.price || prod.item_price || prod.amount || 0);
      const totalPrice = parseFloat(prod.total_price || prod.total || prod.subtotal || (qty * price));
      const weight = parseFloat(prod.weight || prod.item_weight || 0);

      console.log(`🔎 Matching — SKU: "${sku}" | Name: "${name}"`);

      // ✅ FIX 3: Check i.sku AND i.barcode AND i.item_code, String() both sides to avoid type mismatch
      const invItem = inventory.find(i => {
        const invBarcode  = String(i.barcode   || '').trim();
        const invSku      = String(i.sku       || '').trim();
        const invItemCode = String(i.item_code || i.product_code || '').trim();
        const searchSku   = String(sku  || '').trim();
        const searchName  = name.toLowerCase();

        const skuMatch = searchSku && (
          invBarcode  === searchSku ||
          invSku      === searchSku ||
          invItemCode === searchSku
        );
        const nameMatch = searchName && (
          i.item_name?.toLowerCase().includes(searchName) ||
          i.name?.toLowerCase().includes(searchName) ||
          i.product_name?.toLowerCase().includes(searchName)
        );

        return skuMatch || nameMatch;
      });
      
      if (invItem) {
        orderItems.push({
          inventory_id: invItem.id,
          item_name: invItem.item_name,
          quantity: qty,
          unit_price: price || invItem.selling_price,
          subtotal: totalPrice || (qty * (price || invItem.selling_price)),
          weight: weight || invItem.weight_kg || 0
        });
        console.log(`✅ Matched: "${sku || name}" → ${invItem.item_name}`);
      } else {
        notFound.push({ sku, name });
        console.warn(`⚠️ Not found: SKU="${sku}" Name="${name}"`);
      }
    }
    
    if (orderItems.length === 0) {
      throw new Error(`No products matched in inventory. Missing: ${JSON.stringify(notFound)}`);
    }
    
    const subtotal = parseFloat(
      data.subtotal || data.sub_total || data.items_total ||
      orderItems.reduce((sum, item) => sum + item.subtotal, 0)
    );
    const deliveryCharge = parseFloat(data.delivery_charge || data.shipping_cost || data.shipping_charge || data.delivery_cost || 0);
    const discount = parseFloat(data.discount || data.discount_amount || data.coupon_discount || 0);
    const total = parseFloat(data.grand_total || data.total || data.total_amount || data.order_total || (subtotal + deliveryCharge - discount));
    
    console.log('💰 Order totals:', { subtotal, deliveryCharge, discount, total });
    
    const timestamp = Date.now();
    const orderNumber = `WC-${timestamp}`;
    const paymentMethod = String(data.payment_method || data.payment_type || 'cod').toLowerCase();
    const paymentStatus = String(data.payment_status || 'unpaid').toLowerCase();
    const orderNote = String(data.order_note || data.note || data.customer_note || data.notes || 'WooCommerce order').trim();
    const wpOrderId = String(data.wp_order_id || data.order_id || data.wc_order_id || `WP-${timestamp}`).trim();
    const shippingMethod = String(data.shipping_method || data.delivery_method || 'home_delivery').trim();
    const deliveryStatus = String(data.delivery_status || data.order_status || 'pending').trim();
    
    const newOrder = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      customer_id: customer.id,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: email,
      shipping_address: {
        address_line: addressLine || 'No address provided',
        city: city,
        district: district || '',
        postal_code: postalCode || '',
        phone: phone
      },
      order_items: orderItems,
      subtotal: subtotal,
      shipping_cost: deliveryCharge,
      discount_amount: discount,
      total_amount: total,
      payment_method: paymentMethod,
      payment_status: paymentStatus === 'paid' ? 'paid' : 'pending',
      order_status: 'pending',
      order_date: new Date().toISOString(),
      order_source: 'website',
      department: 'prodhan_com_e_commerce',
      notes: orderNote,
      customer_notes: orderNote,
      tags: ['woocommerce', wpOrderId, shippingMethod]
    });
    
    console.log('✅ Order created:', newOrder.order_number);
    
    return Response.json({
      success: true,
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      customer: customerName,
      phone: phone,
      items_matched: orderItems.length,
      items_not_matched: notFound.length,
      total: total,
      status: 'pending',
      message: 'Order created successfully',
      not_matched: notFound.length > 0 ? notFound : undefined
    });
    
  } catch (error) {
    console.error('❌ Webhook Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({
      success: false,
      error: error.message,
      hint: 'Check webhook payload structure and inventory SKU matching'
    }, { status: 500 });
  }
});
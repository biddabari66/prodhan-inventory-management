import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * WOOCOMMERCE ORDER WEBHOOK - PRODUCTION
 * Receives orders from WooCommerce/WordPress landing pages
 * Auto-creates customers, matches SKUs, and syncs to Adprofit
 */

const toBDTDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    console.log('🛒 WooCommerce Webhook Started');

    // Parse payload - handle both single object and array
    const rawData = await req.json();
    const orderData = Array.isArray(rawData) ? rawData[0] : rawData;
    
    console.log('📦 Order ID:', orderData?.wp_order_id);
    console.log('👤 Customer:', orderData?.customer_name);
    console.log('📱 Phone:', orderData?.phone);
    console.log('🛍️ Products count:', orderData?.products?.length);

    // Validate
    if (!orderData?.customer_name || !orderData?.phone || !orderData?.products?.length) {
      console.error('❌ Missing fields:', {
        customer_name: orderData?.customer_name,
        phone: orderData?.phone,
        products_count: orderData?.products?.length
      });
      return Response.json({ 
        success: false, 
        error: 'Missing: customer_name, phone, or products'
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
      console.log('✅ Existing customer:', customer.customer_name);
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
      console.log('✨ New customer created:', customer.customer_name);
    }

    // Match products by SKU
    const inventory = await base44.asServiceRole.entities.Inventory.list();
    const orderItems = [];
    const unmatched = [];

    for (const product of orderData.products) {
      const invItem = inventory.find(i => 
        i.barcode === product.sku || 
        i.item_name?.toLowerCase() === product.name?.toLowerCase()
      );

      if (invItem) {
        orderItems.push({
          inventory_id: invItem.id,
          item_name: invItem.item_name,
          quantity: product.quantity || 1,
          unit_price: product.unit_price || invItem.selling_price || 0,
          subtotal: product.total_price || (product.quantity * product.unit_price),
          weight: product.weight || invItem.weight_kg || 0
        });
        console.log(`✅ SKU ${product.sku} → ${invItem.item_name}`);
      } else {
        unmatched.push(product.name);
        console.warn(`⚠️ SKU not found: ${product.sku} (${product.name})`);
      }
    }

    if (orderItems.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'No products matched',
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
      subtotal: orderData.subtotal || 0,
      delivery_charge: orderData.delivery_charge || 0,
      discount: orderData.discount || 0,
      total_amount: orderData.grand_total || orderData.subtotal,
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

    // Auto-sync to Adprofit if confirmed
    let syncResult = null;
    if (orderStatus === 'confirmed') {
      console.log('🔄 Auto-syncing to Adprofit...');
      try {
        const sync = await base44.asServiceRole.functions.invoke('syncToAdprofit', { 
          order_id: newOrder.id 
        });
        syncResult = sync.data;
        console.log('✅ Adprofit synced:', syncResult?.synced_items || 0, 'items');
      } catch (err) {
        console.error('⚠️ Adprofit sync failed:', err.message);
        syncResult = { success: false, error: err.message };
      }
    }

    return Response.json({ 
      success: true,
      order_id: newOrder.id,
      order_number: newOrder.order_number || newOrder.id,
      customer_id: customer.id,
      matched: orderItems.length,
      total: orderData.products.length,
      unmatched: unmatched.length > 0 ? unmatched : null,
      status: orderStatus,
      adprofit_synced: syncResult?.success || false
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
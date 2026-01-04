import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PRODHAN.COM ORDER WEBHOOK
 * Receives orders from Prodhan.com and automatically creates them in BEE ERP
 * 
 * Endpoint: https://your-app.base44.com/api/prodhanComOrderWebhook
 * Method: POST
 * 
 * Expected payload format:
 * {
 *   "order_number": "PRD-123456",
 *   "customer": {
 *     "name": "John Doe",
 *     "phone": "01712345678",
 *     "email": "john@example.com" (optional)
 *   },
 *   "items": [
 *     {
 *       "product_id": "item_barcode_or_sku",
 *       "product_name": "Product Name",
 *       "quantity": 2,
 *       "unit_price": 500,
 *       "discount": 0
 *     }
 *   ],
 *   "shipping_address": {
 *     "address_line": "123 Main St",
 *     "city": "Dhaka",
 *     "district": "Dhaka",
 *     "postal_code": "1205",
 *     "phone": "01712345678"
 *   },
 *   "payment_method": "cod",
 *   "payment_status": "pending",
 *   "discount_amount": 0,
 *   "coupon_discount": 0,
 *   "discount_code": "",
 *   "shipping_cost": 60,
 *   "total_amount": 1060,
 *   "customer_notes": "",
 *   "webhook_secret": "your_secret_key"
 * }
 */

Deno.serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return Response.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
      );
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // No authentication required - open endpoint for Prodhan.com integration

    console.log('📦 Received order from Prodhan.com:', payload.order_number);

    // Validate required fields
    if (!payload.customer?.name || !payload.customer?.phone) {
      return Response.json(
        { success: false, error: 'Missing required customer information' },
        { status: 400 }
      );
    }

    if (!payload.items || payload.items.length === 0) {
      return Response.json(
        { success: false, error: 'Order must have at least one item' },
        { status: 400 }
      );
    }

    // Find or create customer
    const customers = await base44.asServiceRole.entities.Customer.list();
    let customer = customers.find(c => c.customer_phone === payload.customer.phone);

    if (customer) {
      // Update existing customer
      await base44.asServiceRole.entities.Customer.update(customer.id, {
        total_orders: (customer.total_orders || 0) + 1,
        total_spent: (customer.total_spent || 0) + payload.total_amount
      });
      console.log('✅ Updated existing customer:', customer.customer_name);
    } else {
      // Create new customer
      customer = await base44.asServiceRole.entities.Customer.create({
        customer_name: payload.customer.name,
        customer_phone: payload.customer.phone,
        customer_email: payload.customer.email || '',
        customer_type: 'retail',
        shipping_addresses: [payload.shipping_address],
        total_orders: 1,
        total_spent: payload.total_amount,
        customer_since: new Date().toISOString()
      });
      console.log('✅ Created new customer:', customer.customer_name);
    }

    // Fetch inventory to map products
    const inventory = await base44.asServiceRole.entities.Inventory.list();
    const orderItems = [];
    const inventoryUpdates = [];
    const movements = [];

    for (const item of payload.items) {
      // Find inventory item by barcode, SKU, or name
      let inventoryItem = inventory.find(inv => 
        inv.barcode === item.product_id || 
        inv.item_name === item.product_name ||
        inv.english_item_name === item.product_name
      );

      if (!inventoryItem) {
        console.warn(`⚠️ Product not found in inventory: ${item.product_name}`);
        return Response.json({
          success: false,
          error: `Product not found in inventory: ${item.product_name}. Please add it first.`
        }, { status: 400 });
      }

      // Check stock availability
      if (inventoryItem.current_stock < item.quantity) {
        return Response.json({
          success: false,
          error: `Insufficient stock for ${inventoryItem.item_name}. Available: ${inventoryItem.current_stock}, Required: ${item.quantity}`
        }, { status: 400 });
      }

      // Prepare order item
      const subtotal = (item.unit_price * item.quantity) - (item.discount || 0);
      orderItems.push({
        inventory_id: inventoryItem.id,
        item_name: inventoryItem.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        subtotal: subtotal
      });

      // Prepare inventory update
      const newStock = inventoryItem.current_stock - item.quantity;
      inventoryUpdates.push({
        id: inventoryItem.id,
        newStock: newStock
      });

      // Prepare movement record
      movements.push({
        inventory_item_id: inventoryItem.id,
        quantity: -item.quantity,
        newStock: newStock,
        unit_price: item.unit_price
      });
    }

    // Generate order number if not provided
    const orderNumber = payload.order_number || `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create order in BEE ERP
    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      customer_id: customer.id,
      customer_name: payload.customer.name,
      customer_phone: payload.customer.phone,
      customer_email: payload.customer.email || '',
      order_date: new Date().toISOString(),
      order_items: orderItems,
      shipping_address: payload.shipping_address,
      payment_method: payload.payment_method || 'cod',
      payment_status: payload.payment_status || 'pending',
      department: 'prodhan_com_e_commerce',
      discount_amount: payload.discount_amount || 0,
      coupon_discount: payload.coupon_discount || 0,
      discount_code: payload.discount_code || '',
      shipping_cost: payload.shipping_cost || 60,
      subtotal: orderItems.reduce((sum, item) => sum + item.subtotal, 0),
      total_amount: payload.total_amount,
      order_status: 'confirmed', // Auto-confirm orders from Prodhan.com
      paid_amount: 0,
      customer_notes: payload.customer_notes || '',
      order_source: 'prodhan_com_e_commerce'
    });

    console.log('✅ Order created:', order.order_number);

    // Update inventory stock
    for (const update of inventoryUpdates) {
      await base44.asServiceRole.entities.Inventory.update(update.id, {
        current_stock: update.newStock
      });
    }
    console.log('✅ Inventory updated');

    // Create inventory movements
    for (const movement of movements) {
      await base44.asServiceRole.entities.InventoryMovement.create({
        inventory_item_id: movement.inventory_item_id,
        movement_type: 'out',
        quantity: movement.quantity,
        reference_type: 'sale',
        reference_id: order.id,
        reference_number: order.order_number,
        unit_cost: movement.unit_price,
        total_value: movement.quantity * movement.unit_price,
        performed_by: 'prodhan_com_webhook',
        notes: `Automatic sale from Prodhan.com - Order: ${order.order_number}`,
        movement_date: new Date().toISOString().split('T')[0],
        balance_after: movement.newStock
      });
    }
    console.log('✅ Movements logged');

    return Response.json({
      success: true,
      message: 'Order received and processed successfully',
      order_id: order.id,
      order_number: order.order_number,
      customer_id: customer.id,
      items_processed: orderItems.length
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error processing Prodhan.com order:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});
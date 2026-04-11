import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * AUTOMATIC INVENTORY DEDUCTION ON ORDER SHIPPED
 * 
 * Triggered by entity automation when Order is updated.
 * Deducts inventory ONLY when order_status transitions TO 'shipped'.
 * Skips if already deducted (checks for existing movement records by order_number).
 * Also updates inventory status fields (total_sold, last_sale_date, etc.)
 * Supports barcode flow: if order has scanned_items[], uses barcode to find inventory.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const payload = await req.json();
    const { event, data, old_data } = payload;

    // FIX: log full payload so field names are visible in Logs on first deploy
    console.log('📨 RAW PAYLOAD:', JSON.stringify(payload, null, 2));
    console.log(`🔔 Automation triggered: type=${event?.type}, entity=${event?.entity_name}, id=${event?.entity_id}`);

    // Only handle update events
    if (event?.type !== 'update') {
      console.log('⏭️ Skipping: not an update event');
      return Response.json({ skipped: true, reason: 'Not an update event' });
    }

    const order = data;
    const previousOrder = old_data;

    console.log(`📦 Order ${order?.order_number}: old_status="${previousOrder?.order_status ?? '(old_data missing)'}" → new_status="${order?.order_status}"`);

    // Only proceed if status changed TO 'shipped'
    if (order?.order_status !== 'shipped') {
      console.log(`⏭️ Skipping: status is "${order?.order_status}", not "shipped"`);
      return Response.json({ skipped: true, reason: 'Status is not shipped' });
    }

    // FIX: only skip if old_data is actually present AND confirms already shipped.
    // If old_data is null (common on Base44), fall through to idempotency check below.
    if (previousOrder != null && previousOrder.order_status === 'shipped') {
      console.log('⏭️ Skipping: was already shipped');
      return Response.json({ skipped: true, reason: 'Already was shipped' });
    }

    console.log(`✅ Order ${order.order_number} (${event.entity_id}) transitioning to SHIPPED. Starting inventory deduction...`);

    // FIX: support barcode flow — if scanned_items[] exists use that, else order_items[]
    const scannedItems = Array.isArray(order.scanned_items) ? order.scanned_items : [];
    const usingBarcodeFlow = scannedItems.length > 0;
    const orderItems = usingBarcodeFlow ? scannedItems : (order.order_items || []);

    if (orderItems.length === 0) {
      console.log('⏭️ Skipping: no order items in this order');
      return Response.json({ skipped: true, reason: 'No order items' });
    }

    console.log(`📋 Order has ${orderItems.length} line item(s) | flow=${usingBarcodeFlow ? 'barcode' : 'normal'}`);

    // FIX: filter by reference_number only (single-field is safer across SDK versions),
    // then narrow to reference_type === 'sale' in JS to avoid multi-field AND bugs.
    // Wrapped in try/catch so a filter failure never silently blocks deduction.
    let existingMovements = [];
    try {
      const allMovements = await base44.asServiceRole.entities.InventoryMovement.filter({
        reference_number: order.order_number
      });
      existingMovements = (allMovements || []).filter(m => m.reference_type === 'sale');
    } catch (filterErr) {
      console.warn(`⚠️ InventoryMovement.filter() failed (proceeding anyway): ${filterErr.message}`);
    }

    if (existingMovements.length > 0) {
      console.log(`⚠️ Found ${existingMovements.length} existing sale movements for order ${order.order_number}. Already deducted. Skipping.`);
      return Response.json({ skipped: true, reason: 'Already deducted', existing_movements: existingMovements.length });
    }

    console.log(`🔍 No prior deductions found for ${order.order_number}. Proceeding with inventory deduction...`);

    let itemsDeducted = 0;
    let errors = [];
    const today = new Date().toISOString().split('T')[0];

    for (const item of orderItems) {
      console.log(`🔎 Raw item:`, JSON.stringify(item));

      // FIX: resolve inventory_id for both flows before the main try block
      if (usingBarcodeFlow) {
        // BARCODE FLOW: look up inventory by barcode field, then normalise item fields
        const barcode = item.barcode || item.sku || item.code || item.item_code || '';
        if (!barcode) {
          console.warn(`⚠️ Scanned item has no barcode field, skipping`);
          errors.push({ item: JSON.stringify(item), error: 'No barcode field' });
          continue;
        }
        try {
          const results = await base44.asServiceRole.entities.Inventory.filter({ barcode });
          const found = results && results[0];
          if (!found) {
            console.warn(`⚠️ No inventory found for barcode="${barcode}"`);
            errors.push({ item: barcode, error: 'Inventory not found by barcode' });
            continue;
          }
          // Normalise so the rest of the loop works identically to normal flow
          item.inventory_id = found.id;
          item.item_name = item.item_name || found.item_name;
          item.quantity = item.quantity || 1;
          item.unit_price = item.unit_price || found.selling_price || 0;
          item.selected_color = item.selected_color || item.color || null;
        } catch (barcodeErr) {
          console.error(`❌ Barcode lookup failed for "${barcode}":`, barcodeErr.message);
          errors.push({ item: barcode, error: barcodeErr.message });
          continue;
        }
      } else {
        // NORMAL FLOW: resolve inventory_id from multiple possible field name patterns
        item.inventory_id =
          item.inventory_id ||
          item.inventoryId ||
          item.product_id ||
          item.productId ||
          (item.inventory && item.inventory.id) ||
          (item.product && item.product.id) ||
          '';
      }

      if (!item.inventory_id) {
        console.warn(`⚠️ Item "${item.item_name}" has no inventory_id (checked 6 field names — see RAW PAYLOAD log), skipping`);
        errors.push({ item: item.item_name || 'unknown', error: 'No inventory_id' });
        continue;
      }

      try {
        // Fetch FRESH inventory data using service role
        const inventoryItem = await base44.asServiceRole.entities.Inventory.get(item.inventory_id);
        
        if (!inventoryItem) {
          console.warn(`⚠️ Inventory item ${item.inventory_id} not found for "${item.item_name}"`);
          errors.push({ item: item.item_name, error: 'Inventory item not found' });
          continue;
        }

        // Check if it's a bundle/combo product
        if (inventoryItem.is_bundle && inventoryItem.bundle_items && inventoryItem.bundle_items.length > 0) {
          console.log(`📦 "${inventoryItem.item_name}" is a bundle with ${inventoryItem.bundle_items.length} components`);
          
          for (const bundleItem of inventoryItem.bundle_items) {
            try {
              // FIX: resolve component id with fallbacks
              const componentId =
                bundleItem.inventory_id ||
                bundleItem.inventoryId ||
                bundleItem.id ||
                '';
              if (!componentId) {
                errors.push({ item: `Bundle component of "${inventoryItem.item_name}"`, error: 'No component inventory_id' });
                continue;
              }

              const componentItem = await base44.asServiceRole.entities.Inventory.get(componentId);
              if (!componentItem) {
                errors.push({ item: `Bundle component ${componentId}`, error: 'Not found' });
                continue;
              }

              const deductQty = (bundleItem.quantity || 1) * (item.quantity || 1);
              // FIX: use ?? so stock of 0 is handled correctly (|| treats 0 as falsy)
              const oldStock = componentItem.current_stock ?? 0;
              const newStock = Math.max(0, oldStock - deductQty);

              // Update component inventory
              await base44.asServiceRole.entities.Inventory.update(componentId, {
                current_stock: newStock,
                last_sale_date: today,
                total_sold: (componentItem.total_sold ?? 0) + deductQty,
                status: newStock <= 0 ? 'out_of_stock' : newStock <= (componentItem.minimum_stock || 0) ? 'low_stock' : 'active'
              });

              // Create movement record
              await base44.asServiceRole.entities.InventoryMovement.create({
                inventory_item_id: componentId,
                movement_type: 'out',
                quantity: -deductQty,
                reference_type: 'sale',
                reference_id: event.entity_id,
                reference_number: order.order_number,
                unit_cost: componentItem.purchase_price || 0,
                total_value: -(deductQty * (componentItem.purchase_price || 0)),
                performed_by: order.created_by || 'system',
                notes: `Auto-deduct on ship | Combo: ${inventoryItem.item_name} | Order: ${order.order_number}`,
                movement_date: today,
                balance_after: newStock
              });

              console.log(`  ✅ Bundle component "${componentItem.item_name}": ${oldStock} - ${deductQty} = ${newStock}`);
              itemsDeducted++;
            } catch (compError) {
              console.error(`  ❌ Error deducting bundle component:`, compError.message);
              errors.push({ item: `Bundle component of ${inventoryItem.item_name}`, error: compError.message });
            }
          }
        } else {
          // Regular product deduction
          const deductQty = item.quantity || 1;
          // FIX: use ?? so stock of 0 is handled correctly (|| treats 0 as falsy)
          const oldStock = inventoryItem.current_stock ?? 0;
          const newStock = Math.max(0, oldStock - deductQty);

          console.log(`  🔄 "${inventoryItem.item_name}": ${oldStock} - ${deductQty} = ${newStock}`);

          // Handle color variant deduction
          let updatedColorVariants = inventoryItem.color_variants;
          if (item.selected_color && inventoryItem.color_variants && inventoryItem.color_variants.length > 0) {
            updatedColorVariants = inventoryItem.color_variants.map(variant => {
              if (variant.color === item.selected_color) {
                return { ...variant, quantity: Math.max(0, (variant.quantity ?? 0) - deductQty) };
              }
              return variant;
            });
          }

          // Update inventory
          const updateData = {
            current_stock: newStock,
            last_sale_date: today,
            total_sold: (inventoryItem.total_sold ?? 0) + deductQty,
            status: newStock <= 0 ? 'out_of_stock' : newStock <= (inventoryItem.minimum_stock || 0) ? 'low_stock' : 'active'
          };
          if (updatedColorVariants) {
            updateData.color_variants = updatedColorVariants;
          }

          await base44.asServiceRole.entities.Inventory.update(item.inventory_id, updateData);

          // Create movement record
          await base44.asServiceRole.entities.InventoryMovement.create({
            inventory_item_id: item.inventory_id,
            movement_type: 'out',
            quantity: -deductQty,
            reference_type: 'sale',
            reference_id: event.entity_id,
            reference_number: order.order_number,
            unit_cost: item.unit_price || 0,
            total_value: -(deductQty * (item.unit_price || 0)),
            performed_by: order.created_by || 'system',
            notes: `Auto-deduct on ship | Order: ${order.order_number}${item.selected_color ? ` | Color: ${item.selected_color}` : ''}`,
            movement_date: today,
            balance_after: newStock
          });

          console.log(`  ✅ "${inventoryItem.item_name}": deducted ${deductQty}, new stock = ${newStock}`);
          itemsDeducted++;
        }
      } catch (itemError) {
        console.error(`  ❌ Error processing item "${item.item_name || item.inventory_id}":`, itemError.message);
        errors.push({ item: item.item_name || item.inventory_id || 'unknown', error: itemError.message });
      }
    }

    console.log(`📊 COMPLETE: Order ${order.order_number} | flow=${usingBarcodeFlow ? 'barcode' : 'normal'} | ${itemsDeducted} items deducted | ${errors.length} errors`);

    return Response.json({
      success: true,
      order_number: order.order_number,
      order_id: event.entity_id,
      flow: usingBarcodeFlow ? 'barcode' : 'normal',
      items_deducted: itemsDeducted,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Fatal error in deductInventoryOnShip:', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
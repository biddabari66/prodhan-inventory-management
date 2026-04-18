import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * AUTOMATIC INVENTORY DEDUCTION ON ORDER SHIPPED
 *
 * Triggered by entity automation when an Order is created or updated.
 * Deducts inventory when order_status is 'shipped' and has not been deducted yet.
 * Idempotency is guaranteed by checking existing InventoryMovement records
 * (reference_type='sale' + reference_number=order_number) BEFORE any deduction.
 *
 * Supports:
 *   - Normal flow: order.order_items[] with inventory_id references
 *   - Barcode flow: order.scanned_items[] with barcode references
 *   - Bundle/combo products (multi-component deduction)
 *   - Color variant tracking
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const payload = await req.json();

    // Log the full payload so we can see the exact shape Base44 is sending.
    console.log('📨 RAW PAYLOAD:', JSON.stringify(payload, null, 2));

    // ---------------------------------------------------------------------
    // FIX 1: Base44 payload shape is inconsistent across automation versions.
    // Sometimes it arrives as { event, data, old_data }, sometimes flattened.
    // Normalise all variants into { eventType, entityId, order, previousOrder }.
    // ---------------------------------------------------------------------
    const event = payload.event || {};
    const eventType = event.type || payload.event_type || payload.type || 'update';
    const entityId = event.entity_id || payload.entity_id || payload.id || payload?.data?.id;
    const order = payload.data || payload.record || payload.new_data || payload;
    const previousOrder = payload.old_data || payload.previous_data || payload.old || null;

    console.log(`🔔 Automation triggered: type=${eventType}, entity=${event?.entity_name || 'Order'}, id=${entityId}`);

    if (!order || typeof order !== 'object') {
      console.log('⏭️ Skipping: could not locate order object in payload');
      return Response.json({ skipped: true, reason: 'Malformed payload - no order data' });
    }

    // ---------------------------------------------------------------------
    // FIX 2: Accept BOTH `update` and `create` events. An order created
    // directly in shipped state was previously never processed.
    // ---------------------------------------------------------------------
    if (eventType !== 'update' && eventType !== 'create') {
      console.log(`⏭️ Skipping: event type "${eventType}" is not update/create`);
      return Response.json({ skipped: true, reason: `Event type ${eventType} not handled` });
    }

    console.log(
      `📦 Order ${order?.order_number}: old_status="${previousOrder?.order_status ?? '(none)'}" → new_status="${order?.order_status}"`
    );

    // Only proceed when the current status is 'shipped'
    if (order?.order_status !== 'shipped') {
      console.log(`⏭️ Skipping: current status is "${order?.order_status}", not "shipped"`);
      return Response.json({ skipped: true, reason: 'Status is not shipped' });
    }

    // ---------------------------------------------------------------------
    // FIX 3: Status-transition check is ADVISORY ONLY. Real idempotency comes
    // from the InventoryMovement check below. Do NOT early-return here even if
    // the previous status was also 'shipped' — the movement check is the
    // source of truth, and old_data is often missing/stale on Base44.
    // ---------------------------------------------------------------------
    if (previousOrder?.order_status === 'shipped') {
      console.log('ℹ️ Previous status was also shipped — relying on movement-check for idempotency');
    }

    if (!entityId) {
      console.warn('⚠️ No entity_id in payload — movement records will lack reference_id');
    }

    console.log(`✅ Order ${order.order_number} is SHIPPED. Starting inventory deduction…`);

    // ---------------------------------------------------------------------
    // Choose the line-items source.
    // Barcode flow takes precedence when scanned_items[] has entries.
    // ---------------------------------------------------------------------
    const scannedItems = Array.isArray(order.scanned_items) ? order.scanned_items : [];
    const usingBarcodeFlow = scannedItems.length > 0;
    const orderItems = usingBarcodeFlow ? scannedItems : (order.order_items || []);

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      console.log('⏭️ Skipping: no order items on this order');
      return Response.json({ skipped: true, reason: 'No order items' });
    }

    console.log(`📋 Order has ${orderItems.length} line item(s) | flow=${usingBarcodeFlow ? 'barcode' : 'normal'}`);

    // ---------------------------------------------------------------------
    // IDEMPOTENCY CHECK — this is the single source of truth.
    // If any InventoryMovement already exists for this order_number with
    // reference_type='sale', we have already deducted. Stop here.
    //
    // We filter by reference_number (single field, most reliable across SDK
    // versions) and narrow by reference_type in JS.
    // ---------------------------------------------------------------------
    let existingMovements = [];
    try {
      const allMovements = await base44.asServiceRole.entities.InventoryMovement.filter({
        reference_number: order.order_number
      });
      existingMovements = (allMovements || []).filter(m => m.reference_type === 'sale');
    } catch (filterErr) {
      // If the filter fails we cannot safely proceed — double-deduction is
      // worse than no-deduction. Fail loud.
      console.error(`❌ InventoryMovement.filter() failed: ${filterErr.message}`);
      return Response.json(
        { success: false, error: `Idempotency check failed: ${filterErr.message}` },
        { status: 500 }
      );
    }

    if (existingMovements.length > 0) {
      console.log(
        `⚠️ Found ${existingMovements.length} existing sale movements for order ${order.order_number}. Already deducted. Skipping.`
      );
      return Response.json({
        skipped: true,
        reason: 'Already deducted',
        existing_movements: existingMovements.length
      });
    }

    console.log(`🔍 No prior deductions found. Proceeding…`);

    let itemsDeducted = 0;
    const errors = [];
    const today = new Date().toISOString().split('T')[0];

    // ---------------------------------------------------------------------
    // Process each line item
    // ---------------------------------------------------------------------
    for (const item of orderItems) {
      console.log(`🔎 Line item:`, JSON.stringify(item));

      // ----- Resolve inventory_id -----
      if (usingBarcodeFlow) {
        const barcode = item.barcode || item.sku || item.code || item.item_code || '';
        if (!barcode) {
          console.warn('⚠️ Scanned item has no barcode/sku/code field — skipping');
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
        // Normal flow — inventory_id might be stored under various names.
        item.inventory_id =
          item.inventory_id ||
          item.inventoryId ||
          item.product_id ||
          item.productId ||
          item.item_id ||
          (item.inventory && item.inventory.id) ||
          (item.product && item.product.id) ||
          '';
      }

      if (!item.inventory_id) {
        console.warn(`⚠️ Item "${item.item_name}" has no inventory_id — skipping (check RAW PAYLOAD for field name)`);
        errors.push({ item: item.item_name || 'unknown', error: 'No inventory_id' });
        continue;
      }

      try {
        // Fetch fresh inventory record
        const inventoryItem = await base44.asServiceRole.entities.Inventory.get(item.inventory_id);

        if (!inventoryItem) {
          console.warn(`⚠️ Inventory ${item.inventory_id} not found for "${item.item_name}"`);
          errors.push({ item: item.item_name, error: 'Inventory item not found' });
          continue;
        }

        // =================================================================
        // BUNDLE / COMBO PRODUCT
        // =================================================================
        if (inventoryItem.is_bundle && Array.isArray(inventoryItem.bundle_items) && inventoryItem.bundle_items.length > 0) {
          console.log(`📦 "${inventoryItem.item_name}" is a bundle with ${inventoryItem.bundle_items.length} components`);

          for (const bundleItem of inventoryItem.bundle_items) {
            try {
              const componentId =
                bundleItem.inventory_id ||
                bundleItem.inventoryId ||
                bundleItem.product_id ||
                bundleItem.id ||
                '';

              if (!componentId) {
                errors.push({
                  item: `Bundle component of "${inventoryItem.item_name}"`,
                  error: 'No component inventory_id'
                });
                continue;
              }

              const componentItem = await base44.asServiceRole.entities.Inventory.get(componentId);
              if (!componentItem) {
                errors.push({ item: `Bundle component ${componentId}`, error: 'Not found' });
                continue;
              }

              const deductQty = (bundleItem.quantity || 1) * (item.quantity || 1);
              const oldStock = componentItem.current_stock ?? 0;
              const newStock = Math.max(0, oldStock - deductQty);

              await base44.asServiceRole.entities.Inventory.update(componentId, {
                current_stock: newStock,
                last_sale_date: today,
                total_sold: (componentItem.total_sold ?? 0) + deductQty,
                status:
                  newStock <= 0
                    ? 'out_of_stock'
                    : newStock <= (componentItem.minimum_stock || 0)
                    ? 'low_stock'
                    : 'active'
              });

              await base44.asServiceRole.entities.InventoryMovement.create({
                inventory_item_id: componentId,
                movement_type: 'out',
                quantity: -deductQty,
                reference_type: 'sale',
                reference_id: entityId,
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
              console.error(`  ❌ Bundle component error:`, compError.message);
              errors.push({
                item: `Bundle component of ${inventoryItem.item_name}`,
                error: compError.message
              });
            }
          }

          // Continue to next line item after bundle processing
          continue;
        }

        // =================================================================
        // REGULAR PRODUCT
        // =================================================================
        const deductQty = item.quantity || 1;
        const oldStock = inventoryItem.current_stock ?? 0;
        const newStock = Math.max(0, oldStock - deductQty);

        console.log(`  🔄 "${inventoryItem.item_name}": ${oldStock} - ${deductQty} = ${newStock}`);

        // Color variant handling
        let updatedColorVariants = inventoryItem.color_variants;
        if (
          item.selected_color &&
          Array.isArray(inventoryItem.color_variants) &&
          inventoryItem.color_variants.length > 0
        ) {
          updatedColorVariants = inventoryItem.color_variants.map(variant => {
            if (variant.color === item.selected_color) {
              return { ...variant, quantity: Math.max(0, (variant.quantity ?? 0) - deductQty) };
            }
            return variant;
          });
        }

        const updateData = {
          current_stock: newStock,
          last_sale_date: today,
          total_sold: (inventoryItem.total_sold ?? 0) + deductQty,
          status:
            newStock <= 0
              ? 'out_of_stock'
              : newStock <= (inventoryItem.minimum_stock || 0)
              ? 'low_stock'
              : 'active'
        };
        if (updatedColorVariants) {
          updateData.color_variants = updatedColorVariants;
        }

        await base44.asServiceRole.entities.Inventory.update(item.inventory_id, updateData);

        await base44.asServiceRole.entities.InventoryMovement.create({
          inventory_item_id: item.inventory_id,
          movement_type: 'out',
          quantity: -deductQty,
          reference_type: 'sale',
          reference_id: entityId,
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
      } catch (itemError) {
        console.error(`  ❌ Error processing item "${item.item_name || item.inventory_id}":`, itemError.message);
        errors.push({
          item: item.item_name || item.inventory_id || 'unknown',
          error: itemError.message
        });
      }
    }

    console.log(
      `📊 COMPLETE: Order ${order.order_number} | flow=${usingBarcodeFlow ? 'barcode' : 'normal'} | ${itemsDeducted} items deducted | ${errors.length} errors`
    );

    return Response.json({
      success: true,
      order_number: order.order_number,
      order_id: entityId,
      flow: usingBarcodeFlow ? 'barcode' : 'normal',
      items_deducted: itemsDeducted,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ Fatal error in deductInventoryOnShip:', error.message, error.stack);
    return Response.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
});
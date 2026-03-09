import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * AUTOMATIC INVENTORY DEDUCTION ON ORDER SHIPPED
 * 
 * Triggered by entity automation when Order is updated.
 * Deducts inventory ONLY when order_status transitions TO 'shipped'.
 * Skips if already deducted (checks for existing movement records).
 * Also updates inventory status fields (total_sold, last_sale_date, etc.)
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const payload = await req.json();
    const { event, data, old_data } = payload;

    // Only handle update events
    if (event?.type !== 'update') {
      return Response.json({ skipped: true, reason: 'Not an update event' });
    }

    const order = data;
    const previousOrder = old_data;

    // Only proceed if status changed TO 'shipped'
    if (order?.order_status !== 'shipped') {
      return Response.json({ skipped: true, reason: 'Status is not shipped' });
    }

    // Skip if it was already shipped before (no re-deduction)
    if (previousOrder?.order_status === 'shipped') {
      return Response.json({ skipped: true, reason: 'Already was shipped' });
    }

    console.log(`📦 Order ${order.order_number} (${event.entity_id}) status changed to SHIPPED. Deducting inventory...`);

    const orderItems = order.order_items || [];
    if (orderItems.length === 0) {
      return Response.json({ skipped: true, reason: 'No order items' });
    }

    // Check if we already deducted for this order (idempotency check)
    const existingMovements = await base44.asServiceRole.entities.InventoryMovement.filter({
      reference_id: event.entity_id,
      reference_type: 'sale',
      movement_type: 'out'
    });

    if (existingMovements.length > 0) {
      console.log(`⚠️ Inventory already deducted for order ${order.order_number} (${existingMovements.length} movements found). Skipping.`);
      return Response.json({ skipped: true, reason: 'Already deducted', existing_movements: existingMovements.length });
    }

    let itemsDeducted = 0;
    let errors = [];
    const today = new Date().toISOString().split('T')[0];

    for (const item of orderItems) {
      if (!item.inventory_id) {
        console.warn(`⚠️ Item "${item.item_name}" has no inventory_id, skipping`);
        continue;
      }

      try {
        // Fetch FRESH inventory data (not cached) using service role
        const inventoryItem = await base44.asServiceRole.entities.Inventory.get(item.inventory_id);
        
        if (!inventoryItem) {
          console.warn(`⚠️ Inventory item ${item.inventory_id} not found for "${item.item_name}"`);
          errors.push({ item: item.item_name, error: 'Inventory item not found' });
          continue;
        }

        // Check if it's a bundle/combo product
        if (inventoryItem.is_bundle && inventoryItem.bundle_items?.length > 0) {
          // Deduct component items for bundles
          for (const bundleItem of inventoryItem.bundle_items) {
            try {
              const componentItem = await base44.asServiceRole.entities.Inventory.get(bundleItem.inventory_id);
              if (!componentItem) {
                errors.push({ item: `Bundle component ${bundleItem.inventory_id}`, error: 'Not found' });
                continue;
              }

              const deductQty = (bundleItem.quantity || 1) * (item.quantity || 1);
              const newStock = Math.max(0, (componentItem.current_stock || 0) - deductQty);

              // Update component inventory
              await base44.asServiceRole.entities.Inventory.update(bundleItem.inventory_id, {
                current_stock: newStock,
                last_sale_date: today,
                total_sold: (componentItem.total_sold || 0) + deductQty,
                status: newStock <= 0 ? 'out_of_stock' : newStock <= (componentItem.minimum_stock || 0) ? 'low_stock' : 'active'
              });

              // Create movement record
              await base44.asServiceRole.entities.InventoryMovement.create({
                inventory_item_id: bundleItem.inventory_id,
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

              console.log(`  ✅ Bundle component "${componentItem.item_name}": -${deductQty} → ${newStock} remaining`);
              itemsDeducted++;
            } catch (compError) {
              console.error(`  ❌ Error deducting bundle component ${bundleItem.inventory_id}:`, compError.message);
              errors.push({ item: `Bundle component ${bundleItem.inventory_id}`, error: compError.message });
            }
          }
        } else {
          // Regular product deduction
          const deductQty = item.quantity || 1;
          const currentStock = inventoryItem.current_stock || 0;
          const newStock = Math.max(0, currentStock - deductQty);

          // Handle color variant deduction
          let updatedColorVariants = inventoryItem.color_variants;
          if (item.selected_color && inventoryItem.color_variants?.length > 0) {
            updatedColorVariants = inventoryItem.color_variants.map(variant => {
              if (variant.color === item.selected_color) {
                return { ...variant, quantity: Math.max(0, (variant.quantity || 0) - deductQty) };
              }
              return variant;
            });
          }

          // Update inventory
          const updateData = {
            current_stock: newStock,
            last_sale_date: today,
            total_sold: (inventoryItem.total_sold || 0) + deductQty,
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

          console.log(`  ✅ "${inventoryItem.item_name}": -${deductQty} → ${newStock} remaining`);
          itemsDeducted++;
        }
      } catch (itemError) {
        console.error(`  ❌ Error processing item "${item.item_name}":`, itemError.message);
        errors.push({ item: item.item_name, error: itemError.message });
      }
    }

    console.log(`📊 Inventory deduction complete for ${order.order_number}: ${itemsDeducted} items deducted, ${errors.length} errors`);

    return Response.json({
      success: true,
      order_number: order.order_number,
      order_id: event.entity_id,
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
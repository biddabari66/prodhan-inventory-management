import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REVERT INVENTORY ON ORDER CANCELLATION
 * When a shipped order is cancelled or returned, restore inventory
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { order_id, reason } = await req.json();
    
    if (!order_id) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }
    
    // Get order
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Only revert if order was shipped (inventory was already deducted)
    if (!['shipped', 'out_for_delivery', 'delivered'].includes(order.order_status)) {
      return Response.json({ 
        success: false, 
        message: 'Order was not shipped, no inventory to revert',
        order_status: order.order_status
      });
    }
    
    const results = [];
    
    // Restore inventory for each item
    for (const item of (order.order_items || [])) {
      try {
        const inventoryItem = await base44.asServiceRole.entities.Inventory.get(item.inventory_id);
        
        if (!inventoryItem) {
          results.push({
            item_name: item.item_name,
            success: false,
            error: 'Inventory item not found'
          });
          continue;
        }
        
        // Handle bundles
        if (inventoryItem.is_bundle && inventoryItem.bundle_items?.length > 0) {
          for (const bundleItem of inventoryItem.bundle_items) {
            const componentItem = await base44.asServiceRole.entities.Inventory.get(bundleItem.inventory_id);
            if (componentItem) {
              const restoreQty = bundleItem.quantity * item.quantity;
              const newStock = componentItem.current_stock + restoreQty;
              
              await base44.asServiceRole.entities.Inventory.update(bundleItem.inventory_id, {
                current_stock: newStock
              });
              
              await base44.asServiceRole.entities.InventoryMovement.create({
                inventory_item_id: bundleItem.inventory_id,
                movement_type: 'in',
                quantity: restoreQty,
                reference_type: 'cancelled_order',
                reference_id: order.id,
                reference_number: order.order_number,
                unit_cost: componentItem.purchase_price || 0,
                total_value: restoreQty * (componentItem.purchase_price || 0),
                performed_by: user.id,
                notes: `Reverted from cancelled order: ${order.order_number} - ${reason || 'Order cancelled'}`,
                movement_date: new Date().toISOString().split('T')[0],
                balance_after: newStock
              });
              
              results.push({
                item_name: `${componentItem.item_name} (bundle component)`,
                success: true,
                restored_qty: restoreQty,
                new_stock: newStock
              });
            }
          }
        } else {
          // Regular product
          const restoreQty = item.quantity;
          const newStock = inventoryItem.current_stock + restoreQty;
          
          // Handle color variants
          let updatedColorVariants = inventoryItem.color_variants;
          if (item.selected_color && inventoryItem.color_variants?.length > 0) {
            updatedColorVariants = inventoryItem.color_variants.map(variant => {
              if (variant.color === item.selected_color) {
                return { ...variant, quantity: variant.quantity + restoreQty };
              }
              return variant;
            });
          }
          
          await base44.asServiceRole.entities.Inventory.update(item.inventory_id, {
            current_stock: newStock,
            ...(updatedColorVariants && { color_variants: updatedColorVariants })
          });
          
          await base44.asServiceRole.entities.InventoryMovement.create({
            inventory_item_id: item.inventory_id,
            movement_type: 'in',
            quantity: restoreQty,
            reference_type: 'cancelled_order',
            reference_id: order.id,
            reference_number: order.order_number,
            unit_cost: item.unit_price || inventoryItem.purchase_price || 0,
            total_value: restoreQty * (item.unit_price || inventoryItem.purchase_price || 0),
            performed_by: user.id,
            notes: `Reverted from cancelled order: ${order.order_number}${item.selected_color ? ` - Color: ${item.selected_color}` : ''} - ${reason || 'Order cancelled'}`,
            movement_date: new Date().toISOString().split('T')[0],
            balance_after: newStock
          });
          
          results.push({
            item_name: item.item_name,
            success: true,
            restored_qty: restoreQty,
            new_stock: newStock
          });
        }
      } catch (itemError) {
        results.push({
          item_name: item.item_name,
          success: false,
          error: itemError.message
        });
      }
    }
    
    // Update order status
    await base44.asServiceRole.entities.Order.update(order.id, {
      order_status: 'cancelled',
      notes: `${order.notes || ''}\n[${new Date().toISOString()}] Cancelled: ${reason || 'No reason provided'}. Inventory reverted.`
    });
    
    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name,
      action: 'update',
      entity_type: 'Order',
      entity_id: order.id,
      module: 'sales',
      description: `Order ${order.order_number} cancelled and inventory reverted`,
      new_values: { order_status: 'cancelled', inventory_reverted: true, items_reverted: results.length },
      timestamp: new Date().toISOString()
    });
    
    return Response.json({
      success: true,
      order_number: order.order_number,
      items_reverted: results.filter(r => r.success).length,
      results
    });
    
  } catch (error) {
    console.error('Revert inventory error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
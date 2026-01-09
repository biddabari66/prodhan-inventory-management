/**
 * Combo product utilities - shared between frontend and backend
 */

export const getComboCount = (inventoryItem, orderItem) => {
  if (!inventoryItem) return 1;
  
  if (inventoryItem.is_bundle && inventoryItem.bundle_items?.length > 0) {
    return inventoryItem.bundle_items.reduce((sum, b) => sum + (b.quantity || 1), 0);
  }
  
  const itemName = orderItem?.item_name || inventoryItem.item_name || '';
  const match = itemName.match(/(\d+)×/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return 1;
};

export const getActualQuantity = (quantity, inventoryItem, orderItem) => {
  const comboCount = getComboCount(inventoryItem, orderItem);
  return quantity * comboCount;
};
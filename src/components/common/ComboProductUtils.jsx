/**
 * EXPERT COMBO PRODUCT UTILITIES
 * Centralized utilities for handling combo products across the application
 * Ensures consistent calculations and detection across all pages and reports
 */

/**
 * Detects if a product is a combo and returns the total bundle count
 * Works with both bundle_items (set in form) AND product name patterns (5 pcs, 2pc, etc.)
 * 
 * @param {Object} inventoryItem - The inventory item object
 * @param {Object} orderItem - Optional order item (for name-based detection)
 * @returns {number} Total bundle count (sum of all bundle item quantities)
 */
export const getComboCount = (inventoryItem, orderItem = null) => {
  if (!inventoryItem) return 1;

  // Method 1: Check bundle_items (set via product form)
  if (inventoryItem.is_bundle === true && 
      Array.isArray(inventoryItem.bundle_items) && 
      inventoryItem.bundle_items.length > 0) {
    // Sum all bundle item quantities (e.g., 1×blanket + 1×pillow = 2)
    return inventoryItem.bundle_items.reduce((sum, bi) => sum + (bi.quantity || 1), 0);
  }

  // Method 2: Parse from product name (fallback for legacy/manual entries)
  const itemName = orderItem?.item_name || inventoryItem.item_name || '';
  const nameMatch = itemName.match(/^(\d+)\s*(?:pcs?|pc|piece)/i);
  
  if (nameMatch) {
    return parseInt(nameMatch[1]);
  }

  // Not a combo
  return 1;
};

/**
 * Calculates actual quantity including combo expansion
 * 
 * @param {number} orderedQuantity - Quantity ordered
 * @param {Object} inventoryItem - Inventory item
 * @param {Object} orderItem - Order item (optional)
 * @returns {number} Actual expanded quantity
 */
export const getActualQuantity = (orderedQuantity, inventoryItem, orderItem = null) => {
  const bundleCount = getComboCount(inventoryItem, orderItem);
  return orderedQuantity * bundleCount;
};

/**
 * Checks if a product is a combo
 */
export const isComboProduct = (inventoryItem, orderItem = null) => {
  return getComboCount(inventoryItem, orderItem) > 1;
};

/**
 * Gets combo details for display
 */
export const getComboDetails = (inventoryItem, inventoryMap) => {
  if (!inventoryItem?.is_bundle || !inventoryItem?.bundle_items?.length) {
    return null;
  }

  const components = inventoryItem.bundle_items.map(bi => {
    const component = inventoryMap?.get ? inventoryMap.get(bi.inventory_id) : null;
    return {
      quantity: bi.quantity || 1,
      name: component?.item_name || component?.english_item_name || 'Unknown'
    };
  });

  return {
    totalCount: components.reduce((sum, c) => sum + c.quantity, 0),
    components
  };
};

export default {
  getComboCount,
  getActualQuantity,
  isComboProduct,
  getComboDetails
};
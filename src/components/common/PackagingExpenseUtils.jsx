/**
 * Packaging Expense Utilities
 * 
 * These utilities help calculate and distribute packaging expenses for reports.
 * Distributed expenses (no specific product) are proportionally allocated across all products.
 */

/**
 * Calculate packaging expenses for a specific product
 * @param {string} productId - The inventory ID of the product
 * @param {Array} packagingExpenses - Array of all packaging expense records
 * @param {Array} allProducts - Array of all products (for distribution calculation)
 * @param {Object} options - Optional filters { dateFrom, dateTo, status }
 * @returns {Object} { directExpense, distributedExpense, totalExpense }
 */
export function calculateProductPackagingExpense(productId, packagingExpenses, allProducts, options = {}) {
  const { dateFrom, dateTo, status = 'approved' } = options;
  
  // Filter expenses by status and date
  const filteredExpenses = packagingExpenses.filter(exp => {
    if (status && exp.status !== status) return false;
    if (dateFrom && exp.expense_date < dateFrom) return false;
    if (dateTo && exp.expense_date > dateTo) return false;
    return true;
  });

  let directExpense = 0;
  let distributedExpense = 0;

  // Calculate direct expense (expenses assigned to this specific product)
  filteredExpenses.forEach(exp => {
    exp.items?.forEach(item => {
      if (item.inventory_id === productId && !item.is_distributed && !item.is_other_expense) {
        directExpense += item.amount || 0;
      }
    });
  });

  // Calculate distributed expense (shared across all products)
  const totalDistributedAmount = filteredExpenses.reduce((sum, exp) => {
    const distItems = exp.items?.filter(i => i.is_distributed) || [];
    return sum + distItems.reduce((s, i) => s + (i.amount || 0), 0) + (exp.courier_expense || 0);
  }, 0);

  // Distribute proportionally across all active products
  const activeProductCount = allProducts.filter(p => p.status !== 'discontinued').length;
  if (activeProductCount > 0 && totalDistributedAmount > 0) {
    distributedExpense = totalDistributedAmount / activeProductCount;
  }

  return {
    directExpense: Math.round(directExpense * 100) / 100,
    distributedExpense: Math.round(distributedExpense * 100) / 100,
    totalExpense: Math.round((directExpense + distributedExpense) * 100) / 100
  };
}

/**
 * Calculate total packaging expenses summary for a date range
 * @param {Array} packagingExpenses - Array of all packaging expense records
 * @param {Object} options - Optional filters { dateFrom, dateTo, status }
 * @returns {Object} { totalDirect, totalDistributed, totalOther, grandTotal, byProduct }
 */
export function calculatePackagingExpensesSummary(packagingExpenses, options = {}) {
  const { dateFrom, dateTo, status = 'approved' } = options;
  
  const filteredExpenses = packagingExpenses.filter(exp => {
    if (status && exp.status !== status) return false;
    if (dateFrom && exp.expense_date < dateFrom) return false;
    if (dateTo && exp.expense_date > dateTo) return false;
    return true;
  });

  let totalDirect = 0;
  let totalDistributed = 0;
  let totalOther = 0;
  let totalCourier = 0;
  const byProduct = {};

  filteredExpenses.forEach(exp => {
    totalCourier += exp.courier_expense || 0;
    
    exp.items?.forEach(item => {
      if (item.is_other_expense) {
        totalOther += item.amount || 0;
      } else if (item.is_distributed) {
        totalDistributed += item.amount || 0;
      } else {
        totalDirect += item.amount || 0;
        // Track by product
        const key = item.inventory_id || 'unknown';
        if (!byProduct[key]) {
          byProduct[key] = { productName: item.product_name, amount: 0 };
        }
        byProduct[key].amount += item.amount || 0;
      }
    });
  });

  return {
    totalDirect: Math.round(totalDirect * 100) / 100,
    totalDistributed: Math.round(totalDistributed * 100) / 100,
    totalOther: Math.round(totalOther * 100) / 100,
    totalCourier: Math.round(totalCourier * 100) / 100,
    grandTotal: Math.round((totalDirect + totalDistributed + totalOther + totalCourier) * 100) / 100,
    byProduct
  };
}

/**
 * Get packaging cost per unit sold for a product
 * @param {string} productId - The inventory ID
 * @param {Array} packagingExpenses - Array of packaging expenses
 * @param {Array} orders - Array of orders for unit count
 * @param {Array} allProducts - All products for distribution
 * @param {Object} options - Date filters
 * @returns {number} Cost per unit
 */
export function getPackagingCostPerUnit(productId, packagingExpenses, orders, allProducts, options = {}) {
  const { dateFrom, dateTo } = options;
  
  // Get total packaging expense for this product
  const expenseData = calculateProductPackagingExpense(productId, packagingExpenses, allProducts, { 
    ...options, 
    status: 'approved' 
  });
  
  // Count units sold in the period
  let unitsSold = 0;
  orders.forEach(order => {
    if (order.order_status === 'cancelled' || order.order_status === 'returned') return;
    if (dateFrom && order.order_date < dateFrom) return;
    if (dateTo && order.order_date > dateTo) return;
    
    order.order_items?.forEach(item => {
      if (item.inventory_id === productId) {
        unitsSold += item.quantity || 0;
      }
    });
  });

  if (unitsSold === 0) return 0;
  return Math.round((expenseData.totalExpense / unitsSold) * 100) / 100;
}

/**
 * Fetch and calculate real-time packaging expenses for reporting
 * Use this in report generators to get accurate packaging data
 */
export async function fetchRealTimePackagingExpenses(erp, options = {}) {
  const { dateFrom, dateTo } = options;
  
  // Fetch approved packaging expenses
  const expenses = await erp.entities.PackagingExpense.filter(
    { status: 'approved' },
    '-expense_date',
    5000
  );
  
  // Filter by date if provided
  const filtered = expenses.filter(exp => {
    if (dateFrom && exp.expense_date < dateFrom) return false;
    if (dateTo && exp.expense_date > dateTo) return false;
    return true;
  });

  return calculatePackagingExpensesSummary(filtered, { status: null }); // Already filtered
}
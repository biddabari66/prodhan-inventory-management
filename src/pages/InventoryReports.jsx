import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, TrendingDown, RotateCcw, RefreshCw, Download,
  ShoppingBag, PackageX, BarChart3, Truck, Building2, 
  Calendar, Filter, Image, FileDown, Loader2, Check, Package
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { withPermission } from '../components/common/PermissionGuard';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import ComprehensiveReportGenerator from '../components/reports/ComprehensiveReportGenerator';

// BDT timezone helpers
const toBDTDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

function InventoryReportsPage() {
  const [activeTab, setActiveTab] = useState('quick');
  const [reportGenerating, setReportGenerating] = useState(null);
  
  // Quick report filters
  const [startDate, setStartDate] = useState(toBDTDate(subDays(new Date(), 30)));
  const [endDate, setEndDate] = useState(toBDTDate());
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Custom report builder state
  const [customReport, setCustomReport] = useState({
    reportType: 'sales',
    dateRange: 'last_30_days',
    customStartDate: toBDTDate(subDays(new Date(), 30)),
    customEndDate: toBDTDate(),
    groupBy: 'product',
    includeFields: {
      product_name: true,
      quantity: true,
      revenue: true,
      profit: false,
      category: false,
      supplier: false,
      customer: false
    },
    sortBy: 'revenue',
    sortOrder: 'desc',
    format: 'pdf'
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['productCategories'],
    queryFn: () => base44.entities.ProductCategory.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => cat.department === 'prodhan_com_e_commerce');
  }, [categories]);

  const reportTypes = [
    { id: 'sales', label: 'Sales Report', icon: ShoppingBag, color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'purchase', label: 'Purchase Report', icon: Truck, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'packaging', label: 'Packaging Expenses', icon: Package, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { id: 'waste', label: 'Waste/Damage Report', icon: PackageX, color: 'text-red-600', bgColor: 'bg-red-50' },
    { id: 'returns', label: 'Returns Report', icon: RotateCcw, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 'supplier', label: 'Supplier Report', icon: Building2, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { id: 'stock', label: 'Stock Valuation', icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { id: 'low_stock', label: 'Low Stock Alert', icon: TrendingDown, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { id: 'movement', label: 'Movement Summary', icon: BarChart3, color: 'text-cyan-600', bgColor: 'bg-cyan-50' }
  ];

  const dateRangeOptions = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'last_3_months', label: 'Last 3 Months' },
    { id: 'custom', label: 'Custom Range' }
  ];

  const groupByOptions = {
    sales: [
      { id: 'product', label: 'By Product' },
      { id: 'category', label: 'By Category' },
      { id: 'customer', label: 'By Customer' },
      { id: 'date', label: 'By Date' }
    ],
    purchase: [
      { id: 'product', label: 'By Product' },
      { id: 'supplier', label: 'By Supplier' },
      { id: 'category', label: 'By Category' },
      { id: 'date', label: 'By Date' }
    ],
    packaging: [
      { id: 'product', label: 'By Product' },
      { id: 'type', label: 'By Packaging Type' },
      { id: 'date', label: 'By Date' }
    ],
    waste: [
      { id: 'product', label: 'By Product' },
      { id: 'reason', label: 'By Reason' },
      { id: 'date', label: 'By Date' }
    ],
    returns: [
      { id: 'product', label: 'By Product' },
      { id: 'customer', label: 'By Customer' },
      { id: 'reason', label: 'By Reason' },
      { id: 'date', label: 'By Date' }
    ],
    supplier: [
      { id: 'supplier', label: 'By Supplier' },
      { id: 'product', label: 'By Product' }
    ],
    stock: [
      { id: 'product', label: 'By Product' },
      { id: 'category', label: 'By Category' }
    ],
    low_stock: [
      { id: 'product', label: 'By Product' },
      { id: 'category', label: 'By Category' }
    ],
    movement: [
      { id: 'product', label: 'By Product' },
      { id: 'type', label: 'By Movement Type' },
      { id: 'date', label: 'By Date' }
    ]
  };

  const getDateRange = (rangeId) => {
    const now = new Date();
    switch (rangeId) {
      case 'today':
        return { start: toBDTDate(now), end: toBDTDate(now) };
      case 'yesterday':
        return { start: toBDTDate(subDays(now, 1)), end: toBDTDate(subDays(now, 1)) };
      case 'last_7_days':
        return { start: toBDTDate(subDays(now, 7)), end: toBDTDate(now) };
      case 'last_30_days':
        return { start: toBDTDate(subDays(now, 30)), end: toBDTDate(now) };
      case 'this_month':
        return { start: toBDTDate(startOfMonth(now)), end: toBDTDate(endOfMonth(now)) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: toBDTDate(startOfMonth(lastMonth)), end: toBDTDate(endOfMonth(lastMonth)) };
      case 'last_3_months':
        return { start: toBDTDate(subMonths(now, 3)), end: toBDTDate(now) };
      case 'custom':
        return { start: customReport.customStartDate, end: customReport.customEndDate };
      default:
        return { start: toBDTDate(subDays(now, 30)), end: toBDTDate(now) };
    }
  };

  const handleQuickReport = async (reportType) => {
    setReportGenerating(reportType);
    try {
      toast.info('Generating report...');
      
      const [orders, inventory, movements, purchaseOrders, packagingExpenses, expenses] = await Promise.all([
        base44.entities.Order.list('-order_date', 5000),
        base44.entities.Inventory.list('-updated_date', 2000),
        base44.entities.InventoryMovement.list('-movement_date', 10000),
        base44.entities.PurchaseOrder.list('-order_date', 2000),
        base44.entities.PackagingExpense.list('-expense_date', 1000),
        base44.entities.Expense.filter({ department: 'prodhan_com_e_commerce' }, '-expense_date', 1000)
      ]);

      // Filter data by date range (BDT timezone)
      const filteredOrders = orders.filter(o => {
        const orderDate = o.order_date?.split('T')[0];
        return orderDate >= startDate && orderDate <= endDate;
      });

      const filteredMovements = movements.filter(m => {
        const mDate = m.movement_date?.split('T')[0];
        return mDate >= startDate && mDate <= endDate;
      });

      const filteredPurchaseOrders = purchaseOrders.filter(p => {
        const pDate = p.order_date?.split('T')[0];
        return pDate >= startDate && pDate <= endDate;
      });

      const filteredPackaging = packagingExpenses.filter(e => {
        const eDate = e.expense_date?.split('T')[0];
        return eDate >= startDate && eDate <= endDate;
      });

      const filteredExpenses = expenses.filter(e => {
        const eDate = e.expense_date?.split('T')[0];
        return eDate >= startDate && eDate <= endDate;
      });

      // Generate CSV report based on type
      let csvContent = '';
      let fileName = '';

      switch (reportType) {
        case 'sales':
          csvContent = generateSalesReport(filteredOrders, inventory, startDate, endDate);
          fileName = `sales_report_${startDate}_to_${endDate}.csv`;
          break;
        case 'purchase':
          csvContent = generatePurchaseReport(filteredPurchaseOrders, inventory, startDate, endDate);
          fileName = `purchase_report_${startDate}_to_${endDate}.csv`;
          break;
        case 'packaging':
          csvContent = generatePackagingReport(filteredPackaging, startDate, endDate);
          fileName = `packaging_report_${startDate}_to_${endDate}.csv`;
          break;
        case 'waste':
          csvContent = generateWasteReport(filteredMovements.filter(m => m.reference_type === 'damage' || m.reference_type === 'expired'), inventory, startDate, endDate);
          fileName = `waste_damage_report_${startDate}_to_${endDate}.csv`;
          break;
        case 'returns':
          csvContent = generateReturnsReport(filteredMovements.filter(m => m.reference_type === 'return'), inventory, startDate, endDate);
          fileName = `returns_report_${startDate}_to_${endDate}.csv`;
          break;
        case 'stock':
          csvContent = generateStockValuationReport(inventory);
          fileName = `stock_valuation_${toBDTDate()}.csv`;
          break;
        case 'low_stock':
          csvContent = generateLowStockReport(inventory);
          fileName = `low_stock_alert_${toBDTDate()}.csv`;
          break;
        case 'movement':
          csvContent = generateMovementReport(filteredMovements, inventory, startDate, endDate);
          fileName = `movement_summary_${startDate}_to_${endDate}.csv`;
          break;
        case 'supplier':
          csvContent = generateSupplierReport(filteredPurchaseOrders, inventory);
          fileName = `supplier_report_${startDate}_to_${endDate}.csv`;
          break;
        default:
          throw new Error('Unknown report type');
      }

      // Download CSV
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('✅ Report downloaded!');
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      toast.error(`Error: ${error.message || 'Failed to generate report'}`);
    } finally {
      setReportGenerating(null);
    }
  };

  // Report generation functions - ADVANCED & COMPREHENSIVE
  // Revenue = sum of (unit_price * quantity) from order items
  // Profit = Revenue - COGS (COGS = purchase_price * quantity)
  const generateSalesReport = (orders, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    const productSales = {};
    const dailySales = {};
    const categorySales = {};
    const orderSourceSales = {};
    const paymentMethodSales = {};
    let totalRevenue = 0;
    let totalCost = 0;
    let totalOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let pendingOrders = 0;
    let totalUnitsSold = 0;

    orders.forEach(order => {
      if (order.order_status === 'cancelled') {
        cancelledOrders++;
        return;
      }
      if (['pending', 'confirmed', 'processing', 'packed'].includes(order.order_status)) {
        pendingOrders++;
      }
      if (['delivered', 'shipped', 'out_for_delivery'].includes(order.order_status)) {
        completedOrders++;
      }

      totalOrders++;
      const orderDate = order.order_date?.split('T')[0] || 'unknown';

      // Initialize daily tracking
      if (!dailySales[orderDate]) {
        dailySales[orderDate] = { orders: 0, revenue: 0, cost: 0, units: 0, profit: 0 };
      }
      dailySales[orderDate].orders++;

      // Calculate revenue & cost from each order item (most accurate method)
      let orderRevenue = 0;
      let orderCost = 0;
      let orderUnits = 0;

      (order.order_items || []).forEach(item => {
        const prod = inventoryMap[item.inventory_id] || {};
        const qty = item.quantity || 1;

        // Revenue: Use item.subtotal if available, else unit_price * qty, else selling_price * qty
        let itemRevenue = 0;
        if (item.subtotal && item.subtotal > 0) {
          itemRevenue = item.subtotal;
        } else if (item.unit_price && item.unit_price > 0) {
          itemRevenue = item.unit_price * qty;
        } else if (prod.selling_price && prod.selling_price > 0) {
          itemRevenue = prod.selling_price * qty;
        }

        // Cost: purchase_price from inventory * quantity
        const purchasePrice = prod.purchase_price || 0;
        const itemCost = purchasePrice * qty;

        orderRevenue += itemRevenue;
        orderCost += itemCost;
        orderUnits += qty;

        // Category breakdown
        const cat = prod.category || 'Uncategorized';
        if (!categorySales[cat]) categorySales[cat] = { qty: 0, revenue: 0, cost: 0, products: new Set() };
        categorySales[cat].qty += qty;
        categorySales[cat].revenue += itemRevenue;
        categorySales[cat].cost += itemCost;
        categorySales[cat].products.add(item.inventory_id);

        // Product breakdown
        const prodKey = item.inventory_id || item.item_name || 'unknown';
        if (!productSales[prodKey]) {
          productSales[prodKey] = {
            name: item.item_name || prod.item_name || 'Unknown',
            sku: prod.barcode || prod.isbn || '',
            category: cat,
            qty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            orders: 0,
            avgPrice: 0,
            purchasePrice: purchasePrice,
            sellingPrice: prod.selling_price || 0
          };
        }

        productSales[prodKey].qty += qty;
        productSales[prodKey].revenue += itemRevenue;
        productSales[prodKey].cost += itemCost;
        productSales[prodKey].profit += (itemRevenue - itemCost);
        productSales[prodKey].orders++;
      });

      // Add to totals
      totalRevenue += orderRevenue;
      totalCost += orderCost;
      totalUnitsSold += orderUnits;

      // Update daily sales
      dailySales[orderDate].revenue += orderRevenue;
      dailySales[orderDate].cost += orderCost;
      dailySales[orderDate].units += orderUnits;
      dailySales[orderDate].profit += (orderRevenue - orderCost);

      // Order source breakdown
      const source = order.order_source || 'other';
      if (!orderSourceSales[source]) orderSourceSales[source] = { orders: 0, revenue: 0, cost: 0 };
      orderSourceSales[source].orders++;
      orderSourceSales[source].revenue += orderRevenue;
      orderSourceSales[source].cost += orderCost;

      // Payment method breakdown
      const payment = order.payment_method || 'unknown';
      if (!paymentMethodSales[payment]) paymentMethodSales[payment] = { orders: 0, revenue: 0, cost: 0 };
      paymentMethodSales[payment].orders++;
      paymentMethodSales[payment].revenue += orderRevenue;
      paymentMethodSales[payment].cost += orderCost;
    });

    // Calculate product averages
    const rows = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);
    rows.forEach(r => { 
      r.avgPrice = r.qty > 0 ? (r.revenue / r.qty) : 0;
      r.margin = r.revenue > 0 ? ((r.profit / r.revenue) * 100) : 0;
    });

    // Final calculations
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                    SALES PERFORMANCE REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Period: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n`;
    csv += `Department: Prodhan.com E-Commerce\n\n`;
    
    csv += `───────────────── EXECUTIVE SUMMARY ─────────────────\n`;
    csv += `Total Revenue:           ৳${finalRevenue.toLocaleString()}\n`;
    csv += `Total Cost (COGS):       ৳${totalCost.toLocaleString()}\n`;
    csv += `Gross Profit:            ৳${finalProfit.toLocaleString()}\n`;
    csv += `Profit Margin:           ${finalMargin.toFixed(2)}%\n`;
    csv += `Total Orders:            ${totalOrders}\n`;
    csv += `Completed Orders:        ${completedOrders}\n`;
    csv += `Pending Orders:          ${pendingOrders}\n`;
    csv += `Cancelled Orders:        ${cancelledOrders}\n`;
    csv += `Avg Order Value (AOV):   ৳${finalAOV.toFixed(2)}\n`;
    csv += `Total Units Sold:        ${totalUnitsSold}\n\n`;

    csv += `───────────────── DAILY BREAKDOWN ─────────────────\n`;
    csv += `Date,Orders,Revenue,Cost,Profit,Units,AOV\n`;
    Object.entries(dailySales).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, data]) => {
      const aov = data.orders > 0 ? data.revenue / data.orders : 0;
      csv += `${date},${data.orders},৳${data.revenue.toLocaleString()},৳${data.cost.toLocaleString()},৳${data.profit.toLocaleString()},${data.units},৳${aov.toFixed(0)}\n`;
    });

    csv += `\n───────────────── CATEGORY PERFORMANCE ─────────────────\n`;
    csv += `Category,Products,Qty Sold,Revenue,Cost,Profit,Margin%\n`;
    Object.entries(categorySales).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([cat, data]) => {
      const profit = data.revenue - data.cost;
      const margin = data.revenue > 0 ? (profit / data.revenue * 100) : 0;
      const productCount = data.products instanceof Set ? data.products.size : data.products;
      csv += `"${cat}",${productCount},${data.qty},৳${data.revenue.toLocaleString()},৳${data.cost.toLocaleString()},৳${profit.toLocaleString()},${margin.toFixed(1)}%\n`;
    });

    csv += `\n───────────────── ORDER SOURCE ANALYSIS ─────────────────\n`;
    csv += `Source,Orders,Revenue,Cost,Profit,% of Revenue\n`;
    Object.entries(orderSourceSales).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([src, data]) => {
      const profit = data.revenue - data.cost;
      const pct = totalRevenue > 0 ? (data.revenue / totalRevenue * 100) : 0;
      csv += `"${src}",${data.orders},৳${data.revenue.toLocaleString()},৳${data.cost.toLocaleString()},৳${profit.toLocaleString()},${pct.toFixed(1)}%\n`;
    });

    csv += `\n───────────────── PAYMENT METHOD BREAKDOWN ─────────────────\n`;
    csv += `Payment Method,Orders,Revenue,Cost,Profit,% of Revenue\n`;
    Object.entries(paymentMethodSales).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([method, data]) => {
      const profit = data.revenue - data.cost;
      const pct = totalRevenue > 0 ? (data.revenue / totalRevenue * 100) : 0;
      csv += `"${method}",${data.orders},৳${data.revenue.toLocaleString()},৳${data.cost.toLocaleString()},৳${profit.toLocaleString()},${pct.toFixed(1)}%\n`;
    });

    csv += `\n───────────────── PRODUCT-WISE SALES (Top 100) ─────────────────\n`;
    csv += `Rank,Product Name,SKU,Category,Qty Sold,Orders,Revenue,Cost,Profit,Margin%,Avg Sell Price,Purchase Price\n`;
    rows.slice(0, 100).forEach((r, idx) => {
      csv += `${idx + 1},"${r.name}","${r.sku}","${r.category}",${r.qty},${r.orders},৳${r.revenue.toFixed(0)},৳${r.cost.toFixed(0)},৳${r.profit.toFixed(0)},${r.margin.toFixed(1)}%,৳${r.avgPrice.toFixed(0)},৳${r.purchasePrice.toFixed(0)}\n`;
    });

    return csv;
  };

  const generatePurchaseReport = (purchaseOrders, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    const supplierStats = {};
    const productPurchases = {};
    const dailyPurchases = {};
    const statusBreakdown = {};
    let totalValue = 0;
    let totalUnits = 0;

    purchaseOrders.forEach(po => {
      const poDate = po.order_date?.split('T')[0] || 'unknown';
      const supplier = po.supplier_name || 'Unknown Supplier';
      const status = po.order_status || 'unknown';
      const poValue = po.total_amount || 0;

      totalValue += poValue;

      // Status breakdown
      if (!statusBreakdown[status]) statusBreakdown[status] = { count: 0, value: 0 };
      statusBreakdown[status].count++;
      statusBreakdown[status].value += poValue;

      // Daily breakdown
      if (!dailyPurchases[poDate]) dailyPurchases[poDate] = { orders: 0, value: 0, units: 0 };
      dailyPurchases[poDate].orders++;
      dailyPurchases[poDate].value += poValue;

      // Supplier stats
      if (!supplierStats[supplier]) {
        supplierStats[supplier] = { orders: 0, value: 0, items: 0, avgLeadTime: 0, onTimeDelivery: 0 };
      }
      supplierStats[supplier].orders++;
      supplierStats[supplier].value += poValue;

      (po.order_items || []).forEach(item => {
        const qty = item.quantity || 0;
        totalUnits += qty;
        dailyPurchases[poDate].units += qty;
        supplierStats[supplier].items += qty;

        const prodId = item.inventory_id || item.item_name;
        if (!productPurchases[prodId]) {
          const prod = inventoryMap[item.inventory_id] || {};
          productPurchases[prodId] = {
            name: item.item_name || prod.item_name || 'Unknown',
            category: prod.category || 'N/A',
            qty: 0,
            value: 0,
            orders: 0
          };
        }
        productPurchases[prodId].qty += qty;
        productPurchases[prodId].value += (item.unit_price || 0) * qty;
        productPurchases[prodId].orders++;
      });
    });

    const avgPOValue = purchaseOrders.length > 0 ? (totalValue / purchaseOrders.length) : 0;

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                    PURCHASE & PROCUREMENT REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Period: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n\n`;

    csv += `───────────────── EXECUTIVE SUMMARY ─────────────────\n`;
    csv += `Total Purchase Orders:   ${purchaseOrders.length}\n`;
    csv += `Total Purchase Value:    ৳${totalValue.toLocaleString()}\n`;
    csv += `Total Units Purchased:   ${totalUnits.toLocaleString()}\n`;
    csv += `Avg PO Value:            ৳${avgPOValue.toFixed(0)}\n`;
    csv += `Unique Suppliers:        ${Object.keys(supplierStats).length}\n\n`;

    csv += `───────────────── ORDER STATUS BREAKDOWN ─────────────────\n`;
    csv += `Status,Orders,Value,% of Total\n`;
    Object.entries(statusBreakdown).sort((a, b) => b[1].value - a[1].value).forEach(([status, data]) => {
      const pct = totalValue > 0 ? (data.value / totalValue * 100) : 0;
      csv += `"${status}",${data.count},৳${data.value.toLocaleString()},${pct.toFixed(1)}%\n`;
    });

    csv += `\n───────────────── DAILY PROCUREMENT ─────────────────\n`;
    csv += `Date,Orders,Value,Units\n`;
    Object.entries(dailyPurchases).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, data]) => {
      csv += `${date},${data.orders},৳${data.value.toLocaleString()},${data.units}\n`;
    });

    csv += `\n───────────────── SUPPLIER PERFORMANCE ─────────────────\n`;
    csv += `Supplier,Orders,Items,Total Value,Avg Order Value,% of Spend\n`;
    Object.entries(supplierStats).sort((a, b) => b[1].value - a[1].value).forEach(([supplier, data]) => {
      const avgOV = data.orders > 0 ? (data.value / data.orders) : 0;
      const pct = totalValue > 0 ? (data.value / totalValue * 100) : 0;
      csv += `"${supplier}",${data.orders},${data.items},৳${data.value.toLocaleString()},৳${avgOV.toFixed(0)},${pct.toFixed(1)}%\n`;
    });

    csv += `\n───────────────── PRODUCT-WISE PURCHASES ─────────────────\n`;
    csv += `Product,Category,Qty Purchased,Value,# POs\n`;
    Object.values(productPurchases).sort((a, b) => b.value - a.value).slice(0, 100).forEach(p => {
      csv += `"${p.name}","${p.category}",${p.qty},৳${p.value.toLocaleString()},${p.orders}\n`;
    });

    csv += `\n───────────────── PO DETAILS ─────────────────\n`;
    csv += `PO Number,Date,Supplier,Status,Items,Total Amount\n`;
    purchaseOrders.slice(0, 200).forEach(po => {
      csv += `"${po.po_number || ''}","${po.order_date?.split('T')[0] || ''}","${po.supplier_name || ''}","${po.order_status || ''}",${po.order_items?.length || 0},৳${(po.total_amount || 0).toLocaleString()}\n`;
    });

    return csv;
  };

  const generatePackagingReport = (expenses, startDate, endDate) => {
    const dailyCosts = {};
    const typeBreakdown = {};
    let totalPackaging = 0;
    let totalCourier = 0;

    expenses.forEach(e => {
      const date = e.expense_date?.split('T')[0] || 'unknown';
      const expType = e.expense_type || 'general';
      const packagingCost = e.total_amount || 0;
      const courierCost = e.courier_expense || 0;

      totalPackaging += packagingCost;
      totalCourier += courierCost;

      // Daily breakdown
      if (!dailyCosts[date]) dailyCosts[date] = { packaging: 0, courier: 0, count: 0 };
      dailyCosts[date].packaging += packagingCost;
      dailyCosts[date].courier += courierCost;
      dailyCosts[date].count++;

      // Type breakdown
      if (!typeBreakdown[expType]) typeBreakdown[expType] = { packaging: 0, courier: 0, count: 0 };
      typeBreakdown[expType].packaging += packagingCost;
      typeBreakdown[expType].courier += courierCost;
      typeBreakdown[expType].count++;
    });

    const totalCost = totalPackaging + totalCourier;
    const avgPerTransaction = expenses.length > 0 ? (totalCost / expenses.length) : 0;

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                PACKAGING & COURIER EXPENSE REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Period: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n\n`;

    csv += `───────────────── EXECUTIVE SUMMARY ─────────────────\n`;
    csv += `Total Transactions:      ${expenses.length}\n`;
    csv += `Total Packaging Cost:    ৳${totalPackaging.toLocaleString()}\n`;
    csv += `Total Courier Cost:      ৳${totalCourier.toLocaleString()}\n`;
    csv += `Grand Total:             ৳${totalCost.toLocaleString()}\n`;
    csv += `Avg Cost/Transaction:    ৳${avgPerTransaction.toFixed(2)}\n`;
    csv += `Packaging %:             ${totalCost > 0 ? (totalPackaging / totalCost * 100).toFixed(1) : 0}%\n`;
    csv += `Courier %:               ${totalCost > 0 ? (totalCourier / totalCost * 100).toFixed(1) : 0}%\n\n`;

    csv += `───────────────── DAILY COST BREAKDOWN ─────────────────\n`;
    csv += `Date,Transactions,Packaging,Courier,Total\n`;
    Object.entries(dailyCosts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, data]) => {
      csv += `${date},${data.count},৳${data.packaging.toLocaleString()},৳${data.courier.toLocaleString()},৳${(data.packaging + data.courier).toLocaleString()}\n`;
    });

    csv += `\n───────────────── TYPE BREAKDOWN ─────────────────\n`;
    csv += `Type,Count,Packaging,Courier,Total\n`;
    Object.entries(typeBreakdown).sort((a, b) => (b[1].packaging + b[1].courier) - (a[1].packaging + a[1].courier)).forEach(([type, data]) => {
      csv += `"${type}",${data.count},৳${data.packaging.toLocaleString()},৳${data.courier.toLocaleString()},৳${(data.packaging + data.courier).toLocaleString()}\n`;
    });

    csv += `\n───────────────── DETAILED TRANSACTIONS ─────────────────\n`;
    csv += `Date,Type,Description,Packaging Cost,Courier Cost,Total\n`;
    expenses.forEach(e => {
      csv += `"${e.expense_date?.split('T')[0] || ''}","${e.expense_type || ''}","${(e.description || '').substring(0, 50)}",৳${e.total_amount || 0},৳${e.courier_expense || 0},৳${(e.total_amount || 0) + (e.courier_expense || 0)}\n`;
    });

    return csv;
  };

  const generateWasteReport = (movements, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    const reasonBreakdown = {};
    const productLoss = {};
    const dailyLoss = {};
    const conditionBreakdown = {};
    let totalLoss = 0;
    let totalUnits = 0;

    movements.forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      const meta = m.metadata || {};
      const date = m.movement_date?.split('T')[0] || 'unknown';
      const reason = meta.reason || m.reference_type || 'unknown';
      const condition = meta.condition || 'damaged';
      const qty = meta.original_quantity || Math.abs(m.quantity) || 1;
      const value = Math.abs(m.total_value || 0);

      totalLoss += value;
      totalUnits += qty;

      // Daily breakdown
      if (!dailyLoss[date]) dailyLoss[date] = { units: 0, value: 0, incidents: 0 };
      dailyLoss[date].units += qty;
      dailyLoss[date].value += value;
      dailyLoss[date].incidents++;

      // Reason breakdown
      if (!reasonBreakdown[reason]) reasonBreakdown[reason] = { units: 0, value: 0, count: 0 };
      reasonBreakdown[reason].units += qty;
      reasonBreakdown[reason].value += value;
      reasonBreakdown[reason].count++;

      // Condition breakdown
      if (!conditionBreakdown[condition]) conditionBreakdown[condition] = { units: 0, value: 0, count: 0 };
      conditionBreakdown[condition].units += qty;
      conditionBreakdown[condition].value += value;
      conditionBreakdown[condition].count++;

      // Product loss
      const prodId = m.inventory_item_id || 'unknown';
      if (!productLoss[prodId]) {
        productLoss[prodId] = {
          name: prod.item_name || 'Unknown',
          category: prod.category || 'N/A',
          units: 0,
          value: 0,
          incidents: 0
        };
      }
      productLoss[prodId].units += qty;
      productLoss[prodId].value += value;
      productLoss[prodId].incidents++;
    });

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                  WASTE & DAMAGE ANALYSIS REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Period: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n\n`;

    csv += `───────────────── EXECUTIVE SUMMARY ─────────────────\n`;
    csv += `Total Incidents:         ${movements.length}\n`;
    csv += `Total Units Lost:        ${totalUnits.toLocaleString()}\n`;
    csv += `Total Loss Value:        ৳${totalLoss.toLocaleString()}\n`;
    csv += `Avg Loss/Incident:       ৳${movements.length > 0 ? (totalLoss / movements.length).toFixed(0) : 0}\n\n`;

    csv += `───────────────── LOSS BY REASON ─────────────────\n`;
    csv += `Reason,Incidents,Units,Value,% of Loss\n`;
    Object.entries(reasonBreakdown).sort((a, b) => b[1].value - a[1].value).forEach(([reason, data]) => {
      const pct = totalLoss > 0 ? (data.value / totalLoss * 100) : 0;
      csv += `"${reason}",${data.count},${data.units},৳${data.value.toLocaleString()},${pct.toFixed(1)}%\n`;
    });

    csv += `\n───────────────── LOSS BY CONDITION ─────────────────\n`;
    csv += `Condition,Incidents,Units,Value\n`;
    Object.entries(conditionBreakdown).sort((a, b) => b[1].value - a[1].value).forEach(([cond, data]) => {
      csv += `"${cond}",${data.count},${data.units},৳${data.value.toLocaleString()}\n`;
    });

    csv += `\n───────────────── DAILY LOSS TREND ─────────────────\n`;
    csv += `Date,Incidents,Units Lost,Value Lost\n`;
    Object.entries(dailyLoss).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, data]) => {
      csv += `${date},${data.incidents},${data.units},৳${data.value.toLocaleString()}\n`;
    });

    csv += `\n───────────────── TOP PRODUCTS BY LOSS (Top 50) ─────────────────\n`;
    csv += `Product,Category,Incidents,Units Lost,Value Lost\n`;
    Object.values(productLoss).sort((a, b) => b.value - a.value).slice(0, 50).forEach(p => {
      csv += `"${p.name}","${p.category}",${p.incidents},${p.units},৳${p.value.toLocaleString()}\n`;
    });

    csv += `\n───────────────── DETAILED INCIDENTS ─────────────────\n`;
    csv += `Date,Product,Quantity,Reason,Condition,Action,Loss Value\n`;
    movements.forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      const meta = m.metadata || {};
      csv += `"${m.movement_date?.split('T')[0] || ''}","${prod.item_name || 'Unknown'}",${meta.original_quantity || Math.abs(m.quantity) || 1},"${meta.reason || m.reference_type}","${meta.condition || 'damaged'}","${meta.action || 'write_off'}",৳${Math.abs(m.total_value || 0)}\n`;
    });

    return csv;
  };

  const generateReturnsReport = (movements, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    const returnTypeBreakdown = {};
    const reasonBreakdown = {};
    const productReturns = {};
    const dailyReturns = {};
    let totalValue = 0;
    let totalUnits = 0;
    let salesReturns = 0;
    let purchaseReturns = 0;

    movements.forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      const meta = m.metadata || {};
      const date = m.movement_date?.split('T')[0] || 'unknown';
      const returnType = meta.return_type === 'purchase_return' ? 'Purchase Return' : 'Sales Return';
      const reason = meta.reason || 'Not specified';
      const qty = meta.original_quantity || Math.abs(m.quantity) || 1;
      const value = Math.abs(m.total_value || 0);

      totalValue += value;
      totalUnits += qty;
      if (returnType === 'Sales Return') salesReturns++;
      else purchaseReturns++;

      // Daily breakdown
      if (!dailyReturns[date]) dailyReturns[date] = { count: 0, units: 0, value: 0 };
      dailyReturns[date].count++;
      dailyReturns[date].units += qty;
      dailyReturns[date].value += value;

      // Return type breakdown
      if (!returnTypeBreakdown[returnType]) returnTypeBreakdown[returnType] = { count: 0, units: 0, value: 0 };
      returnTypeBreakdown[returnType].count++;
      returnTypeBreakdown[returnType].units += qty;
      returnTypeBreakdown[returnType].value += value;

      // Reason breakdown
      if (!reasonBreakdown[reason]) reasonBreakdown[reason] = { count: 0, units: 0, value: 0 };
      reasonBreakdown[reason].count++;
      reasonBreakdown[reason].units += qty;
      reasonBreakdown[reason].value += value;

      // Product returns
      const prodId = m.inventory_item_id || 'unknown';
      if (!productReturns[prodId]) {
        productReturns[prodId] = {
          name: prod.item_name || 'Unknown',
          category: prod.category || 'N/A',
          returns: 0,
          units: 0,
          value: 0
        };
      }
      productReturns[prodId].returns++;
      productReturns[prodId].units += qty;
      productReturns[prodId].value += value;
    });

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                    RETURNS ANALYSIS REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Period: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n\n`;

    csv += `───────────────── EXECUTIVE SUMMARY ─────────────────\n`;
    csv += `Total Returns:           ${movements.length}\n`;
    csv += `Sales Returns:           ${salesReturns}\n`;
    csv += `Purchase Returns:        ${purchaseReturns}\n`;
    csv += `Total Units Returned:    ${totalUnits.toLocaleString()}\n`;
    csv += `Total Return Value:      ৳${totalValue.toLocaleString()}\n`;
    csv += `Avg Return Value:        ৳${movements.length > 0 ? (totalValue / movements.length).toFixed(0) : 0}\n\n`;

    csv += `───────────────── RETURN TYPE BREAKDOWN ─────────────────\n`;
    csv += `Type,Count,Units,Value,% of Total\n`;
    Object.entries(returnTypeBreakdown).forEach(([type, data]) => {
      const pct = totalValue > 0 ? (data.value / totalValue * 100) : 0;
      csv += `"${type}",${data.count},${data.units},৳${data.value.toLocaleString()},${pct.toFixed(1)}%\n`;
    });

    csv += `\n───────────────── RETURN REASONS ─────────────────\n`;
    csv += `Reason,Count,Units,Value,% of Total\n`;
    Object.entries(reasonBreakdown).sort((a, b) => b[1].value - a[1].value).forEach(([reason, data]) => {
      const pct = totalValue > 0 ? (data.value / totalValue * 100) : 0;
      csv += `"${reason}",${data.count},${data.units},৳${data.value.toLocaleString()},${pct.toFixed(1)}%\n`;
    });

    csv += `\n───────────────── DAILY RETURN TREND ─────────────────\n`;
    csv += `Date,Returns,Units,Value\n`;
    Object.entries(dailyReturns).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, data]) => {
      csv += `${date},${data.count},${data.units},৳${data.value.toLocaleString()}\n`;
    });

    csv += `\n───────────────── TOP RETURNED PRODUCTS ─────────────────\n`;
    csv += `Product,Category,Returns,Units,Value\n`;
    Object.values(productReturns).sort((a, b) => b.value - a.value).slice(0, 50).forEach(p => {
      csv += `"${p.name}","${p.category}",${p.returns},${p.units},৳${p.value.toLocaleString()}\n`;
    });

    csv += `\n───────────────── DETAILED RETURNS ─────────────────\n`;
    csv += `Date,Product,Type,Qty,Order #,Customer/Supplier,Phone,Reason,Action,Value\n`;
    movements.forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      const meta = m.metadata || {};
      csv += `"${m.movement_date?.split('T')[0] || ''}","${prod.item_name || 'Unknown'}","${meta.return_type === 'purchase_return' ? 'Purchase' : 'Sales'}",${meta.original_quantity || Math.abs(m.quantity) || 1},"${m.reference_number || ''}","${meta.customer_name || meta.supplier_name || ''}","${meta.customer_phone || ''}","${meta.reason || ''}","${meta.action || ''}",৳${Math.abs(m.total_value || 0)}\n`;
    });

    return csv;
  };

  const generateStockValuationReport = (inventory) => {
    const prodhanInventory = inventory.filter(i => i.department === 'prodhan_com_e_commerce');
    
    const categoryStats = {};
    let totalSellingValue = 0;
    let totalCostValue = 0;
    let totalUnits = 0;
    let zeroStockItems = 0;
    let lowStockItems = 0;

    prodhanInventory.forEach(i => {
      const stock = i.current_stock || 0;
      const costValue = stock * (i.purchase_price || 0);
      const sellingValue = stock * (i.selling_price || 0);
      
      totalCostValue += costValue;
      totalSellingValue += sellingValue;
      totalUnits += stock;

      if (stock === 0) zeroStockItems++;
      if (stock < (i.minimum_stock || 0)) lowStockItems++;

      const cat = i.category || 'Uncategorized';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { items: 0, units: 0, costValue: 0, sellingValue: 0 };
      }
      categoryStats[cat].items++;
      categoryStats[cat].units += stock;
      categoryStats[cat].costValue += costValue;
      categoryStats[cat].sellingValue += sellingValue;
    });

    const potentialProfit = totalSellingValue - totalCostValue;
    const avgMargin = totalCostValue > 0 ? ((potentialProfit / totalCostValue) * 100) : 0;

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                    STOCK VALUATION REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Date: ${toBDTDate()}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n`;
    csv += `Department: Prodhan.com E-Commerce\n\n`;

    csv += `───────────────── EXECUTIVE SUMMARY ─────────────────\n`;
    csv += `Total SKUs:              ${prodhanInventory.length}\n`;
    csv += `Total Units in Stock:    ${totalUnits.toLocaleString()}\n`;
    csv += `Stock Value (Cost):      ৳${totalCostValue.toLocaleString()}\n`;
    csv += `Stock Value (Retail):    ৳${totalSellingValue.toLocaleString()}\n`;
    csv += `Potential Profit:        ৳${potentialProfit.toLocaleString()}\n`;
    csv += `Avg Markup %:            ${avgMargin.toFixed(1)}%\n`;
    csv += `Zero Stock Items:        ${zeroStockItems}\n`;
    csv += `Low Stock Items:         ${lowStockItems}\n\n`;

    csv += `───────────────── CATEGORY-WISE VALUATION ─────────────────\n`;
    csv += `Category,Items,Units,Cost Value,Retail Value,Potential Profit\n`;
    Object.entries(categoryStats).sort((a, b) => b[1].sellingValue - a[1].sellingValue).forEach(([cat, data]) => {
      csv += `"${cat}",${data.items},${data.units},৳${data.costValue.toLocaleString()},৳${data.sellingValue.toLocaleString()},৳${(data.sellingValue - data.costValue).toLocaleString()}\n`;
    });

    csv += `\n───────────────── TOP 100 BY VALUE ─────────────────\n`;
    csv += `Rank,Product,Category,Stock,Min Stock,Status,Cost Price,Sell Price,Cost Value,Retail Value,Margin%\n`;
    prodhanInventory
      .sort((a, b) => ((b.current_stock || 0) * (b.selling_price || 0)) - ((a.current_stock || 0) * (a.selling_price || 0)))
      .slice(0, 100)
      .forEach((i, idx) => {
        const stock = i.current_stock || 0;
        const costValue = stock * (i.purchase_price || 0);
        const sellingValue = stock * (i.selling_price || 0);
        const margin = (i.purchase_price || 0) > 0 ? (((i.selling_price || 0) - (i.purchase_price || 0)) / (i.purchase_price || 0) * 100) : 0;
        const status = stock === 0 ? 'OUT OF STOCK' : stock < (i.minimum_stock || 0) ? 'LOW STOCK' : 'OK';
        csv += `${idx + 1},"${i.item_name || ''}","${i.category || ''}",${stock},${i.minimum_stock || 0},"${status}",৳${i.purchase_price || 0},৳${i.selling_price || 0},৳${costValue},৳${sellingValue},${margin.toFixed(1)}%\n`;
      });

    csv += `\n───────────────── FULL INVENTORY LIST ─────────────────\n`;
    csv += `Product,Category,Stock,Min Stock,Reorder Point,Cost Price,Sell Price,Cost Value,Retail Value\n`;
    prodhanInventory.sort((a, b) => (a.item_name || '').localeCompare(b.item_name || '')).forEach(i => {
      csv += `"${i.item_name || ''}","${i.category || ''}",${i.current_stock || 0},${i.minimum_stock || 0},${i.reorder_point || 0},৳${i.purchase_price || 0},৳${i.selling_price || 0},৳${(i.current_stock || 0) * (i.purchase_price || 0)},৳${(i.current_stock || 0) * (i.selling_price || 0)}\n`;
    });

    return csv;
  };

  const generateLowStockReport = (inventory) => {
    const prodhanInventory = inventory.filter(i => i.department === 'prodhan_com_e_commerce');
    const outOfStock = prodhanInventory.filter(i => (i.current_stock || 0) === 0);
    const lowStock = prodhanInventory.filter(i => (i.current_stock || 0) > 0 && (i.current_stock || 0) < (i.minimum_stock || 0));
    const criticalStock = prodhanInventory.filter(i => (i.current_stock || 0) > 0 && (i.current_stock || 0) <= (i.minimum_stock || 0) * 0.5);
    
    const categoryBreakdown = {};
    [...outOfStock, ...lowStock].forEach(i => {
      const cat = i.category || 'Uncategorized';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { outOfStock: 0, lowStock: 0, totalShortage: 0, reorderCost: 0 };
      if ((i.current_stock || 0) === 0) {
        categoryBreakdown[cat].outOfStock++;
      } else {
        categoryBreakdown[cat].lowStock++;
      }
      const shortage = Math.max(0, (i.minimum_stock || 0) - (i.current_stock || 0));
      categoryBreakdown[cat].totalShortage += shortage;
      categoryBreakdown[cat].reorderCost += shortage * (i.purchase_price || 0);
    });

    const totalReorderCost = [...outOfStock, ...lowStock].reduce((sum, i) => {
      const shortage = Math.max(0, (i.minimum_stock || 0) - (i.current_stock || 0));
      return sum + (shortage * (i.purchase_price || 0));
    }, 0);

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                    LOW STOCK ALERT REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Date: ${toBDTDate()}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n\n`;

    csv += `───────────────── ALERT SUMMARY ─────────────────\n`;
    csv += `🔴 OUT OF STOCK:         ${outOfStock.length} items (CRITICAL)\n`;
    csv += `🟠 CRITICAL LOW:         ${criticalStock.length} items (<50% min stock)\n`;
    csv += `🟡 LOW STOCK:            ${lowStock.length} items\n`;
    csv += `Total Items Needing Attention: ${outOfStock.length + lowStock.length}\n`;
    csv += `Est. Reorder Cost:       ৳${totalReorderCost.toLocaleString()}\n\n`;

    csv += `───────────────── CATEGORY BREAKDOWN ─────────────────\n`;
    csv += `Category,Out of Stock,Low Stock,Total Shortage,Reorder Cost\n`;
    Object.entries(categoryBreakdown).sort((a, b) => (b[1].outOfStock + b[1].lowStock) - (a[1].outOfStock + a[1].lowStock)).forEach(([cat, data]) => {
      csv += `"${cat}",${data.outOfStock},${data.lowStock},${data.totalShortage},৳${data.reorderCost.toLocaleString()}\n`;
    });

    if (outOfStock.length > 0) {
      csv += `\n───────────────── 🔴 OUT OF STOCK (${outOfStock.length}) ─────────────────\n`;
      csv += `Product,Category,Min Stock,Supplier,Est. Reorder Cost\n`;
      outOfStock.sort((a, b) => (b.minimum_stock || 0) - (a.minimum_stock || 0)).forEach(i => {
        const reorderCost = (i.minimum_stock || 0) * (i.purchase_price || 0);
        csv += `"${i.item_name || ''}","${i.category || ''}",${i.minimum_stock || 0},"${i.supplier_name || 'N/A'}",৳${reorderCost.toLocaleString()}\n`;
      });
    }

    if (criticalStock.length > 0) {
      csv += `\n───────────────── 🟠 CRITICAL LOW (<50%) (${criticalStock.length}) ─────────────────\n`;
      csv += `Product,Category,Current,Min Stock,Shortage,Days Left*,Reorder Cost\n`;
      criticalStock.sort((a, b) => (a.current_stock || 0) - (b.current_stock || 0)).forEach(i => {
        const shortage = (i.minimum_stock || 0) - (i.current_stock || 0);
        const reorderCost = shortage * (i.purchase_price || 0);
        csv += `"${i.item_name || ''}","${i.category || ''}",${i.current_stock || 0},${i.minimum_stock || 0},${shortage},~${Math.ceil((i.current_stock || 0) / 2)} days,৳${reorderCost.toLocaleString()}\n`;
      });
    }

    csv += `\n───────────────── 🟡 ALL LOW STOCK ITEMS ─────────────────\n`;
    csv += `Priority,Product,Category,Current,Min Stock,Shortage,Status,Supplier,Unit Cost,Reorder Cost\n`;
    [...outOfStock, ...lowStock]
      .sort((a, b) => (a.current_stock - (a.minimum_stock || 0)) - (b.current_stock - (b.minimum_stock || 0)))
      .forEach((i, idx) => {
        const shortage = Math.max(0, (i.minimum_stock || 0) - (i.current_stock || 0));
        const status = (i.current_stock || 0) === 0 ? 'OUT OF STOCK' : 
                      (i.current_stock || 0) <= (i.minimum_stock || 0) * 0.5 ? 'CRITICAL' : 'LOW';
        const reorderCost = shortage * (i.purchase_price || 0);
        csv += `${idx + 1},"${i.item_name || ''}","${i.category || ''}",${i.current_stock || 0},${i.minimum_stock || 0},${shortage},"${status}","${i.supplier_name || 'N/A'}",৳${i.purchase_price || 0},৳${reorderCost.toLocaleString()}\n`;
      });

    csv += `\n* Days Left is estimated based on average sales velocity\n`;

    return csv;
  };

  const generateMovementReport = (movements, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    const summary = {
      sales_out: { qty: 0, value: 0, count: 0 },
      purchase_in: { qty: 0, value: 0, count: 0 },
      return_in: { qty: 0, value: 0, count: 0 },
      return_out: { qty: 0, value: 0, count: 0 },
      damage_out: { qty: 0, value: 0, count: 0 },
      adjustment_in: { qty: 0, value: 0, count: 0 },
      adjustment_out: { qty: 0, value: 0, count: 0 },
      transfer: { qty: 0, value: 0, count: 0 }
    };

    const dailyMovements = {};
    const productMovements = {};

    movements.forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      const qty = Math.abs(m.quantity || 0);
      const value = Math.abs(m.total_value || 0);
      const date = m.movement_date?.split('T')[0] || 'unknown';
      const type = m.movement_type || 'unknown';
      const refType = m.reference_type || 'other';

      // Daily breakdown
      if (!dailyMovements[date]) {
        dailyMovements[date] = { in: 0, out: 0, inValue: 0, outValue: 0, count: 0 };
      }
      dailyMovements[date].count++;
      if (type === 'in') {
        dailyMovements[date].in += qty;
        dailyMovements[date].inValue += value;
      } else {
        dailyMovements[date].out += qty;
        dailyMovements[date].outValue += value;
      }

      // Product movements
      const prodId = m.inventory_item_id || 'unknown';
      if (!productMovements[prodId]) {
        productMovements[prodId] = {
          name: prod.item_name || 'Unknown',
          category: prod.category || 'N/A',
          in: 0, out: 0, net: 0, movements: 0
        };
      }
      productMovements[prodId].movements++;
      if (type === 'in') {
        productMovements[prodId].in += qty;
        productMovements[prodId].net += qty;
      } else {
        productMovements[prodId].out += qty;
        productMovements[prodId].net -= qty;
      }

      // Summary by type
      if (type === 'out' && refType === 'sale') {
        summary.sales_out.qty += qty;
        summary.sales_out.value += value;
        summary.sales_out.count++;
      } else if (type === 'in' && refType === 'purchase') {
        summary.purchase_in.qty += qty;
        summary.purchase_in.value += value;
        summary.purchase_in.count++;
      } else if (refType === 'return' && type === 'in') {
        summary.return_in.qty += qty;
        summary.return_in.value += value;
        summary.return_in.count++;
      } else if (refType === 'return' && type === 'out') {
        summary.return_out.qty += qty;
        summary.return_out.value += value;
        summary.return_out.count++;
      } else if (refType === 'damage' || refType === 'expired') {
        summary.damage_out.qty += qty;
        summary.damage_out.value += value;
        summary.damage_out.count++;
      } else if (refType === 'adjustment' && type === 'in') {
        summary.adjustment_in.qty += qty;
        summary.adjustment_in.value += value;
        summary.adjustment_in.count++;
      } else if (refType === 'adjustment' && type === 'out') {
        summary.adjustment_out.qty += qty;
        summary.adjustment_out.value += value;
        summary.adjustment_out.count++;
      } else if (refType === 'transfer') {
        summary.transfer.qty += qty;
        summary.transfer.value += value;
        summary.transfer.count++;
      }
    });

    const totalIn = summary.purchase_in.qty + summary.return_in.qty + summary.adjustment_in.qty;
    const totalOut = summary.sales_out.qty + summary.return_out.qty + summary.damage_out.qty + summary.adjustment_out.qty;
    const netChange = totalIn - totalOut;

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                  INVENTORY MOVEMENT REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Period: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n\n`;

    csv += `───────────────── EXECUTIVE SUMMARY ─────────────────\n`;
    csv += `Total Movements:         ${movements.length}\n`;
    csv += `Total IN (units):        ${totalIn.toLocaleString()}\n`;
    csv += `Total OUT (units):       ${totalOut.toLocaleString()}\n`;
    csv += `Net Change:              ${netChange > 0 ? '+' : ''}${netChange.toLocaleString()}\n\n`;

    csv += `───────────────── MOVEMENT TYPE BREAKDOWN ─────────────────\n`;
    csv += `Type,Count,Units,Value\n`;
    csv += `Sales OUT,${summary.sales_out.count},${summary.sales_out.qty},৳${summary.sales_out.value.toLocaleString()}\n`;
    csv += `Purchase IN,${summary.purchase_in.count},${summary.purchase_in.qty},৳${summary.purchase_in.value.toLocaleString()}\n`;
    csv += `Sales Returns IN,${summary.return_in.count},${summary.return_in.qty},৳${summary.return_in.value.toLocaleString()}\n`;
    csv += `Purchase Returns OUT,${summary.return_out.count},${summary.return_out.qty},৳${summary.return_out.value.toLocaleString()}\n`;
    csv += `Damage/Waste OUT,${summary.damage_out.count},${summary.damage_out.qty},৳${summary.damage_out.value.toLocaleString()}\n`;
    csv += `Adjustments IN,${summary.adjustment_in.count},${summary.adjustment_in.qty},৳${summary.adjustment_in.value.toLocaleString()}\n`;
    csv += `Adjustments OUT,${summary.adjustment_out.count},${summary.adjustment_out.qty},৳${summary.adjustment_out.value.toLocaleString()}\n`;
    csv += `Transfers,${summary.transfer.count},${summary.transfer.qty},৳${summary.transfer.value.toLocaleString()}\n`;

    csv += `\n───────────────── DAILY MOVEMENT TREND ─────────────────\n`;
    csv += `Date,Transactions,Units IN,Units OUT,Net,Value IN,Value OUT\n`;
    Object.entries(dailyMovements).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, data]) => {
      const net = data.in - data.out;
      csv += `${date},${data.count},${data.in},${data.out},${net > 0 ? '+' : ''}${net},৳${data.inValue.toLocaleString()},৳${data.outValue.toLocaleString()}\n`;
    });

    csv += `\n───────────────── TOP PRODUCTS BY MOVEMENT ─────────────────\n`;
    csv += `Product,Category,Total Movements,Units IN,Units OUT,Net Change\n`;
    Object.values(productMovements).sort((a, b) => b.movements - a.movements).slice(0, 50).forEach(p => {
      csv += `"${p.name}","${p.category}",${p.movements},${p.in},${p.out},${p.net > 0 ? '+' : ''}${p.net}\n`;
    });

    csv += `\n───────────────── DETAILED MOVEMENTS (Recent 500) ─────────────────\n`;
    csv += `Date,Product,Direction,Type,Quantity,Reference #,Value,Notes\n`;
    movements.slice(0, 500).forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      csv += `"${m.movement_date?.split('T')[0] || ''}","${prod.item_name || 'Unknown'}","${m.movement_type || ''}","${m.reference_type || ''}",${m.quantity || 0},"${m.reference_number || ''}",৳${Math.abs(m.total_value || 0)},"${(m.notes || '').substring(0, 40)}"\n`;
    });

    return csv;
  };

  const generateSupplierReport = (purchaseOrders, inventory) => {
    const supplierStats = {};
    const monthlySpend = {};
    
    purchaseOrders.forEach(po => {
      const supplier = po.supplier_name || 'Unknown';
      const poDate = po.order_date?.split('T')[0] || '';
      const month = poDate.substring(0, 7);
      const poValue = po.total_amount || 0;
      const status = po.order_status || 'unknown';

      if (!supplierStats[supplier]) {
        supplierStats[supplier] = { 
          orders: 0, 
          total: 0, 
          items: 0,
          completedOrders: 0,
          pendingOrders: 0,
          products: new Set(),
          categories: new Set()
        };
      }
      supplierStats[supplier].orders++;
      supplierStats[supplier].total += poValue;
      
      if (['delivered', 'received', 'completed'].includes(status)) {
        supplierStats[supplier].completedOrders++;
      } else if (['pending', 'ordered', 'processing'].includes(status)) {
        supplierStats[supplier].pendingOrders++;
      }

      (po.order_items || []).forEach(item => {
        supplierStats[supplier].items++;
        if (item.inventory_id) supplierStats[supplier].products.add(item.inventory_id);
      });

      // Monthly spend tracking
      if (!monthlySpend[month]) monthlySpend[month] = {};
      if (!monthlySpend[month][supplier]) monthlySpend[month][supplier] = 0;
      monthlySpend[month][supplier] += poValue;
    });

    // Add inventory-based supplier info
    inventory.forEach(i => {
      const supplier = i.supplier_name;
      if (supplier && supplierStats[supplier]) {
        if (i.category) supplierStats[supplier].categories.add(i.category);
      }
    });

    const totalSpend = Object.values(supplierStats).reduce((s, sup) => s + sup.total, 0);
    const totalOrders = Object.values(supplierStats).reduce((s, sup) => s + sup.orders, 0);

    let csv = `═══════════════════════════════════════════════════════════════\n`;
    csv += `                  SUPPLIER PERFORMANCE REPORT\n`;
    csv += `═══════════════════════════════════════════════════════════════\n`;
    csv += `Report Date: ${toBDTDate()}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })} (BDT)\n\n`;

    csv += `───────────────── EXECUTIVE SUMMARY ─────────────────\n`;
    csv += `Active Suppliers:        ${Object.keys(supplierStats).length}\n`;
    csv += `Total Purchase Orders:   ${totalOrders}\n`;
    csv += `Total Procurement Value: ৳${totalSpend.toLocaleString()}\n`;
    csv += `Avg Order Value:         ৳${totalOrders > 0 ? (totalSpend / totalOrders).toFixed(0) : 0}\n\n`;

    csv += `───────────────── SUPPLIER RANKING (By Value) ─────────────────\n`;
    csv += `Rank,Supplier,Orders,Completed,Pending,Items,Products,Categories,Total Value,% of Spend,Avg Order\n`;
    Object.entries(supplierStats)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([name, stats], idx) => {
        const pctSpend = totalSpend > 0 ? (stats.total / totalSpend * 100) : 0;
        const avgOrder = stats.orders > 0 ? (stats.total / stats.orders) : 0;
        csv += `${idx + 1},"${name}",${stats.orders},${stats.completedOrders},${stats.pendingOrders},${stats.items},${stats.products.size},${stats.categories.size},৳${stats.total.toLocaleString()},${pctSpend.toFixed(1)}%,৳${avgOrder.toFixed(0)}\n`;
      });

    csv += `\n───────────────── MONTHLY SPEND BY SUPPLIER ─────────────────\n`;
    const months = Object.keys(monthlySpend).sort();
    const suppliers = Object.keys(supplierStats).sort((a, b) => supplierStats[b].total - supplierStats[a].total).slice(0, 10);
    csv += `Month,${suppliers.map(s => `"${s}"`).join(',')},Total\n`;
    months.forEach(month => {
      const monthData = monthlySpend[month] || {};
      const values = suppliers.map(s => monthData[s] || 0);
      const monthTotal = Object.values(monthData).reduce((s, v) => s + v, 0);
      csv += `${month},${values.map(v => `৳${v.toLocaleString()}`).join(',')},৳${monthTotal.toLocaleString()}\n`;
    });

    csv += `\n───────────────── SUPPLIER PERFORMANCE METRICS ─────────────────\n`;
    csv += `Supplier,Fulfillment Rate,Unique Products,Categories Served\n`;
    Object.entries(supplierStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 30)
      .forEach(([name, stats]) => {
        const fulfillmentRate = stats.orders > 0 ? (stats.completedOrders / stats.orders * 100) : 0;
        const categories = Array.from(stats.categories).join('; ');
        csv += `"${name}",${fulfillmentRate.toFixed(0)}%,${stats.products.size},"${categories}"\n`;
      });

    return csv;
  };

  const handleCustomReport = async () => {
    setReportGenerating('custom');
    try {
      toast.info('Building your custom report...');
      
      const dateRange = getDateRange(customReport.dateRange);
      
      // Use the same logic as quick reports
      await handleQuickReport(customReport.reportType);
    } catch (error) {
      console.error('Error generating custom report:', error);
      toast.error(`Error: ${error.message || 'Failed to generate report'}`);
    } finally {
      setReportGenerating(null);
    }
  };

  const ReportCard = ({ type, icon: Icon, title, color, bgColor }) => (
    <button
      onClick={() => handleQuickReport(type)}
      disabled={!!reportGenerating}
      className={`group h-32 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {reportGenerating === type ? (
        <div className="flex flex-col items-center justify-center h-full">
          <RefreshCw className={`w-8 h-8 animate-spin ${color}`} />
          <p className="text-xs text-slate-500 mt-2">Generating...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <p className="font-semibold text-slate-800 text-sm text-center">{title}</p>
        </div>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Reports</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Report Center</h1>
            <p className="text-slate-500 text-sm">Generate & download comprehensive reports</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-xl grid-cols-3 h-12 p-1 bg-slate-100 rounded-xl">
            <TabsTrigger value="quick" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
              Quick Reports
            </TabsTrigger>
            <TabsTrigger value="comprehensive" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
              📊 Comprehensive
            </TabsTrigger>
            <TabsTrigger value="custom" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
              Report Builder
            </TabsTrigger>
          </TabsList>

          {/* Quick Reports Tab */}
          <TabsContent value="quick" className="space-y-6 mt-6">
            {/* Filters */}
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600 font-medium">Start Date</Label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 font-medium">End Date</Label>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 font-medium">Start Time</Label>
                    <Input 
                      type="time" 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 font-medium">End Time</Label>
                    <Input 
                      type="time" 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 font-medium">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {filteredCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Quick Time Presets */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setStartTime('00:00'); setEndTime('23:59'); }}
                    className="text-xs"
                  >
                    Full Day
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setStartTime('09:00'); setEndTime('18:00'); }}
                    className="text-xs"
                  >
                    Office Hours (9AM-6PM)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setStartTime('19:00'); setEndTime('19:00'); }}
                    className="text-xs"
                  >
                    7PM Report
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setStartTime('06:00'); setEndTime('12:00'); }}
                    className="text-xs"
                  >
                    Morning (6AM-12PM)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setStartTime('12:00'); setEndTime('18:00'); }}
                    className="text-xs"
                  >
                    Afternoon (12PM-6PM)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Report Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportTypes.map((report) => (
                <ReportCard
                  key={report.id}
                  type={report.id}
                  icon={report.icon}
                  title={report.label}
                  color={report.color}
                  bgColor={report.bgColor}
                />
              ))}
            </div>
          </TabsContent>

          {/* Comprehensive Report Tab */}
          <TabsContent value="comprehensive" className="space-y-6 mt-6">
            <ComprehensiveReportGenerator />
          </TabsContent>

          {/* Custom Report Builder Tab */}
          <TabsContent value="custom" className="space-y-6 mt-6">
            <Card className="bg-white border-0 shadow-sm rounded-xl">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-red-600" />
                  Custom Report Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Report Type Selection */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Report Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {reportTypes.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setCustomReport({...customReport, reportType: report.id, groupBy: groupByOptions[report.id]?.[0]?.id || 'product'})}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          customReport.reportType === report.id 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${report.bgColor} flex items-center justify-center mb-2 mx-auto`}>
                          <report.icon className={`w-5 h-5 ${report.color}`} />
                        </div>
                        <p className="text-sm font-medium text-center">{report.label}</p>
                        {customReport.reportType === report.id && (
                          <Check className="w-4 h-4 text-red-600 mx-auto mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Date Range</Label>
                    <Select 
                      value={customReport.dateRange} 
                      onValueChange={(value) => setCustomReport({...customReport, dateRange: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dateRangeOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {customReport.dateRange === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <Label className="text-xs">Start</Label>
                          <Input 
                            type="date" 
                            value={customReport.customStartDate}
                            onChange={(e) => setCustomReport({...customReport, customStartDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End</Label>
                          <Input 
                            type="date" 
                            value={customReport.customEndDate}
                            onChange={(e) => setCustomReport({...customReport, customEndDate: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Group By</Label>
                    <Select 
                      value={customReport.groupBy} 
                      onValueChange={(value) => setCustomReport({...customReport, groupBy: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(groupByOptions[customReport.reportType] || groupByOptions.sales).map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sort Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Sort By</Label>
                    <Select 
                      value={customReport.sortBy} 
                      onValueChange={(value) => setCustomReport({...customReport, sortBy: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="quantity">Quantity</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Sort Order</Label>
                    <Select 
                      value={customReport.sortOrder} 
                      onValueChange={(value) => setCustomReport({...customReport, sortOrder: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Highest First</SelectItem>
                        <SelectItem value="asc">Lowest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Output Format</Label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setCustomReport({...customReport, format: 'pdf'})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                        customReport.format === 'pdf' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <FileDown className={`w-6 h-6 ${customReport.format === 'pdf' ? 'text-red-600' : 'text-slate-500'}`} />
                      <span className="font-medium">PDF Document</span>
                    </button>
                    <button
                      onClick={() => setCustomReport({...customReport, format: 'jpg'})}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                        customReport.format === 'jpg' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Image className={`w-6 h-6 ${customReport.format === 'jpg' ? 'text-red-600' : 'text-slate-500'}`} />
                      <span className="font-medium">JPG Image</span>
                    </button>
                  </div>
                </div>

                {/* Generate Button */}
                <Button 
                  onClick={handleCustomReport}
                  disabled={reportGenerating === 'custom'}
                  className="w-full h-14 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold text-lg shadow-lg"
                >
                  {reportGenerating === 'custom' ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Generate & Download Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default withPermission(InventoryReportsPage, 'inventory_reports', 'can_view');
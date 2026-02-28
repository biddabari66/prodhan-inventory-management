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

  // Report generation functions
  const generateSalesReport = (orders, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    const productSales = {};
    let totalRevenue = 0;
    let totalOrders = orders.length;

    orders.forEach(order => {
      if (['cancelled', 'returned'].includes(order.order_status)) return;
      totalRevenue += order.total_amount || 0;
      
      (order.order_items || []).forEach(item => {
        const prod = inventoryMap[item.inventory_id] || {};
        if (!productSales[item.inventory_id]) {
          productSales[item.inventory_id] = {
            name: item.item_name || prod.item_name || 'Unknown',
            category: prod.category || 'N/A',
            qty: 0,
            revenue: 0,
            cost: 0
          };
        }
        // Use actual prices from order items
        const qty = item.quantity || 0;
        const unitPrice = item.unit_price || prod.selling_price || 0;
        const purchasePrice = prod.purchase_price || 0;
        
        productSales[item.inventory_id].qty += qty;
        productSales[item.inventory_id].revenue += qty * unitPrice;
        productSales[item.inventory_id].cost += qty * purchasePrice;
      });
    });

    const rows = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

    let csv = `Sales Report: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Total Orders: ${totalOrders}\n`;
    csv += `Total Revenue: ৳${totalRevenue.toLocaleString()}\n\n`;
    csv += 'Product Name,Category,Quantity Sold,Revenue,Cost,Profit\n';
    
    rows.forEach(r => {
      csv += `"${r.name}","${r.category}",${r.qty},${r.revenue.toFixed(2)},${r.cost.toFixed(2)},${(r.revenue - r.cost).toFixed(2)}\n`;
    });

    return csv;
  };

  const generatePurchaseReport = (purchaseOrders, inventory, startDate, endDate) => {
    let csv = `Purchase Report: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Total Purchase Orders: ${purchaseOrders.length}\n`;
    csv += `Total Value: ৳${purchaseOrders.reduce((s, p) => s + (p.total_amount || 0), 0).toLocaleString()}\n\n`;
    csv += 'PO Number,Date,Supplier,Status,Items Count,Total Amount\n';

    purchaseOrders.forEach(po => {
      csv += `"${po.po_number || ''}","${po.order_date?.split('T')[0] || ''}","${po.supplier_name || ''}","${po.order_status || ''}",${po.order_items?.length || 0},${po.total_amount || 0}\n`;
    });

    return csv;
  };

  const generatePackagingReport = (expenses, startDate, endDate) => {
    let csv = `Packaging & Courier Report: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Total Records: ${expenses.length}\n`;
    csv += `Total Amount: ৳${expenses.reduce((s, e) => s + (e.total_amount || 0) + (e.courier_expense || 0), 0).toLocaleString()}\n\n`;
    csv += 'Date,Type,Description,Packaging Cost,Courier Cost,Total\n';

    expenses.forEach(e => {
      csv += `"${e.expense_date?.split('T')[0] || ''}","${e.expense_type || ''}","${e.description || ''}",${e.total_amount || 0},${e.courier_expense || 0},${(e.total_amount || 0) + (e.courier_expense || 0)}\n`;
    });

    return csv;
  };

  const generateWasteReport = (movements, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    let csv = `Waste & Damage Report: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Total Records: ${movements.length}\n`;
    csv += `Total Loss: ৳${movements.reduce((s, m) => s + Math.abs(m.total_value || 0), 0).toLocaleString()}\n\n`;
    csv += 'Date,Product,Quantity,Reason,Condition,Action,Loss Value\n';

    movements.forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      const meta = m.metadata || {};
      csv += `"${m.movement_date?.split('T')[0] || ''}","${prod.item_name || 'Unknown'}",${meta.original_quantity || Math.abs(m.quantity) || 1},"${meta.reason || m.reference_type}","${meta.condition || 'damaged'}","${meta.action || 'write_off'}",${Math.abs(m.total_value || 0)}\n`;
    });

    return csv;
  };

  const generateReturnsReport = (movements, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    let csv = `Returns Report: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Total Returns: ${movements.length}\n`;
    csv += `Total Value: ৳${movements.reduce((s, m) => s + Math.abs(m.total_value || 0), 0).toLocaleString()}\n\n`;
    csv += 'Date,Product,Type,Quantity,Order #,Customer,Phone,Reason,Action,Value\n';

    movements.forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      const meta = m.metadata || {};
      csv += `"${m.movement_date?.split('T')[0] || ''}","${prod.item_name || 'Unknown'}","${meta.return_type === 'purchase_return' ? 'Purchase Return' : 'Sales Return'}",${meta.original_quantity || Math.abs(m.quantity) || 1},"${m.reference_number || ''}","${meta.customer_name || meta.supplier_name || ''}","${meta.customer_phone || ''}","${meta.reason || ''}","${meta.action || ''}",${Math.abs(m.total_value || 0)}\n`;
    });

    return csv;
  };

  const generateStockValuationReport = (inventory) => {
    const prodhanInventory = inventory.filter(i => i.department === 'prodhan_com_e_commerce');
    const totalValue = prodhanInventory.reduce((s, i) => s + (i.current_stock || 0) * (i.selling_price || 0), 0);
    const totalCostValue = prodhanInventory.reduce((s, i) => s + (i.current_stock || 0) * (i.purchase_price || 0), 0);

    let csv = `Stock Valuation Report\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Total Products: ${prodhanInventory.length}\n`;
    csv += `Total Stock Value (Selling): ৳${totalValue.toLocaleString()}\n`;
    csv += `Total Stock Value (Cost): ৳${totalCostValue.toLocaleString()}\n\n`;
    csv += 'Product Name,Category,Current Stock,Min Stock,Purchase Price,Selling Price,Stock Value (Cost),Stock Value (Selling)\n';

    prodhanInventory.sort((a, b) => ((b.current_stock || 0) * (b.selling_price || 0)) - ((a.current_stock || 0) * (a.selling_price || 0))).forEach(i => {
      csv += `"${i.item_name || ''}","${i.category || ''}",${i.current_stock || 0},${i.minimum_stock || 0},${i.purchase_price || 0},${i.selling_price || 0},${(i.current_stock || 0) * (i.purchase_price || 0)},${(i.current_stock || 0) * (i.selling_price || 0)}\n`;
    });

    return csv;
  };

  const generateLowStockReport = (inventory) => {
    const lowStock = inventory.filter(i => i.department === 'prodhan_com_e_commerce' && (i.current_stock || 0) < (i.minimum_stock || 0));

    let csv = `Low Stock Alert Report\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Items Below Minimum: ${lowStock.length}\n\n`;
    csv += 'Product Name,Category,Current Stock,Minimum Stock,Shortage,Status\n';

    lowStock.sort((a, b) => (a.current_stock - a.minimum_stock) - (b.current_stock - b.minimum_stock)).forEach(i => {
      const shortage = (i.minimum_stock || 0) - (i.current_stock || 0);
      const status = (i.current_stock || 0) === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
      csv += `"${i.item_name || ''}","${i.category || ''}",${i.current_stock || 0},${i.minimum_stock || 0},${shortage},"${status}"\n`;
    });

    return csv;
  };

  const generateMovementReport = (movements, inventory, startDate, endDate) => {
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.id] = i; });

    const summary = {
      sales_out: 0,
      purchase_in: 0,
      return_in: 0,
      damage_out: 0,
      adjustment: 0
    };

    movements.forEach(m => {
      const qty = Math.abs(m.quantity || 0);
      if (m.movement_type === 'out' && m.reference_type === 'sale') summary.sales_out += qty;
      else if (m.movement_type === 'in' && m.reference_type === 'purchase') summary.purchase_in += qty;
      else if (m.reference_type === 'return') summary.return_in += qty;
      else if (m.reference_type === 'damage' || m.reference_type === 'expired') summary.damage_out += qty;
      else summary.adjustment += qty;
    });

    let csv = `Inventory Movement Summary: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Total Movements: ${movements.length}\n\n`;
    csv += 'Summary:\n';
    csv += `Sales Out,${summary.sales_out}\n`;
    csv += `Purchase In,${summary.purchase_in}\n`;
    csv += `Returns,${summary.return_in}\n`;
    csv += `Damages/Waste,${summary.damage_out}\n`;
    csv += `Adjustments,${summary.adjustment}\n\n`;
    csv += 'Date,Product,Type,Reference Type,Quantity,Reference #,Notes\n';

    movements.slice(0, 500).forEach(m => {
      const prod = inventoryMap[m.inventory_item_id] || {};
      csv += `"${m.movement_date?.split('T')[0] || ''}","${prod.item_name || 'Unknown'}","${m.movement_type || ''}","${m.reference_type || ''}",${m.quantity || 0},"${m.reference_number || ''}","${(m.notes || '').substring(0, 50)}"\n`;
    });

    return csv;
  };

  const generateSupplierReport = (purchaseOrders) => {
    const supplierStats = {};
    
    purchaseOrders.forEach(po => {
      const supplier = po.supplier_name || 'Unknown';
      if (!supplierStats[supplier]) {
        supplierStats[supplier] = { orders: 0, total: 0, items: 0 };
      }
      supplierStats[supplier].orders++;
      supplierStats[supplier].total += po.total_amount || 0;
      supplierStats[supplier].items += po.order_items?.length || 0;
    });

    let csv = `Supplier Performance Report\n`;
    csv += `Generated: ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`;
    csv += `Total Suppliers: ${Object.keys(supplierStats).length}\n\n`;
    csv += 'Supplier Name,Total Orders,Total Items,Total Value,Avg Order Value\n';

    Object.entries(supplierStats).sort((a, b) => b[1].total - a[1].total).forEach(([name, stats]) => {
      csv += `"${name}",${stats.orders},${stats.items},${stats.total},${stats.orders > 0 ? Math.round(stats.total / stats.orders) : 0}\n`;
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
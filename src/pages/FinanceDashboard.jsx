import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, TrendingUp, TrendingDown, Package, Truck, Target,
  AlertTriangle, Download, Calendar, BarChart3, PieChart, FileSpreadsheet,
  ShoppingCart, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw,
  Filter, ChevronDown, Megaphone
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from 'date-fns';
import { withPermission } from '../components/common/PermissionGuard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ProfitWaterfall from '../components/finance/ProfitWaterfall';

const COLORS = ['#DC2626', '#F59E0B', '#8B5CF6', '#3B82F6', '#10B981', '#6B7280'];

function FinanceDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'today':
        const today = format(now, 'yyyy-MM-dd');
        return { start: today, end: today };
      case 'this_week':
        return {
          start: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd')
        };
      case 'last_week':
        const lastWeek = subWeeks(now, 1);
        return {
          start: format(startOfWeek(lastWeek, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(lastWeek, { weekStartsOn: 0 }), 'yyyy-MM-dd')
        };
      case 'this_month':
        return {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd')
        };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return {
          start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          end: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
        };
      case 'custom':
        return {
          start: customDateRange.from || format(startOfMonth(now), 'yyyy-MM-dd'),
          end: customDateRange.to || format(endOfMonth(now), 'yyyy-MM-dd')
        };
      default:
        return {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd')
        };
    }
  }, [selectedPeriod, customDateRange]);

  // Fetch all orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['finance-orders', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.filter({ 
        department: 'prodhan_com_e_commerce'
      }, '-order_date', 10000);
      // Filter by date range
      return allOrders.filter(o => {
        const orderDate = o.order_date?.split('T')[0];
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      });
    },
    staleTime: 2 * 60 * 1000
  });

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['finance-purchases', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allPO = await base44.entities.PurchaseOrder.filter({ 
        department: 'prodhan_com_e_commerce'
      }, '-order_date', 5000);
      return allPO.filter(p => {
        const poDate = p.order_date?.split('T')[0];
        return poDate >= dateRange.start && poDate <= dateRange.end;
      });
    },
    staleTime: 2 * 60 * 1000
  });

  // Fetch packaging expenses
  const { data: packagingExpenses = [] } = useQuery({
    queryKey: ['finance-packaging', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allExpenses = await base44.entities.PackagingExpense.filter({ 
        department: 'prodhan_com_e_commerce'
      });
      return allExpenses.filter(e => {
        const expDate = e.expense_date?.split('T')[0];
        return expDate >= dateRange.start && expDate <= dateRange.end;
      });
    },
    staleTime: 2 * 60 * 1000
  });

  // Fetch returns/damages with proper value calculation
  const { data: returns = [] } = useQuery({
    queryKey: ['finance-returns', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allMovements = await base44.entities.InventoryMovement.list('-movement_date', 10000);
      return allMovements.filter(m => {
        const mDate = m.movement_date?.split('T')[0];
        const isReturnOrDamage = m.reference_type === 'damage' || m.reference_type === 'return' || m.reference_type === 'expired';
        return mDate >= dateRange.start && mDate <= dateRange.end && isReturnOrDamage;
      });
    },
    staleTime: 2 * 60 * 1000
  });

  // Fetch inventory for actual pricing
  const { data: inventoryData = [] } = useQuery({
    queryKey: ['finance-inventory'],
    queryFn: () => base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }),
    staleTime: 10 * 60 * 1000
  });

  // Fetch general expenses (Expense entity)
  const { data: generalExpenses = [] } = useQuery({
    queryKey: ['finance-general-expenses', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allExpenses = await base44.entities.Expense.filter({ 
        department: 'prodhan_com_e_commerce',
        status: 'approved'
      }, '-expense_date', 1000);
      return allExpenses.filter(e => {
        const expDate = e.expense_date?.split('T')[0];
        return expDate >= dateRange.start && expDate <= dateRange.end;
      });
    },
    staleTime: 2 * 60 * 1000
  });

  // Calculate comprehensive financials
  // Fetch ad spends for ROI
  const { data: adSpends = [] } = useQuery({
    queryKey: ['finance-adspends', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allSpends = await base44.entities.AdSpend.list('-spend_date', 1000);
      return allSpends.filter(s => {
        const spendDate = s.spend_date?.split('T')[0];
        return spendDate >= dateRange.start && spendDate <= dateRange.end;
      });
    },
    staleTime: 2 * 60 * 1000
  });

  // Fetch payroll for Prodhan.com employees (for profit/loss)
  const { data: payrollRecords = [] } = useQuery({
    queryKey: ['finance-payroll', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allPayroll = await base44.entities.PayrollRecord.list('-created_date', 500);
      // Filter by month range (YYYY-MM format)
      const startMonth = dateRange.start.slice(0, 7);
      const endMonth = dateRange.end.slice(0, 7);
      return allPayroll.filter(p => p.month >= startMonth && p.month <= endMonth);
    },
    staleTime: 5 * 60 * 1000
  });

  const financials = useMemo(() => {
    // Revenue - ALL orders (total potential revenue)
    const totalRevenue = orders
      .filter(o => !['cancelled', 'returned'].includes(o.order_status))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Collected Revenue - Paid orders only
    const collectedRevenue = orders
      .filter(o => o.payment_status === 'paid' && !['cancelled', 'returned'].includes(o.order_status))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Pending Revenue - COD orders not yet delivered/paid
    const pendingRevenue = orders
      .filter(o => o.payment_status !== 'paid' && !['cancelled', 'returned', 'delivered'].includes(o.order_status))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // COGS from purchase orders (subtotal only, excluding custom expenses)
    const costOfGoods = purchaseOrders
      .filter(p => ['received', 'completed'].includes(p.order_status))
      .reduce((sum, p) => sum + ((p.subtotal || 0) + (p.tax_amount || 0) + (p.shipping_cost || 0) + (p.courier_expense || 0) - (p.discount_amount || 0)), 0);

    // Custom/Production expenses from POs (stitching, piping, etc.)
    const customExpenses = purchaseOrders
      .filter(p => ['received', 'completed'].includes(p.order_status))
      .reduce((sum, p) => sum + (p.custom_expenses_total || 0), 0);

    // Packaging expenses
    const packagingCost = packagingExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.total_amount || 0) + (e.courier_expense || 0), 0);

    // Returns/Damage loss - separate tracking for accuracy
    const inventoryPriceMap = {};
    const inventoryCostMap = {};
    inventoryData.forEach(inv => {
      inventoryPriceMap[inv.id] = inv.selling_price || 0;
      inventoryCostMap[inv.id] = inv.purchase_price || 0;
    });

    // Split returns into actual returns vs damage write-offs
    const returnMovements = returns.filter(r => r.reference_type === 'return');
    const damageMovements = returns.filter(r => r.reference_type === 'damage' || r.reference_type === 'expired');

    // Return loss uses selling price (customer refund value)
    const actualReturnLoss = returnMovements.reduce((sum, r) => {
      if (r.total_value && r.total_value !== 0) return sum + Math.abs(r.total_value);
      const price = inventoryPriceMap[r.inventory_item_id] || 0;
      const qty = Math.abs(r.quantity || (r.metadata?.original_quantity || 1));
      return sum + (qty * price);
    }, 0);

    // Damage loss uses purchase price (actual cost lost through write-offs)
    const damageLoss = damageMovements.reduce((sum, r) => {
      if (r.total_value && r.total_value !== 0) return sum + Math.abs(r.total_value);
      const costPrice = inventoryCostMap[r.inventory_item_id] || 0;
      const qty = Math.abs(r.quantity || (r.metadata?.original_quantity || 1));
      return sum + (qty * costPrice);
    }, 0);

    const returnLoss = actualReturnLoss + damageLoss;

    // General expenses (from Expense entity - not purchase orders)
    const otherExpenses = generalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Total expenses
    const totalExpenses = costOfGoods + packagingCost + returnLoss + otherExpenses + customExpenses;

    // Profit calculations
    const grossProfit = collectedRevenue - totalExpenses;
    const profitMargin = collectedRevenue > 0 ? (grossProfit / collectedRevenue * 100) : 0;

    // Order stats
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.order_status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.order_status === 'cancelled').length;
    const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
    const returnedOrders = orders.filter(o => o.order_status === 'returned').length;

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Shipping revenue
    const shippingRevenue = orders.reduce((sum, o) => sum + (o.shipping_cost || 0), 0);

    // Discount given
    const totalDiscount = orders.reduce((sum, o) => sum + (o.discount_amount || 0) + (o.coupon_discount || 0), 0);

    // Ad Spend
    const totalAdSpend = adSpends.reduce((sum, s) => sum + (s.total_spend_bdt || 0), 0);

    // Employee Salaries (Prodhan.com E-commerce department only)
    const totalSalaries = payrollRecords
      .filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + (p.net_salary || 0), 0);

    // ROI Calculation (profit after all costs including ads and salaries)
    const netProfit = grossProfit - totalAdSpend - totalSalaries;
    const totalCostsWithAds = totalExpenses + totalAdSpend + totalSalaries;
    const roi = totalCostsWithAds > 0 ? (netProfit / totalCostsWithAds * 100) : 0;

    return {
      totalRevenue,
      collectedRevenue,
      pendingRevenue,
      costOfGoods,
      packagingCost,
      returnLoss,
      actualReturnLoss,
      damageLoss,
      customExpenses,
      totalExpenses,
      grossProfit,
      profitMargin,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      returnedOrders,
      avgOrderValue,
      shippingRevenue,
      totalDiscount,
      purchaseCount: purchaseOrders.length,
      totalAdSpend,
      totalSalaries,
      otherExpenses,
      netProfit,
      roi
    };
  }, [orders, purchaseOrders, packagingExpenses, returns, adSpends, payrollRecords, generalExpenses]);

  // Chart data - Expense breakdown
  const expenseBreakdown = [
    { name: 'Purchase Cost', value: financials.costOfGoods, fill: '#DC2626' },
    { name: 'Packaging & Courier', value: financials.packagingCost, fill: '#F59E0B' },
    { name: 'Returns Loss', value: financials.actualReturnLoss, fill: '#F97316' },
    { name: 'Damage/Waste Loss', value: financials.damageLoss, fill: '#EF4444' },
    { name: 'Production Expenses', value: financials.customExpenses, fill: '#A855F7' },
    { name: 'Ad Spend', value: financials.totalAdSpend, fill: '#8B5CF6' },
    { name: 'Other Expenses', value: financials.otherExpenses, fill: '#EC4899' },
    { name: 'Salaries', value: financials.totalSalaries, fill: '#6366F1' }
  ].filter(item => item.value > 0);

  // Daily sales trend
  const dailySalesTrend = useMemo(() => {
    const salesByDate = {};
    orders.forEach(o => {
      const date = o.order_date?.split('T')[0];
      if (date) {
        if (!salesByDate[date]) {
          salesByDate[date] = { date, revenue: 0, orders: 0 };
        }
        salesByDate[date].revenue += (o.total_amount || 0);
        salesByDate[date].orders += 1;
      }
    });
    return Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);

  // Export functions
  const handleExportSummary = () => {
    const csvData = [
      ['Prodhan.com E-commerce Financial Summary'],
      ['Period', `${dateRange.start} to ${dateRange.end}`],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['REVENUE'],
      ['Total Revenue', financials.totalRevenue],
      ['Collected Revenue', financials.collectedRevenue],
      ['Pending Revenue', financials.pendingRevenue],
      ['Shipping Revenue', financials.shippingRevenue],
      [''],
      ['EXPENSES'],
      ['Cost of Goods (Purchases)', financials.costOfGoods],
      ['Packaging & Courier', financials.packagingCost],
      ['Production Expenses', financials.customExpenses],
      ['Returns Loss (Refunds)', financials.actualReturnLoss],
      ['Damage/Waste Loss (Write-off)', financials.damageLoss],
      ['Other Dept Expenses', financials.otherExpenses],
      ['Total Direct Expenses', financials.totalExpenses],
      [''],
      ['OPERATIONAL EXPENSES'],
      ['Marketing / Ad Spend', financials.totalAdSpend],
      ['Staff Salaries', financials.totalSalaries],
      [''],
      ['PROFIT'],
      ['Gross Profit', financials.grossProfit],
      ['Net Profit (After OpEx)', financials.netProfit],
      ['ROI', `${financials.roi.toFixed(2)}%`],
      ['Profit Margin', `${financials.profitMargin.toFixed(2)}%`],
      [''],
      ['ORDER STATISTICS'],
      ['Total Orders', financials.totalOrders],
      ['Delivered Orders', financials.deliveredOrders],
      ['Pending Orders', financials.pendingOrders],
      ['Cancelled Orders', financials.cancelledOrders],
      ['Returned Orders', financials.returnedOrders],
      ['Average Order Value', financials.avgOrderValue.toFixed(2)],
      ['Total Discount Given', financials.totalDiscount]
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Finance_Summary_${dateRange.start}_to_${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Summary exported!');
  };

  const handleExportOrders = () => {
    const headers = ['Order #', 'Date', 'Customer', 'Phone', 'Status', 'Payment', 'Subtotal', 'Discount', 'Shipping', 'Total'];
    const rows = orders.map(o => [
      o.order_number,
      o.order_date?.split('T')[0],
      o.customer_name,
      o.customer_phone,
      o.order_status,
      o.payment_status,
      o.subtotal || 0,
      (o.discount_amount || 0) + (o.coupon_discount || 0),
      o.shipping_cost || 0,
      o.total_amount || 0
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Orders_${dateRange.start}_to_${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${orders.length} orders!`);
  };

  const handleExportPurchases = () => {
    const headers = ['PO #', 'Date', 'Supplier', 'Status', 'Items', 'Total'];
    const rows = purchaseOrders.map(p => [
      p.po_number,
      p.order_date?.split('T')[0],
      p.supplier_name,
      p.order_status,
      p.order_items?.length || 0,
      p.total_amount || 0
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Purchases_${dateRange.start}_to_${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${purchaseOrders.length} purchase orders!`);
  };

  const isLoading = ordersLoading || purchasesLoading;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-2 py-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <DollarSign className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900">Finance Dashboard</h1>
              <p className="text-slate-500 text-xs sm:text-sm">Financial overview for Prodhan.com</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32 sm:w-40 bg-white h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Input type="date" value={customDateRange.from}
                  onChange={(e) => setCustomDateRange({...customDateRange, from: e.target.value})}
                  className="w-[130px] sm:w-36 bg-white h-9 text-sm" />
                <span className="text-slate-400 text-xs">to</span>
                <Input type="date" value={customDateRange.to}
                  onChange={(e) => setCustomDateRange({...customDateRange, to: e.target.value})}
                  className="w-[130px] sm:w-36 bg-white h-9 text-sm" />
              </div>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white h-9 text-sm">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleExportSummary}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Summary
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleExportOrders}>
                  <ShoppingCart className="w-4 h-4 mr-2" /> Orders
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleExportPurchases}>
                  <Package className="w-4 h-4 mr-2" /> Purchases
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Period Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white px-3 py-1">
            <Calendar className="w-3 h-3 mr-2" />
            {dateRange.start} to {dateRange.end}
          </Badge>
          {isLoading && (
            <Badge className="bg-blue-100 text-blue-700 animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Loading...
            </Badge>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Total Orders */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-500 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-[10px] sm:text-xs text-blue-700 font-medium">Avg: ৳{financials.avgOrderValue.toFixed(0)}</span>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{financials.totalOrders}</p>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 font-medium">Total Orders</p>
              <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-blue-700">
                Del: {financials.deliveredOrders} | Pend: {financials.pendingOrders}
              </div>
            </CardContent>
          </Card>
          
          {/* Ad Spend */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500 flex items-center justify-center">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">৳{financials.totalAdSpend.toLocaleString()}</p>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 font-medium">Ad Spend</p>
            </CardContent>
          </Card>

          {/* ROI */}
          <Card className={`border-2 shadow-sm ${financials.roi >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center ${financials.roi >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <Badge className={`text-[10px] sm:text-xs ${financials.roi >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                  {financials.roi.toFixed(1)}%
                </Badge>
              </div>
              <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${financials.roi >= 0 ? 'text-green-700' : 'text-red-700'}`}>ROI</p>
              <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 font-medium">
                {financials.roi >= 20 ? 'Excellent' : financials.roi >= 10 ? 'Good' : financials.roi >= 0 ? 'Low' : 'Negative'}
              </p>
            </CardContent>
          </Card>
        
          {/* Revenue, Expenses, Net Profit */}
          <div className="col-span-2 lg:col-start-1 lg:col-span-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-green-500 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">৳{financials.totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 font-medium">Total Revenue</p>
                <div className="mt-1 text-[10px] sm:text-xs text-green-700 truncate">
                  Collected: ৳{financials.collectedRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-red-500 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">৳{financials.totalExpenses.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 font-medium">Total Expenses</p>
                <div className="mt-1 text-[10px] sm:text-xs text-red-700 truncate">
                  Purchases: ৳{financials.costOfGoods.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className={`col-span-2 sm:col-span-1 border-2 shadow-sm ${financials.netProfit >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center ${financials.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <Badge className={`text-[10px] sm:text-xs ${financials.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                    {financials.profitMargin.toFixed(1)}%
                  </Badge>
                </div>
                <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${financials.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ৳{Math.abs(financials.netProfit).toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 font-medium">
                  {financials.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                </p>
                {financials.totalSalaries > 0 && (
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">After ৳{financials.totalSalaries.toLocaleString()} salaries</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-2.5 sm:p-4 text-center">
            <p className="text-base sm:text-lg font-bold text-slate-900">{financials.deliveredOrders}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Delivered</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-2.5 sm:p-4 text-center">
            <p className="text-base sm:text-lg font-bold text-amber-600">{financials.pendingOrders}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-2.5 sm:p-4 text-center">
            <p className="text-base sm:text-lg font-bold text-red-600">{financials.cancelledOrders}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Cancelled</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-2.5 sm:p-4 text-center">
            <p className="text-base sm:text-lg font-bold text-purple-600">{returns.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Returns</p>
            <p className="text-[10px] text-red-600 font-semibold mt-0.5">৳{financials.returnLoss.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-2.5 sm:p-4 text-center">
            <p className="text-base sm:text-lg font-bold text-slate-900">৳{financials.shippingRevenue.toLocaleString()}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Shipping</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-2.5 sm:p-4 text-center">
            <p className="text-base sm:text-lg font-bold text-orange-600">৳{financials.totalDiscount.toLocaleString()}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Discounts</p>
          </CardContent>
        </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Sales Trend Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                Sales Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="px-1 sm:px-6">
              <div className="h-48 sm:h-64">
                {dailySalesTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySalesTrend} margin={{ left: 0, right: 8, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} tick={{ fontSize: 9 }} width={45} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue' ? `৳${value.toLocaleString()}` : value,
                          name === 'revenue' ? 'Revenue' : 'Orders'
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#DC2626" strokeWidth={2} dot={{ fill: '#DC2626', r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No data for selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-48 sm:h-64">
                {expenseBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                        label={false}
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `৳${value.toLocaleString()}`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No expenses for selected period
                  </div>
                )}
              </div>
              {/* Expense Legend — compact on mobile */}
              <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                {expenseBreakdown.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-1.5 sm:p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }}></div>
                      <span className="text-xs sm:text-sm text-slate-700 truncate">{item.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 flex-shrink-0 ml-2">৳{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profit & Loss Waterfall */}
        <ProfitWaterfall financials={financials} />

        {/* Detailed Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

          {/* Revenue Card */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Revenue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Total Revenue</span>
                <span className="font-bold text-xs sm:text-sm text-green-700">৳{financials.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Collected</span>
                <span className="font-bold text-xs sm:text-sm text-green-600">৳{financials.collectedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Pending (COD)</span>
                <span className="font-bold text-xs sm:text-sm text-amber-600">৳{financials.pendingRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Shipping Revenue</span>
                <span className="font-bold text-xs sm:text-sm text-blue-600">৳{financials.shippingRevenue.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-0 shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                Expense Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Purchase Orders</span>
                <span className="font-bold text-xs sm:text-sm text-red-700">৳{financials.costOfGoods.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Packaging & Courier</span>
                <span className="font-bold text-xs sm:text-sm text-amber-600">৳{financials.packagingCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Returns (Refunds)</span>
                <span className="font-bold text-xs sm:text-sm text-orange-600">৳{financials.actualReturnLoss.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Damage/Waste</span>
                <span className="font-bold text-xs sm:text-sm text-red-600">৳{financials.damageLoss.toLocaleString()}</span>
              </div>
              {financials.customExpenses > 0 && (
                <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                  <span className="text-xs sm:text-sm text-slate-600">Production</span>
                  <span className="font-bold text-xs sm:text-sm text-purple-600">৳{financials.customExpenses.toLocaleString()}</span>
                </div>
              )}
              {financials.otherExpenses > 0 && (
                <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                  <span className="text-xs sm:text-sm text-slate-600">Other</span>
                  <span className="font-bold text-xs sm:text-sm text-pink-600">৳{financials.otherExpenses.toLocaleString()}</span>
                </div>
              )}
              {financials.totalSalaries > 0 && (
                <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                  <span className="text-xs sm:text-sm text-slate-600">Salaries</span>
                  <span className="font-bold text-xs sm:text-sm text-purple-600">৳{financials.totalSalaries.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center p-2 sm:p-3 bg-red-100 rounded-lg">
                <span className="text-xs sm:text-sm font-semibold text-slate-700">Total Expenses</span>
                <span className="font-bold text-xs sm:text-sm text-red-700">৳{(financials.totalExpenses + financials.totalSalaries).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Profit Margin</span>
                <Badge className={`text-[10px] sm:text-xs ${financials.profitMargin >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                  {financials.profitMargin.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Avg Order Value</span>
                <span className="font-bold text-xs sm:text-sm text-blue-700">৳{financials.avgOrderValue.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Discounts Given</span>
                <span className="font-bold text-xs sm:text-sm text-orange-600">৳{financials.totalDiscount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-2 sm:p-3 bg-white/60 rounded-lg">
                <span className="text-xs sm:text-sm text-slate-600">Delivery Rate</span>
                <span className="font-bold text-xs sm:text-sm text-green-600">
                  {financials.totalOrders > 0 ? ((financials.deliveredOrders / financials.totalOrders) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default FinanceDashboardPage;
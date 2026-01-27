import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, TrendingUp, TrendingDown, Package, Truck, Target,
  AlertTriangle, Download, Calendar, BarChart3, PieChart
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { withPermission } from '../components/common/PermissionGuard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function FinanceDashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [manualExpenses, setManualExpenses] = useState({
    ad_expenses: 0,
    courier_charges: 0,
    other_operational: 0
  });

  // Fetch all financial data
  const { data: orders = [] } = useQuery({
    queryKey: ['finance-orders', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      
      const allOrders = await base44.entities.Order.filter({ 
        department: 'prodhan_com_e_commerce',
        order_date: { $gte: start, $lte: end }
      }, '-order_date', 5000);
      return allOrders;
    }
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['finance-purchases', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      
      return await base44.entities.PurchaseOrder.filter({ 
        department: 'prodhan_com_e_commerce',
        order_date: { $gte: start, $lte: end }
      }, '-order_date', 5000);
    }
  });

  const { data: packagingExpenses = [] } = useQuery({
    queryKey: ['finance-packaging', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      
      return await base44.entities.PackagingExpense.filter({ 
        department: 'prodhan_com_e_commerce',
        expense_date: { $gte: start, $lte: end }
      });
    }
  });

  const { data: returns = [] } = useQuery({
    queryKey: ['finance-returns', selectedMonth],
    queryFn: () => base44.entities.InventoryMovement.filter({ 
      movement_type: 'damage',
      movement_date: { $gte: selectedMonth + '-01' }
    })
  });

  // Calculate comprehensive financials
  const financials = useMemo(() => {
    // Revenue from paid orders
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid' && !['cancelled', 'returned'].includes(o.order_status))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // COGS from purchase orders
    const costOfGoods = purchaseOrders
      .filter(p => ['received', 'completed'].includes(p.order_status))
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // Packaging expenses
    const packagingCost = packagingExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.total_amount || 0) + (e.courier_expense || 0), 0);

    // Returns/Damage loss
    const returnLoss = returns.reduce((sum, r) => sum + Math.abs(r.total_value || 0), 0);

    // Manual expenses
    const adExpenses = manualExpenses.ad_expenses || 0;
    const courierCharges = manualExpenses.courier_charges || 0;
    const otherExpenses = manualExpenses.other_operational || 0;

    // Total expenses
    const totalExpenses = costOfGoods + packagingCost + returnLoss + adExpenses + courierCharges + otherExpenses;

    // Profit calculations
    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

    return {
      totalRevenue,
      costOfGoods,
      packagingCost,
      returnLoss,
      adExpenses,
      courierCharges,
      otherExpenses,
      totalExpenses,
      grossProfit,
      profitMargin,
      orderCount: orders.length,
      purchaseCount: purchaseOrders.length
    };
  }, [orders, purchaseOrders, packagingExpenses, returns, manualExpenses]);

  // Chart data
  const expenseBreakdown = [
    { name: 'Purchase Cost', value: financials.costOfGoods, fill: '#DC2626' },
    { name: 'Packaging', value: financials.packagingCost, fill: '#F59E0B' },
    { name: 'Ad Expenses', value: financials.adExpenses, fill: '#8B5CF6' },
    { name: 'Courier', value: financials.courierCharges, fill: '#3B82F6' },
    { name: 'Returns/Loss', value: financials.returnLoss, fill: '#EF4444' },
    { name: 'Other', value: financials.otherExpenses, fill: '#6B7280' }
  ].filter(item => item.value > 0);

  const handleExport = () => {
    const csvData = [
      ['Prodhan.com E-commerce Financial Report'],
      ['Month', selectedMonth],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['Revenue & Profit'],
      ['Total Revenue', `৳${financials.totalRevenue.toLocaleString()}`],
      ['Total Expenses', `৳${financials.totalExpenses.toLocaleString()}`],
      ['Gross Profit', `৳${financials.grossProfit.toLocaleString()}`],
      ['Profit Margin', `${financials.profitMargin.toFixed(2)}%`],
      [''],
      ['Expense Breakdown'],
      ['Cost of Goods (Purchases)', `৳${financials.costOfGoods.toLocaleString()}`],
      ['Packaging & Courier', `৳${financials.packagingCost.toLocaleString()}`],
      ['Ad Expenses', `৳${financials.adExpenses.toLocaleString()}`],
      ['Courier Charges', `৳${financials.courierCharges.toLocaleString()}`],
      ['Returns & Wastage', `৳${financials.returnLoss.toLocaleString()}`],
      ['Other Expenses', `৳${financials.otherExpenses.toLocaleString()}`],
      [''],
      ['Order Statistics'],
      ['Total Orders', financials.orderCount],
      ['Total Purchases', financials.purchaseCount]
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Finance_Report_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported!');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Finance Dashboard</h1>
              <p className="text-slate-500">Complete financial overview for e-commerce</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-44"
            />
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">৳{financials.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Total Revenue</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">৳{financials.totalExpenses.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Total Expenses</p>
            </CardContent>
          </Card>

          <Card className={`border-2 ${financials.grossProfit >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${financials.grossProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Target className={`w-6 h-6 ${financials.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${financials.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ৳{Math.abs(financials.grossProfit).toLocaleString()}
              </p>
              <p className="text-sm text-slate-600 mt-1 font-medium">
                {financials.grossProfit >= 0 ? 'Net Profit' : 'Net Loss'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{financials.profitMargin.toFixed(1)}%</p>
              <p className="text-sm text-slate-500 mt-1">Profit Margin</p>
            </CardContent>
          </Card>
        </div>

        {/* Manual Expense Entry */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-red-600" />
              Manual Expense Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Ad Expenses (Facebook/Google Ads)</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                  <Input
                    type="number"
                    min="0"
                    value={manualExpenses.ad_expenses}
                    onChange={(e) => setManualExpenses({...manualExpenses, ad_expenses: parseFloat(e.target.value) || 0})}
                    className="pl-8"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label>Courier Charges (Steadfast etc.)</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                  <Input
                    type="number"
                    min="0"
                    value={manualExpenses.courier_charges}
                    onChange={(e) => setManualExpenses({...manualExpenses, courier_charges: parseFloat(e.target.value) || 0})}
                    className="pl-8"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label>Other Operational Expenses</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                  <Input
                    type="number"
                    min="0"
                    value={manualExpenses.other_operational}
                    onChange={(e) => setManualExpenses({...manualExpenses, other_operational: parseFloat(e.target.value) || 0})}
                    className="pl-8"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              💡 Enter monthly advertising and operational costs not tracked in Purchase Orders
            </p>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `৳${value.toLocaleString()}`} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {expenseBreakdown.map(item => (
                <div key={item.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="font-bold text-slate-900">৳{item.value.toLocaleString()}</span>
                </div>
              ))}
              
              <div className="pt-3 mt-3 border-t-2 border-slate-200">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg">
                  <span className="text-lg font-bold text-slate-900">Total Expenses</span>
                  <span className="text-2xl font-bold text-red-600">৳{financials.totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">Purchase Orders</p>
                  <p className="text-2xl font-bold text-slate-900">৳{financials.costOfGoods.toLocaleString()}</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700">{financials.purchaseCount} orders</Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Truck className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-sm text-slate-600">Packaging & Courier</p>
                  <p className="text-2xl font-bold text-slate-900">৳{financials.packagingCost.toLocaleString()}</p>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-700">{packagingExpenses.length} expenses</Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-slate-600">Wastage & Returns</p>
                  <p className="text-2xl font-bold text-slate-900">৳{financials.returnLoss.toLocaleString()}</p>
                </div>
              </div>
              <Badge className="bg-red-100 text-red-700">{returns.length} incidents</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withPermission(FinanceDashboardPage, 'financial_analytics', 'can_view');
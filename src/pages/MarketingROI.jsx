import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Megaphone, PieChart,
  Plus, Download, Filter, Calendar, BarChart3, Zap, AlertTriangle,
  CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Loader2, Package, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { withPermission } from '../components/common/PermissionGuard';
import CampaignManager from '../components/marketing/CampaignManager';
import BudgetAlerts from '../components/marketing/BudgetAlerts';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { 
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, Area, AreaChart
} from 'recharts';

const COLORS = ['#DC2626', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const toBDTDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);
};

function MarketingROIPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [startDate, setStartDate] = useState(toBDTDate(subDays(new Date(), 30)));
  const [endDate, setEndDate] = useState(toBDTDate());
  const [isAddCampaignOpen, setIsAddCampaignOpen] = useState(false);
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [newCampaign, setNewCampaign] = useState({
    ad_type: 'single_product',
    period_type: 'daily',
    spend_date: toBDTDate(),
    total_spend_usd: 0,
    usd_to_bdt_rate: 120,
    platform: 'facebook',
    campaign_name: '',
    products: [],
    notes: ''
  });

  const [newBudget, setNewBudget] = useState({
    period_type: 'monthly',
    period: format(new Date(), 'yyyy-MM'),
    department: 'prodhan_com_e_commerce',
    category: 'marketing',
    allocated_amount: 0,
    notes: ''
  });

  // Fetch data
  const { data: adSpends = [] } = useQuery({
    queryKey: ['ad-spends'],
    queryFn: () => base44.entities.AdSpend.list('-spend_date', 2000),
    staleTime: 2 * 60 * 1000
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['marketing-orders'],
    queryFn: () => base44.entities.Order.filter({ department: 'prodhan_com_e_commerce' }, '-order_date', 5000),
    staleTime: 5 * 60 * 1000
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['marketing-inventory'],
    queryFn: () => base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }),
    staleTime: 5 * 60 * 1000
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['marketing-budgets'],
    queryFn: async () => {
      const all = await base44.entities.Budget.list('-period', 200);
      return all.filter(b => b.category === 'marketing');
    },
    staleTime: 5 * 60 * 1000
  });

  // Mutations
  const createAdSpendMutation = useMutation({
    mutationFn: (data) => base44.entities.AdSpend.create({
      ...data,
      total_spend_bdt: data.total_spend_usd * data.usd_to_bdt_rate
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ad-spends']);
      toast.success('Campaign ad spend recorded');
      setIsAddCampaignOpen(false);
      setNewCampaign({
        ad_type: 'single_product',
        period_type: 'daily',
        spend_date: toBDTDate(),
        total_spend_usd: 0,
        usd_to_bdt_rate: 120,
        platform: 'facebook',
        campaign_name: '',
        products: [],
        notes: ''
      });
    }
  });

  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.create({
      ...data,
      start_date: data.period + '-01',
      end_date: format(endOfMonth(new Date(data.period + '-01')), 'yyyy-MM-dd'),
      spent_amount: 0,
      remaining_amount: data.allocated_amount,
      utilization_percentage: 0,
      status: 'active'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['marketing-budgets']);
      toast.success('Marketing budget created');
      setIsAddBudgetOpen(false);
    }
  });

  // Filter data by date
  const filteredAdSpends = useMemo(() => {
    return adSpends.filter(s => {
      const d = s.spend_date?.split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }, [adSpends, startDate, endDate]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = o.order_date?.split('T')[0];
      return d >= startDate && d <= endDate && !['cancelled', 'returned'].includes(o.order_status);
    });
  }, [orders, startDate, endDate]);

  // Build inventory map
  const inventoryMap = useMemo(() => {
    const map = {};
    inventory.forEach(i => { map[i.id] = i; });
    return map;
  }, [inventory]);

  // Calculate comprehensive ROI metrics
  const metrics = useMemo(() => {
    const totalAdSpend = filteredAdSpends.reduce((sum, s) => sum + (s.total_spend_bdt || 0), 0);
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalCost = filteredOrders.reduce((sum, o) => {
      return sum + (o.order_items || []).reduce((itemSum, item) => {
        const inv = inventoryMap[item.inventory_id] || {};
        return itemSum + ((item.quantity || 0) * (inv.purchase_price || 0));
      }, 0);
    }, 0);

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalAdSpend;
    const roi = totalAdSpend > 0 ? ((netProfit / totalAdSpend) * 100) : 0;
    const roas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend) : 0;
    const cpa = filteredOrders.length > 0 ? (totalAdSpend / filteredOrders.length) : 0;

    // Platform breakdown
    const platformStats = {};
    filteredAdSpends.forEach(s => {
      const platform = s.platform || 'other';
      if (!platformStats[platform]) {
        platformStats[platform] = { spend: 0, campaigns: 0 };
      }
      platformStats[platform].spend += s.total_spend_bdt || 0;
      platformStats[platform].campaigns++;
    });

    // Product-level ROI
    const productROI = {};
    filteredAdSpends.forEach(ad => {
      (ad.products || []).forEach(p => {
        if (!productROI[p.inventory_id]) {
          const inv = inventoryMap[p.inventory_id] || {};
          productROI[p.inventory_id] = {
            name: p.product_name || inv.item_name || 'Unknown',
            adSpend: 0,
            revenue: 0,
            orders: 0,
            cost: 0
          };
        }
        productROI[p.inventory_id].adSpend += p.allocated_spend_bdt || 0;
      });
    });

    // Add sales data to products
    filteredOrders.forEach(order => {
      (order.order_items || []).forEach(item => {
        if (productROI[item.inventory_id]) {
          const inv = inventoryMap[item.inventory_id] || {};
          productROI[item.inventory_id].revenue += (item.quantity || 0) * (item.unit_price || 0);
          productROI[item.inventory_id].orders++;
          productROI[item.inventory_id].cost += (item.quantity || 0) * (inv.purchase_price || 0);
        }
      });
    });

    // Campaign performance
    const campaignStats = {};
    filteredAdSpends.forEach(s => {
      const campaign = s.campaign_name || 'Unnamed Campaign';
      if (!campaignStats[campaign]) {
        campaignStats[campaign] = { spend: 0, platform: s.platform, products: [] };
      }
      campaignStats[campaign].spend += s.total_spend_bdt || 0;
      campaignStats[campaign].products.push(...(s.products || []));
    });

    // Daily trend
    const dailyTrend = {};
    filteredAdSpends.forEach(s => {
      const date = s.spend_date?.split('T')[0];
      if (!dailyTrend[date]) dailyTrend[date] = { date, spend: 0, revenue: 0 };
      dailyTrend[date].spend += s.total_spend_bdt || 0;
    });
    filteredOrders.forEach(o => {
      const date = o.order_date?.split('T')[0];
      if (dailyTrend[date]) {
        dailyTrend[date].revenue += o.total_amount || 0;
      }
    });

    return {
      totalAdSpend,
      totalRevenue,
      totalCost,
      grossProfit,
      netProfit,
      roi,
      roas,
      cpa,
      totalOrders: filteredOrders.length,
      platformStats,
      productROI: Object.values(productROI).sort((a, b) => b.revenue - a.revenue),
      campaignStats: Object.entries(campaignStats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.spend - a.spend),
      dailyTrend: Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [filteredAdSpends, filteredOrders, inventoryMap]);

  // Budget tracking
  const currentMonthBudget = useMemo(() => {
    const currentPeriod = format(new Date(), 'yyyy-MM');
    const budget = budgets.find(b => b.period === currentPeriod && b.category === 'marketing');
    if (!budget) return null;

    const spent = filteredAdSpends
      .filter(s => s.spend_date?.startsWith(currentPeriod))
      .reduce((sum, s) => sum + (s.total_spend_bdt || 0), 0);

    return {
      ...budget,
      spent,
      remaining: (budget.allocated_amount || 0) - spent,
      utilization: budget.allocated_amount > 0 ? (spent / budget.allocated_amount) * 100 : 0
    };
  }, [budgets, filteredAdSpends]);

  const platformChartData = Object.entries(metrics.platformStats).map(([platform, data], idx) => ({
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    value: data.spend,
    color: COLORS[idx % COLORS.length]
  }));

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Marketing ROI</h1>
              <p className="text-slate-500 text-sm">Campaign performance & budget tracking</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsAddBudgetOpen(true)}>
              <Target className="w-4 h-4 mr-2" />
              Set Budget
            </Button>
            <CampaignManager onCampaignCreated={() => queryClient.invalidateQueries(['ad-spends'])} />
          </div>
        </div>

        {/* Date Filter */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label className="text-xs">Start Date (BDT)</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
              </div>
              <div>
                <Label className="text-xs">End Date (BDT)</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setStartDate(toBDTDate(subDays(new Date(), 7))); setEndDate(toBDTDate()); }}>7 Days</Button>
                <Button variant="outline" size="sm" onClick={() => { setStartDate(toBDTDate(subDays(new Date(), 30))); setEndDate(toBDTDate()); }}>30 Days</Button>
                <Button variant="outline" size="sm" onClick={() => { setStartDate(toBDTDate(startOfMonth(new Date()))); setEndDate(toBDTDate(endOfMonth(new Date()))); }}>This Month</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Megaphone className="w-5 h-5 text-pink-600" />
              </div>
              <p className="text-2xl font-bold">৳{(metrics.totalAdSpend / 1000).toFixed(1)}K</p>
              <p className="text-xs text-slate-500">Ad Spend</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">৳{(metrics.totalRevenue / 1000).toFixed(1)}K</p>
              <p className="text-xs text-slate-500">Revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className={`w-5 h-5 ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.roi.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500">ROI</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{metrics.roas.toFixed(2)}x</p>
              <p className="text-xs text-slate-500">ROAS</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">৳{metrics.cpa.toFixed(0)}</p>
              <p className="text-xs text-slate-500">Cost per Order</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className={`w-5 h-5 ${metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ৳{(metrics.netProfit / 1000).toFixed(1)}K
              </p>
              <p className="text-xs text-slate-500">Net Profit</p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Alerts */}
        <BudgetAlerts budgets={budgets} adSpends={adSpends} />

        {/* Budget Progress */}
        {currentMonthBudget && (
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                {format(new Date(), 'MMMM yyyy')} Marketing Budget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Allocated: ৳{currentMonthBudget.allocated_amount?.toLocaleString()}</span>
                <span className={currentMonthBudget.utilization > 100 ? 'text-red-600 font-bold' : 'text-green-600'}>
                  Spent: ৳{currentMonthBudget.spent?.toLocaleString()} ({currentMonthBudget.utilization.toFixed(1)}%)
                </span>
              </div>
              <Progress 
                value={Math.min(currentMonthBudget.utilization, 100)} 
                className={`h-3 ${currentMonthBudget.utilization > 100 ? 'bg-red-100' : 'bg-slate-100'}`}
              />
              {currentMonthBudget.utilization > 80 && currentMonthBudget.utilization <= 100 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Budget nearing limit ({currentMonthBudget.utilization.toFixed(0)}% used)
                </div>
              )}
              {currentMonthBudget.utilization > 100 && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  Budget exceeded by ৳{Math.abs(currentMonthBudget.remaining).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border shadow-sm h-12 p-1 rounded-xl">
            <TabsTrigger value="overview" className="gap-2 rounded-lg data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />Overview
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2 rounded-lg data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <Megaphone className="w-4 h-4" />Campaigns
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2 rounded-lg data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <Target className="w-4 h-4" />Product ROI
            </TabsTrigger>
            <TabsTrigger value="budgets" className="gap-2 rounded-lg data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <DollarSign className="w-4 h-4" />Budgets
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-2 rounded-lg data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />Channels
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Distribution */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Ad Spend by Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={platformChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ৳${(value/1000).toFixed(1)}K`}
                        >
                          {platformChartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `৳${v.toLocaleString()}`} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Trend */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Spend vs Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => `৳${v.toLocaleString()}`} />
                        <Legend />
                        <Area type="monotone" dataKey="spend" name="Ad Spend" stroke="#EC4899" fill="#FCE7F3" />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" fill="#D1FAE5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="mt-6">
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Campaign</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Ad Spend</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.campaignStats.slice(0, 20).map((campaign, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{campaign.name || 'Unnamed'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{campaign.platform}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-pink-600">৳{campaign.spend.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{campaign.products.length}</TableCell>
                    </TableRow>
                  ))}
                  {metrics.campaignStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        No campaign data for selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Product ROI Tab */}
          <TabsContent value="products" className="mt-6">
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ad Spend</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.productROI.filter(p => p.adSpend > 0).slice(0, 30).map((product, idx) => {
                    const profit = product.revenue - product.cost - product.adSpend;
                    const roi = product.adSpend > 0 ? ((profit / product.adSpend) * 100) : 0;
                    return (
                      <TableRow key={idx} className="hover:bg-slate-50">
                        <TableCell className="font-medium max-w-xs truncate">{product.name}</TableCell>
                        <TableCell className="text-right text-pink-600">৳{product.adSpend.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">৳{product.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{product.orders}</TableCell>
                        <TableCell className={`text-right font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ৳{profit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={roi >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {roi.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Budgets Tab */}
          <TabsContent value="budgets" className="mt-6">
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Marketing Budgets by Period</CardTitle>
                <Button size="sm" onClick={() => setIsAddBudgetOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />Add Budget
                </Button>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.filter(b => b.category === 'marketing').slice(0, 12).map((budget, idx) => {
                    const spent = adSpends
                      .filter(s => s.spend_date?.startsWith(budget.period))
                      .reduce((sum, s) => sum + (s.total_spend_bdt || 0), 0);
                    const remaining = (budget.allocated_amount || 0) - spent;
                    const utilization = budget.allocated_amount > 0 ? (spent / budget.allocated_amount) * 100 : 0;
                    
                    return (
                      <TableRow key={idx} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{budget.period}</TableCell>
                        <TableCell className="text-right">৳{budget.allocated_amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-pink-600">৳{spent.toLocaleString()}</TableCell>
                        <TableCell className={`text-right ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ৳{remaining.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(utilization, 100)} className="h-2 w-20" />
                            <span className="text-xs">{utilization.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            utilization > 100 ? 'bg-red-100 text-red-800' :
                            utilization > 80 ? 'bg-amber-100 text-amber-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {utilization > 100 ? 'Exceeded' : utilization > 80 ? 'Near Limit' : 'On Track'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Channels Performance Tab */}
          <TabsContent value="channels" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics.platformStats).map(([platform, data], idx) => {
                const platformOrders = filteredOrders.filter(o => {
                  const orderProducts = (o.order_items || []).map(i => i.inventory_id);
                  const platformProducts = filteredAdSpends
                    .filter(s => s.platform === platform)
                    .flatMap(s => (s.products || []).map(p => p.inventory_id));
                  return orderProducts.some(p => platformProducts.includes(p));
                });
                const platformRevenue = platformOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                const platformROI = data.spend > 0 ? ((platformRevenue - data.spend) / data.spend) * 100 : 0;
                
                return (
                  <Card key={platform} className="bg-white border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            platform === 'facebook' ? 'bg-blue-100' :
                            platform === 'google' ? 'bg-red-100' :
                            platform === 'instagram' ? 'bg-pink-100' :
                            platform === 'tiktok' ? 'bg-slate-100' : 'bg-purple-100'
                          }`}>
                            <Megaphone className={`w-5 h-5 ${
                              platform === 'facebook' ? 'text-blue-600' :
                              platform === 'google' ? 'text-red-600' :
                              platform === 'instagram' ? 'text-pink-600' :
                              platform === 'tiktok' ? 'text-slate-600' : 'text-purple-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold capitalize">{platform}</p>
                            <p className="text-xs text-slate-500">{data.campaigns} campaigns</p>
                          </div>
                        </div>
                        <Badge className={platformROI >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {platformROI.toFixed(0)}% ROI
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Spend</p>
                          <p className="font-bold text-pink-600">৳{data.spend.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Revenue</p>
                          <p className="font-bold text-green-600">৳{platformRevenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Channel Budget Allocation */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Set Channel Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">
                  Set monthly budgets per channel using the "Set Budget" button. Select the platform when creating the budget to track channel-specific spending.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {['facebook', 'google', 'instagram', 'tiktok', 'youtube', 'other'].map(platform => {
                    const spend = metrics.platformStats[platform]?.spend || 0;
                    return (
                      <div key={platform} className="p-3 bg-slate-50 rounded-lg text-center">
                        <p className="text-xs text-slate-500 capitalize">{platform}</p>
                        <p className="font-bold">৳{(spend / 1000).toFixed(1)}K</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Campaign Dialog */}
      <Dialog open={isAddCampaignOpen} onOpenChange={setIsAddCampaignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Ad Spend</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createAdSpendMutation.mutate(newCampaign); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={newCampaign.campaign_name}
                  onChange={(e) => setNewCampaign({...newCampaign, campaign_name: e.target.value})}
                  placeholder="Campaign name"
                />
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={newCampaign.platform} onValueChange={(v) => setNewCampaign({...newCampaign, platform: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Spend Date</Label>
                <Input type="date" value={newCampaign.spend_date} onChange={(e) => setNewCampaign({...newCampaign, spend_date: e.target.value})} />
              </div>
              <div>
                <Label>Amount (USD)</Label>
                <Input type="number" step="0.01" value={newCampaign.total_spend_usd} onChange={(e) => setNewCampaign({...newCampaign, total_spend_usd: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>USD Rate</Label>
                <Input type="number" value={newCampaign.usd_to_bdt_rate} onChange={(e) => setNewCampaign({...newCampaign, usd_to_bdt_rate: parseFloat(e.target.value) || 120})} />
              </div>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg">
              <p className="text-sm text-pink-800">
                <strong>Total in BDT:</strong> ৳{((newCampaign.total_spend_usd || 0) * (newCampaign.usd_to_bdt_rate || 120)).toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newCampaign.notes}
                onChange={(e) => setNewCampaign({...newCampaign, notes: e.target.value})}
                placeholder="Campaign notes..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddCampaignOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700">Record Spend</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Budget Dialog */}
      <Dialog open={isAddBudgetOpen} onOpenChange={setIsAddBudgetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Marketing Budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createBudgetMutation.mutate(newBudget); }} className="space-y-4">
            <div>
              <Label>Period (Month)</Label>
              <Input type="month" value={newBudget.period} onChange={(e) => setNewBudget({...newBudget, period: e.target.value})} />
            </div>
            <div>
              <Label>Budget Amount (BDT)</Label>
              <Input type="number" value={newBudget.allocated_amount} onChange={(e) => setNewBudget({...newBudget, allocated_amount: parseFloat(e.target.value) || 0})} placeholder="0" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newBudget.notes} onChange={(e) => setNewBudget({...newBudget, notes: e.target.value})} rows={2} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddBudgetOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700">Set Budget</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withPermission(MarketingROIPage, 'marketing_roi', 'can_view');
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  Package, DollarSign, ShoppingCart, BarChart3, Download,
  Search, Activity, PackageX, RotateCcw, ShoppingBag,
  Loader2, ChevronDown, ChevronUp, Target
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { withPermission } from '../components/common/PermissionGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdSpendTracker from '../components/analytics/AdSpendTracker';
import ROIGenerator from '../components/analytics/ROIGenerator';
import ProductTrends from '../components/analytics/ProductTrends';
import LowStockAlerts from '../components/analytics/LowStockAlerts';
import InventoryABCAnalysis from '../components/analytics/InventoryABCAnalysis';

const COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#A855F7'];

function ProductAnalyticsDashboard() {
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-analytics'],
    queryFn: () => erp.entities.Inventory.list('-updated_date', 2000),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['all-orders-analytics'],
    queryFn: () => erp.entities.Order.filter({ department: 'prodhan_com_e_commerce' }, '-order_date', 5000),
    staleTime: 5 * 60 * 1000
  });

  const { data: allMovements = [] } = useQuery({
    queryKey: ['all-movements-analytics'],
    queryFn: () => erp.entities.InventoryMovement.list('-movement_date', 5000),
    staleTime: 5 * 60 * 1000
  });

  const { data: analyticsData = { success: true, data: [] }, isLoading: analyticsLoading } = useQuery({
    queryKey: ['productAnalytics', selectedProductIds, startDate, endDate, selectedDepartment],
    queryFn: async () => {
      if (!selectedProductIds || selectedProductIds.length === 0) return { success: true, data: [] };
      try {
        const response = await erp.functions.invoke('getProductMovementAnalytics', {
          productIds: selectedProductIds,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          department: selectedDepartment
        });
        return response?.data?.success ? response.data : { success: true, data: [] };
      } catch (error) {
        console.error('Analytics fetch error:', error);
        return { success: true, data: [] };
      }
    },
    enabled: inventory.length > 0 && selectedProductIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const availableProducts = useMemo(() => {
    return inventory.filter(item => {
      const matchesDepartment = selectedDepartment === 'all' || item.department === selectedDepartment;
      const matchesSearch = searchQuery === '' || 
        item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.isbn?.includes(searchQuery);
      return matchesDepartment && matchesSearch;
    });
  }, [inventory, selectedDepartment, searchQuery]);

  const safeAnalyticsData = useMemo(() => {
    return analyticsData?.data && Array.isArray(analyticsData.data) ? analyticsData.data : [];
  }, [analyticsData]);

  const aggregateStats = useMemo(() => {
    if (safeAnalyticsData.length === 0) return { totalRevenue: 0, totalSold: 0, totalPurchased: 0, totalReturned: 0, totalDamaged: 0, totalStockValue: 0 };
    return {
      totalRevenue: safeAnalyticsData.reduce((sum, m) => sum + (m?.totalRevenue || 0), 0),
      totalSold: safeAnalyticsData.reduce((sum, m) => sum + (m?.totalSold || 0), 0),
      totalPurchased: safeAnalyticsData.reduce((sum, m) => sum + (m?.totalPurchasedQty || 0), 0),
      totalReturned: safeAnalyticsData.reduce((sum, m) => sum + (m?.totalReturnedQty || 0), 0),
      totalDamaged: safeAnalyticsData.reduce((sum, m) => sum + (m?.totalDamagedQty || 0), 0),
      totalStockValue: safeAnalyticsData.reduce((sum, m) => sum + (m?.stockValue || 0), 0),
    };
  }, [safeAnalyticsData]);

  const handleProductToggle = (productId) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    setSelectedProductIds(prev => 
      prev.length === availableProducts.length ? [] : availableProducts.map(p => p.id)
    );
  };

  const handleExport = async () => {
    if (safeAnalyticsData.length === 0) { toast.error('Select products first'); return; }
    setIsExporting(true);
    try {
      const { data } = await erp.functions.invoke('generateProductAnalyticsReport', {
        productMetrics: safeAnalyticsData,
        dateRange: `${startDate} to ${endDate}`,
        department: selectedDepartment
      });
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Analytics_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  if (inventoryLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" />
          </div>
          <p className="text-slate-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="w-full px-3 py-3 sm:p-6 space-y-3 sm:space-y-6">
        
        {/* Tabs for different sections */}
        <Tabs defaultValue="analytics" className="w-full space-y-3 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
            <TabsList className="bg-white p-1 rounded-xl border shadow-sm inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="analytics" className="gap-1.5 rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 whitespace-nowrap">
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5 rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 whitespace-nowrap">
                <Activity className="w-3.5 h-3.5" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="lowstock" className="gap-1.5 rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 whitespace-nowrap">
                <Package className="w-3.5 h-3.5" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="abc" className="gap-1.5 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 whitespace-nowrap">
                <Target className="w-3.5 h-3.5" />
                ABC
              </TabsTrigger>
              <TabsTrigger value="adspend" className="gap-1.5 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 whitespace-nowrap">
                <DollarSign className="w-3.5 h-3.5" />
                Ad Spend
              </TabsTrigger>
              <TabsTrigger value="roi" className="gap-1.5 rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 whitespace-nowrap">
                <DollarSign className="w-3.5 h-3.5" />
                ROI
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="space-y-3 sm:space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-semibold text-[#111827] tracking-tight">Product Analytics</h1>
            <p className="text-xs sm:text-sm text-[#6B7280]">Deep-dive analytics for inventory performance</p>
          </div>
        </div>

        {/* Filters Row */}
        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-slate-600">Search Products</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Name, ISBN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Product Selection */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 px-4 pt-4">
              <CardTitle className="text-sm font-semibold text-[#111827] flex items-center justify-between">
                <span>Select Products</span>
                <Badge variant="outline">{selectedProductIds.length} selected</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <Button onClick={handleSelectAll} variant="outline" size="sm" className="w-full mb-3">
                {selectedProductIds.length === availableProducts.length ? 'Deselect All' : 'Select All'}
              </Button>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {availableProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => handleProductToggle(product.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                      selectedProductIds.includes(product.id)
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-medium text-slate-800 truncate">{product.item_name}</p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="outline" className="text-xs py-0">
                        {product.department === 'boibari' ? '📚' : '🛒'} {product.current_stock}
                      </Badge>
                      <Badge variant="outline" className="text-xs py-0">৳{product.selling_price}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analytics Display */}
          <div className="lg:col-span-2 space-y-6">
            {analyticsLoading && selectedProductIds.length > 0 && (
              <Card className="p-8">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-violet-600 mx-auto mb-3" />
                  <p className="text-slate-600">Analyzing {selectedProductIds.length} products...</p>
                </div>
              </Card>
            )}

            {selectedProductIds.length === 0 && (
              <Card className="p-8">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Select products to view analytics</p>
                </div>
              </Card>
            )}

            {safeAnalyticsData.length > 0 && !analyticsLoading && (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
                  {[
                    { label: 'Purchased', value: aggregateStats.totalPurchased, icon: ShoppingBag, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Sold', value: aggregateStats.totalSold, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Revenue', value: `৳${(aggregateStats.totalRevenue/1000).toFixed(0)}k`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Returns', value: aggregateStats.totalReturned, icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Damaged', value: aggregateStats.totalDamaged, icon: PackageX, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Stock Value', value: `৳${(aggregateStats.totalStockValue/1000).toFixed(0)}k`, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map((stat, i) => (
                    <Card key={i} className="bg-white border border-slate-200">
                      <CardContent className="p-3 text-center">
                        <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-slate-500">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white border border-slate-200">
                    <CardHeader className="pb-2 border-b border-slate-100">
                      <CardTitle className="text-sm font-semibold text-slate-800">Revenue by Product</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={safeAnalyticsData.slice(0, 6).map((m, i) => ({
                                name: m?.product_name?.substring(0, 12),
                                value: m?.totalRevenue || 0,
                                fill: COLORS[i % COLORS.length]
                              }))}
                              cx="50%" cy="50%"
                              outerRadius={70} innerRadius={35}
                              dataKey="value"
                            >
                              {safeAnalyticsData.slice(0, 6).map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip formatter={(v) => [`৳${v.toLocaleString()}`, 'Revenue']} />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200">
                    <CardHeader className="pb-2 border-b border-slate-100">
                      <CardTitle className="text-sm font-semibold text-slate-800">Stock vs Sales</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={safeAnalyticsData.slice(0, 5).map(m => ({
                              name: m?.product_name?.substring(0, 8),
                              stock: m?.current_stock || 0,
                              sold: m?.totalSold || 0
                            }))}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 9 }} />
                            <ChartTooltip />
                            <Bar dataKey="stock" fill="#7C3AED" name="Stock" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="sold" fill="#10B981" name="Sold" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Product Details */}
                {safeAnalyticsData.map((metric, index) => (
                  <Card key={metric.product_id} className="bg-white border-0 shadow-sm rounded-xl">
                    <CardHeader className="pb-3 border-b border-slate-100 px-5 pt-5">
                      <CardTitle className="text-sm font-semibold text-[#111827] flex items-center justify-between">
                        <span>{metric.product_name}</span>
                        <Badge className={metric.department === 'boibari' ? 'bg-cyan-100 text-cyan-800' : 'bg-purple-100 text-purple-800'}>
                          {metric.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Current Stock</p>
                          <p className="text-lg font-bold text-slate-800">{metric.current_stock}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Purchase Price</p>
                          <p className="text-lg font-bold text-slate-800">৳{metric.purchase_price}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Selling Price</p>
                          <p className="text-lg font-bold text-green-600">৳{metric.selling_price}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Profit Margin</p>
                          <p className={`text-lg font-bold ${metric.profitMargin > 25 ? 'text-green-600' : metric.profitMargin > 10 ? 'text-amber-600' : 'text-red-600'}`}>
                            {metric.profitMargin?.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Stock Value</p>
                          <p className="text-base font-semibold">৳{metric.stockValue?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Potential Revenue</p>
                          <p className="text-base font-semibold text-blue-600">৳{metric.potentialRevenue?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total Movements</p>
                          <p className="text-base font-semibold">{metric.totalMovements}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Lead Time</p>
                          <p className="text-base font-semibold">{metric.supplier_lead_time_days || 'N/A'} days</p>
                        </div>
                      </div>

                      {/* Movement Analysis */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="w-4 h-4 text-violet-600" />
                          <h4 className="font-semibold text-slate-800 text-sm">Complete Movement Analysis</h4>
                          <Badge variant="outline" className="ml-auto text-xs">{startDate} - {endDate}</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                          <div className="bg-white p-2 sm:p-2.5 rounded-lg border border-green-200">
                            <div className="flex items-center gap-1.5 mb-1">
                              <ShoppingBag className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">Purchased</span>
                            </div>
                            <p className="text-lg font-bold text-green-800">{metric.totalPurchasedQty} units</p>
                            <p className="text-xs text-green-600">Value: ৳{metric.totalPurchasedValue?.toLocaleString()}</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-1.5 mb-1">
                              <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-xs text-blue-700 font-medium">Sold</span>
                            </div>
                            <p className="text-lg font-bold text-blue-800">{metric.totalSold} units</p>
                            <p className="text-xs text-blue-600">Revenue: ৳{metric.totalRevenue?.toLocaleString()}</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-1.5 mb-1">
                              <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                              <span className="text-xs text-orange-700 font-medium">Returned</span>
                            </div>
                            <p className="text-lg font-bold text-orange-800">{metric.totalReturnedQty} units</p>
                            <p className="text-xs text-orange-600">Loss: ৳{metric.totalReturnedValue?.toLocaleString()}</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-red-200">
                            <div className="flex items-center gap-1.5 mb-1">
                              <PackageX className="w-3.5 h-3.5 text-red-600" />
                              <span className="text-xs text-red-700 font-medium">Damaged</span>
                            </div>
                            <p className="text-lg font-bold text-red-800">{metric.totalDamagedQty} units</p>
                            <p className="text-xs text-red-600">Loss: ৳{metric.totalDamagedValue?.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">Total Loss (Returns + Damages):</span>
                          <span className="font-bold text-slate-800">৳{metric.totalLossValue?.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="trends">
            <ProductTrends inventory={inventory} orders={allOrders} movements={allMovements} />
          </TabsContent>

          <TabsContent value="lowstock">
            <LowStockAlerts inventory={inventory} orders={allOrders} movements={allMovements} />
          </TabsContent>

          <TabsContent value="abc">
            <InventoryABCAnalysis inventory={inventory} orders={allOrders} movements={allMovements} />
          </TabsContent>

          <TabsContent value="adspend">
            <AdSpendTracker />
          </TabsContent>

          <TabsContent value="roi">
            <ROIGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default withPermission(ProductAnalyticsDashboard, 'product_analytics', 'can_view');
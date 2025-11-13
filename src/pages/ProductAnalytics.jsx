import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart,
  AlertCircle, BarChart3, PieChart as PieChartIcon, Download,
  Filter, Search, Activity, PackageX, RotateCcw, ShoppingBag,
  Info, HelpCircle, Loader2, RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { withPermission } from '../components/common/PermissionGuard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

// Info Modal Component
const MetricsInfoModal = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-violet-600" />
            Understanding Product Analytics Metrics
          </DialogTitle>
          <DialogDescription>
            Comprehensive guide to all metrics and calculations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">📦 Purchases</h3>
            <p className="text-green-700">Total units and value added to inventory from suppliers during the selected period.</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">🛍️ Sales</h3>
            <p className="text-blue-700">Units sold and revenue generated from customer orders. Based on order data.</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-800 mb-2">↩️ Returns</h3>
            <p className="text-orange-700">Products returned by customers. Includes quantity and estimated financial impact based on selling price.</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ Damages</h3>
            <p className="text-red-700">Products damaged, expired, or written off. Represents total loss to business.</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">📊 Profit Margin</h3>
            <p className="text-purple-700">Formula: ((Selling Price - Purchase Price) / Selling Price) × 100</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">💰 Total Loss</h3>
            <p className="text-gray-700">Sum of return value + damage value. Shows total financial impact from non-sold products.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function ProductAnalyticsDashboard() {
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [isExporting, setIsExporting] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => Inventory.list(),
  });

  // Use backend function for analytics calculation
  const startDate = useMemo(() => {
    return subDays(new Date(), parseInt(dateRange)).toISOString();
  }, [dateRange]);

  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['productAnalytics', selectedProductIds, startDate, selectedDepartment],
    queryFn: async () => {
      if (selectedProductIds.length === 0) return null;

      const response = await base44.functions.invoke('getProductMovementAnalytics', {
        productIds: selectedProductIds,
        startDate: startDate,
        endDate: new Date().toISOString(),
        department: selectedDepartment
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch analytics');
      }
    },
    enabled: selectedProductIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });

  const availableProducts = useMemo(() => {
    return inventory.filter(item => {
      const matchesDepartment = selectedDepartment === 'all' || item.department === selectedDepartment;
      const matchesSearch = searchQuery === '' || 
        item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.isbn?.includes(searchQuery) ||
        item.barcode?.includes(searchQuery);
      return matchesDepartment && matchesSearch;
    });
  }, [inventory, selectedDepartment, searchQuery]);

  const selectedProducts = useMemo(() => {
    return inventory.filter(item => selectedProductIds.includes(item.id));
  }, [inventory, selectedProductIds]);

  // Generate sales trend from analytics data
  const salesTrend = useMemo(() => {
    if (!analyticsData?.data) return [];

    const trend = [];
    for (let i = parseInt(dateRange); i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Aggregate daily data across all selected products
      const dayData = {
        date: format(date, 'MMM dd'),
        revenue: 0,
        quantity: 0,
        purchases: 0,
        returns: 0,
        damages: 0
      };

      trend.push(dayData);
    }
    
    return trend;
  }, [analyticsData, dateRange]);

  const handleExportPDF = async () => {
    if (selectedProducts.length === 0 || !analyticsData) {
      toast.error('Please select products first');
      return;
    }

    setIsExporting(true);
    toast.loading('Generating professional PDF report...', { id: 'pdf-export' });

    try {
      const { data } = await base44.functions.invoke('generateProductAnalyticsReport', {
        productMetrics: analyticsData.data,
        dateRange: dateRange,
        department: selectedDepartment
      });

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Product_Analytics_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('PDF report downloaded successfully!', { id: 'pdf-export' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(`Failed to generate PDF: ${error.message}`, { id: 'pdf-export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!analyticsData?.data || selectedProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }

    const exportData = analyticsData.data.map(metric => ({
      'Product Name': metric.product_name,
      'Department': metric.department === 'boibari' ? 'Boibari' : 'Prodhan.com',
      'Category': metric.category,
      'Current Stock': metric.current_stock,
      'Purchased Qty': metric.totalPurchasedQty,
      'Purchased Value': metric.totalPurchasedValue,
      'Units Sold': metric.totalSold,
      'Total Revenue': metric.totalRevenue,
      'Total Orders': metric.totalOrders,
      'Average Order Value': Math.round(metric.avgOrderValue),
      'Returned Qty': metric.totalReturnedQty,
      'Returned Value': metric.totalReturnedValue,
      'Damaged Qty': metric.totalDamagedQty,
      'Damaged Value': metric.totalDamagedValue,
      'Total Loss': metric.totalLossValue,
      'Stock Value': metric.stockValue,
      'Potential Revenue': metric.potentialRevenue,
      'Profit Margin %': metric.profitMargin.toFixed(2),
      'Purchase Price': metric.purchase_price,
      'Selling Price': metric.selling_price
    }));

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Product_Analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Data exported to Excel!');
  };

  const handleProductToggle = (productId) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === availableProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(availableProducts.map(p => p.id));
    }
  };

  if (inventoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto" />
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  const aggregateStats = useMemo(() => {
    if (!analyticsData?.data) return null;

    return {
      totalRevenue: analyticsData.data.reduce((sum, m) => sum + (m.totalRevenue || 0), 0),
      totalSold: analyticsData.data.reduce((sum, m) => sum + (m.totalSold || 0), 0),
      totalPurchased: analyticsData.data.reduce((sum, m) => sum + (m.totalPurchasedQty || 0), 0),
      totalPurchasedValue: analyticsData.data.reduce((sum, m) => sum + (m.totalPurchasedValue || 0), 0),
      totalReturned: analyticsData.data.reduce((sum, m) => sum + (m.totalReturnedQty || 0), 0),
      totalReturnedValue: analyticsData.data.reduce((sum, m) => sum + (m.totalReturnedValue || 0), 0),
      totalDamaged: analyticsData.data.reduce((sum, m) => sum + (m.totalDamagedQty || 0), 0),
      totalDamagedValue: analyticsData.data.reduce((sum, m) => sum + (m.totalDamagedValue || 0), 0),
      totalStockValue: analyticsData.data.reduce((sum, m) => sum + (m.stockValue || 0), 0),
      totalOrders: analyticsData.data.reduce((sum, m) => sum + (m.totalOrders || 0), 0)
    };
  }, [analyticsData]);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-display text-gradient flex items-center gap-3 flex-wrap">
                Product Analytics Dashboard
                {selectedDepartment !== 'all' && (
                  <Badge className={selectedDepartment === 'boibari' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                    {selectedDepartment === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}
                  </Badge>
                )}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoModal(true)}
                className="text-violet-600 hover:text-violet-700"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1">
              Comprehensive product performance with purchases, sales, returns & damages tracking
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleExportExcel} 
              variant="outline" 
              disabled={!analyticsData}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
            <Button 
              onClick={handleExportPDF} 
              disabled={!analyticsData || isExporting}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Product Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Select Products to Analyze
                </span>
                <Badge variant="outline">
                  {selectedProductIds.length} selected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Search Products</Label>
                  <Input
                    placeholder="Search by name, ISBN, barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Department Filter</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="boibari">📚 Boibari</SelectItem>
                      <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedDepartment !== 'all' && (
                <div className={`p-3 rounded-lg border-2 ${
                  selectedDepartment === 'boibari' ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300'
                }`}>
                  <p className="text-sm font-medium">
                    Showing products from: <strong>{selectedDepartment === 'boibari' ? '📚 Boibari.com (Books)' : '🛒 Prodhan.com (E-commerce)'}</strong>
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSelectAll} variant="outline" size="sm">
                  {selectedProductIds.length === availableProducts.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedProductIds.length > 0 && (
                  <Button onClick={() => setSelectedProductIds([])} variant="outline" size="sm">
                    Clear Selection
                  </Button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                {availableProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No products found</p>
                ) : (
                  availableProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => handleProductToggle(product.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedProductIds.includes(product.id)
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{product.item_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {product.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Stock: {product.current_stock}
                            </Badge>
                            {product.isbn && (
                              <Badge variant="outline" className="text-xs">
                                ISBN: {product.isbn}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-violet-600">৳{product.selling_price?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Analytics Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="60">Last 60 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="180">Last 6 Months</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Products:</p>
                {selectedProductIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No products selected</p>
                ) : (
                  <div className="space-y-1">
                    {selectedProducts.slice(0, 5).map(product => (
                      <p key={product.id} className="text-xs text-muted-foreground truncate">
                        • {product.item_name}
                      </p>
                    ))}
                    {selectedProducts.length > 5 && (
                      <p className="text-xs text-violet-600 font-medium">
                        + {selectedProducts.length - 5} more
                      </p>
                    )}
                  </div>
                )}
              </div>

              {analyticsData && (
                <div className="space-y-2 pt-4 border-t">
                  <Button onClick={handleExportExcel} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export to Excel
                  </Button>
                  <Button onClick={handleExportPDF} disabled={isExporting} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {analyticsLoading && selectedProductIds.length > 0 && (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold">Analyzing Products...</h3>
                <p className="text-muted-foreground mt-2">
                  Processing movement data for {selectedProductIds.length} product{selectedProductIds.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Error State */}
        {analyticsError && (
          <Card className="p-12 border-2 border-red-200 bg-red-50">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-red-800">Analytics Error</h3>
                <p className="text-red-600 mt-2">
                  {analyticsError.message || 'Failed to load analytics data'}
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  className="mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {selectedProductIds.length === 0 && !analyticsLoading && (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              <div>
                <h3 className="text-xl font-semibold">Select Products to Analyze</h3>
                <p className="text-muted-foreground mt-2">
                  Choose one or more products from the list above to view detailed analytics
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Analytics Display */}
        {analyticsData?.data && aggregateStats && !analyticsLoading && (
          <>
            {/* Enhanced Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="premium-card border-l-4 border-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Purchases
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Units added from suppliers</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        {aggregateStats.totalPurchased.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ৳{aggregateStats.totalPurchasedValue.toLocaleString()}
                      </p>
                    </div>
                    <ShoppingBag className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card border-l-4 border-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Sales Revenue
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Revenue from customer orders</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-xl font-bold text-blue-600">
                        ৳{aggregateStats.totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {aggregateStats.totalOrders} orders
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card border-l-4 border-indigo-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Units Sold
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total quantity sold</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-xl font-bold text-indigo-600">
                        {aggregateStats.totalSold.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last {dateRange} days
                      </p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-indigo-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card border-l-4 border-orange-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Returns
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Customer returns & refunds</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-xl font-bold text-orange-600">
                        {aggregateStats.totalReturned.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ৳{aggregateStats.totalReturnedValue.toLocaleString()}
                      </p>
                    </div>
                    <RotateCcw className="w-8 h-8 text-orange-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card border-l-4 border-red-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Damages
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Damaged/written-off products</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-xl font-bold text-red-600">
                        {aggregateStats.totalDamaged.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ৳{aggregateStats.totalDamagedValue.toLocaleString()}
                      </p>
                    </div>
                    <PackageX className="w-8 h-8 text-red-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card border-l-4 border-purple-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Stock Value</p>
                      <p className="text-xl font-bold text-purple-600">
                        ৳{aggregateStats.totalStockValue.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current inventory
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Table with All Movement Types */}
            <Card>
              <CardHeader>
                <CardTitle>Comprehensive Product Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-semibold">Product</th>
                        <th className="text-center py-3 px-2 font-semibold">Stock</th>
                        <th className="text-right py-3 px-2 font-semibold">Purchased</th>
                        <th className="text-right py-3 px-2 font-semibold">Sold</th>
                        <th className="text-right py-3 px-2 font-semibold">Returned</th>
                        <th className="text-right py-3 px-2 font-semibold">Damaged</th>
                        <th className="text-right py-3 px-2 font-semibold">Revenue</th>
                        <th className="text-right py-3 px-2 font-semibold">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.data.map((metric, index) => (
                        <tr key={metric.product_id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <div>
                                <p className="font-medium">{metric.product_name}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {metric.category}
                                  </Badge>
                                  {metric.isbn && (
                                    <Badge variant="outline" className="text-xs">
                                      {metric.isbn}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge variant={metric.current_stock < metric.minimum_stock ? 'destructive' : 'default'}>
                              {metric.current_stock}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="font-medium text-green-600">{metric.totalPurchasedQty}</div>
                            <div className="text-xs text-muted-foreground">৳{metric.totalPurchasedValue.toLocaleString()}</div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="font-medium text-blue-600">{metric.totalSold}</div>
                            <div className="text-xs text-muted-foreground">{metric.totalOrders} orders</div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="font-medium text-orange-600">{metric.totalReturnedQty}</div>
                            <div className="text-xs text-muted-foreground">৳{metric.totalReturnedValue.toLocaleString()}</div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="font-medium text-red-600">{metric.totalDamagedQty}</div>
                            <div className="text-xs text-muted-foreground">৳{metric.totalDamagedValue.toLocaleString()}</div>
                          </td>
                          <td className="py-3 px-2 text-right font-semibold text-green-600">
                            ৳{metric.totalRevenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Badge variant="outline" className={
                              metric.profitMargin > 30 ? 'bg-green-100 text-green-800' :
                              metric.profitMargin > 15 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {metric.profitMargin.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Individual Product Insights - ALWAYS SHOW RETURN & DAMAGE */}
            {analyticsData.data.map((metric, index) => (
              <Card key={metric.product_id} className="border-l-4" style={{ borderColor: COLORS[index % COLORS.length] }}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{metric.product_name}</span>
                    <Badge className={
                      metric.department === 'boibari' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }>
                      {metric.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Core Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Stock</p>
                      <p className="text-lg font-bold">{metric.current_stock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Purchase Price</p>
                      <p className="text-lg font-bold">৳{metric.purchase_price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Selling Price</p>
                      <p className="text-lg font-bold text-green-600">৳{metric.selling_price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Profit Margin</p>
                      <p className="text-lg font-bold text-violet-600">{metric.profitMargin.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stock Value</p>
                      <p className="text-lg font-bold">৳{metric.stockValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Potential Revenue</p>
                      <p className="text-lg font-bold text-blue-600">৳{metric.potentialRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Movements</p>
                      <p className="text-lg font-bold">{metric.totalMovements}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Supplier Lead Time</p>
                      <p className="text-lg font-bold">{metric.supplier_lead_time_days || 'N/A'} days</p>
                    </div>
                  </div>

                  {/* ALWAYS SHOW: Complete Movement Breakdown */}
                  <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border-2 border-violet-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-violet-600" />
                      <h4 className="font-semibold text-violet-800">Complete Movement Analysis</h4>
                      <Badge variant="outline" className="ml-auto">
                        Last {dateRange} days
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Purchases */}
                      <div className="bg-white/70 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingBag className="w-4 h-4 text-green-600" />
                          <p className="text-xs font-medium text-green-700">Purchased</p>
                        </div>
                        <p className="text-xl font-bold text-green-800">{metric.totalPurchasedQty} units</p>
                        <p className="text-sm text-green-600">Value: ৳{metric.totalPurchasedValue.toLocaleString()}</p>
                      </div>

                      {/* Sales */}
                      <div className="bg-white/70 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingCart className="w-4 h-4 text-blue-600" />
                          <p className="text-xs font-medium text-blue-700">Sold</p>
                        </div>
                        <p className="text-xl font-bold text-blue-800">{metric.totalSold} units</p>
                        <p className="text-sm text-blue-600">Revenue: ৳{metric.totalRevenue.toLocaleString()}</p>
                      </div>

                      {/* Returns */}
                      <div className="bg-white/70 p-3 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-1">
                          <RotateCcw className="w-4 h-4 text-orange-600" />
                          <p className="text-xs font-medium text-orange-700">Returned</p>
                        </div>
                        <p className="text-xl font-bold text-orange-800">{metric.totalReturnedQty} units</p>
                        <p className="text-sm text-orange-600">Loss: ৳{metric.totalReturnedValue.toLocaleString()}</p>
                      </div>

                      {/* Damages */}
                      <div className="bg-white/70 p-3 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-1">
                          <PackageX className="w-4 h-4 text-red-600" />
                          <p className="text-xs font-medium text-red-700">Damaged</p>
                        </div>
                        <p className="text-xl font-bold text-red-800">{metric.totalDamagedQty} units</p>
                        <p className="text-sm text-red-600">Loss: ৳{metric.totalDamagedValue.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Total Loss Summary */}
                    <div className="mt-3 pt-3 border-t border-violet-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-violet-600" />
                          <p className="text-sm font-semibold text-violet-800">Total Loss (Returns + Damages):</p>
                        </div>
                        <p className="text-lg font-bold text-violet-800">
                          ৳{metric.totalLossValue.toLocaleString()}
                        </p>
                      </div>
                      {metric.current_stock > 0 && (
                        <p className="text-xs text-violet-600 mt-1">
                          Loss represents {((metric.totalReturnedQty + metric.totalDamagedQty) / metric.current_stock * 100).toFixed(1)}% of current stock
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Low Stock Alert */}
                  {metric.current_stock < metric.minimum_stock && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-800">Low Stock Alert</p>
                        <p className="text-sm text-red-700">
                          Current stock ({metric.current_stock}) is below minimum ({metric.minimum_stock}). 
                          Consider reordering soon.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Supplier Info */}
                  {metric.supplier_name && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Primary Supplier:</p>
                      <p className="text-sm text-muted-foreground">
                        {metric.supplier_name} 
                        {metric.supplier_contact && ` • ${metric.supplier_contact}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* Info Modal */}
        <MetricsInfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
      </div>
    </TooltipProvider>
  );
}

export default withPermission(ProductAnalyticsDashboard, 'inventory', 'can_view');
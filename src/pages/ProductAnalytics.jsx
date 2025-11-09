
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { Order } from '@/entities/Order';
import { InventoryMovement } from '@/entities/InventoryMovement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart,
  AlertCircle, BarChart3, PieChart as PieChartIcon, Download,
  Calendar, Filter, Search, Activity
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { withPermission } from '../components/common/PermissionGuard';

const COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

function ProductAnalyticsDashboard() {
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('30'); // days
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => Inventory.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => Order.list('-order_date', 1000),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.InventoryMovement.list('-movement_date', 1000),
  });

  // Filter products by department and search
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

  // Get selected products details
  const selectedProducts = useMemo(() => {
    return inventory.filter(item => selectedProductIds.includes(item.id));
  }, [inventory, selectedProductIds]);

  // Calculate analytics for selected products
  const analytics = useMemo(() => {
    if (selectedProducts.length === 0) return null;

    const cutoffDate = subDays(new Date(), parseInt(dateRange));

    // Filter orders containing selected products
    const relevantOrders = orders.filter(order => {
      const orderDate = new Date(order.order_date);
      const isInDateRange = orderDate >= cutoffDate;
      const hasSelectedProduct = order.order_items?.some(item => 
        selectedProductIds.includes(item.inventory_id)
      );
      return isInDateRange && hasSelectedProduct;
    });

    // Calculate per-product metrics
    const productMetrics = selectedProducts.map(product => {
      const productOrders = relevantOrders.filter(order =>
        order.order_items?.some(item => item.inventory_id === product.id)
      );

      const totalSold = productOrders.reduce((sum, order) => {
        const item = order.order_items.find(i => i.inventory_id === product.id);
        return sum + (item?.quantity || 0);
      }, 0);

      const totalRevenue = productOrders.reduce((sum, order) => {
        const item = order.order_items.find(i => i.inventory_id === product.id);
        return sum + (item?.subtotal || 0);
      }, 0);

      const avgOrderValue = productOrders.length > 0 ? totalRevenue / productOrders.length : 0;
      
      const stockValue = product.current_stock * product.purchase_price;
      const potentialRevenue = product.current_stock * product.selling_price;
      const profitMargin = product.selling_price > 0 
        ? ((product.selling_price - product.purchase_price) / product.selling_price) * 100 
        : 0;

      // Movement analysis
      const productMovements = movements.filter(m => m.inventory_item_id === product.id);
      const outboundMovements = productMovements.filter(m => m.movement_type === 'out' && new Date(m.movement_date) >= cutoffDate);
      const totalMovementValue = Math.abs(outboundMovements.reduce((sum, m) => sum + (m.total_value || 0), 0));

      return {
        product,
        totalSold,
        totalRevenue,
        totalOrders: productOrders.length,
        avgOrderValue,
        stockValue,
        potentialRevenue,
        profitMargin,
        totalMovements: outboundMovements.length,
        movementValue: totalMovementValue
      };
    });

    // Aggregate metrics
    const totalRevenue = productMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalSold = productMetrics.reduce((sum, m) => sum + m.totalSold, 0);
    const totalOrders = relevantOrders.length;
    const totalStockValue = productMetrics.reduce((sum, m) => sum + m.stockValue, 0);

    // Sales trend data (daily for last period)
    const salesTrend = [];
    for (let i = parseInt(dateRange); i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayOrders = relevantOrders.filter(order => {
        const orderDate = new Date(order.order_date);
        return format(orderDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });

      const daySales = dayOrders.reduce((sum, order) => {
        const productItems = order.order_items?.filter(item => 
          selectedProductIds.includes(item.inventory_id)
        ) || [];
        return sum + productItems.reduce((s, item) => s + (item.subtotal || 0), 0);
      }, 0);

      const dayQuantity = dayOrders.reduce((sum, order) => {
        const productItems = order.order_items?.filter(item => 
          selectedProductIds.includes(item.inventory_id)
        ) || [];
        return sum + productItems.reduce((s, item) => s + (item.quantity || 0), 0);
      }, 0);

      salesTrend.push({
        date: format(date, 'MMM dd'),
        revenue: daySales,
        quantity: dayQuantity,
        orders: dayOrders.length
      });
    }

    // Product comparison data
    const comparisonData = productMetrics.map(m => ({
      name: m.product.item_name.length > 20 ? m.product.item_name.substring(0, 20) + '...' : m.product.item_name,
      revenue: m.totalRevenue,
      sold: m.totalSold,
      stock: m.product.current_stock,
      margin: m.profitMargin
    }));

    return {
      productMetrics,
      totalRevenue,
      totalSold,
      totalOrders,
      totalStockValue,
      salesTrend,
      comparisonData
    };
  }, [selectedProducts, orders, movements, selectedProductIds, dateRange]);

  // Enhanced PDF Export using backend function
  const handleExportPDF = async () => {
    if (selectedProducts.length === 0 || !analytics) {
      toast.error('Please select products first');
      return;
    }

    setIsExporting(true);
    toast.loading('Generating professional PDF report with charts...', { id: 'pdf-export' });

    try {
      const { data } = await base44.functions.invoke('generateProductAnalyticsReport', {
        productMetrics: analytics.productMetrics,
        dateRange: dateRange,
        department: selectedDepartment
      });

      // Create blob and download
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

  // Export to Excel/CSV
  const handleExportExcel = () => {
    if (!analytics || selectedProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }

    const exportData = analytics.productMetrics.map(metric => ({
      'Product Name': metric.product.item_name,
      'Department': metric.product.department === 'boibari' ? 'Boibari' : 'Prodhan.com',
      'Category': metric.product.category,
      'Current Stock': metric.product.current_stock,
      'Units Sold': metric.totalSold,
      'Total Orders': metric.totalOrders,
      'Total Revenue': metric.totalRevenue,
      'Average Order Value': Math.round(metric.avgOrderValue),
      'Stock Value': metric.stockValue,
      'Potential Revenue': metric.potentialRevenue,
      'Profit Margin %': metric.profitMargin.toFixed(2),
      'Purchase Price': metric.product.purchase_price,
      'Selling Price': metric.product.selling_price
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
        <Activity className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Enhanced Header with Department Badge */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-gradient flex items-center gap-3 flex-wrap">
            Product Analytics Dashboard
            {selectedDepartment !== 'all' && (
              <Badge className={selectedDepartment === 'boibari' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                {selectedDepartment === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Deep dive into product performance, sales patterns, and inventory insights
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleExportExcel} 
            variant="outline" 
            disabled={!analytics}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
          <Button 
            onClick={handleExportPDF} 
            disabled={!analytics || isExporting}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters and Product Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection Card */}
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

            {/* Department Filter Info */}
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

        {/* Filters Card */}
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

            {analytics && (
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

      {/* Analytics Display */}
      {selectedProductIds.length === 0 ? (
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
      ) : analytics ? (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="premium-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      ৳{analytics.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last {dateRange} days
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Units Sold</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analytics.totalSold.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across {analytics.totalOrders} orders
                    </p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ৳{analytics.totalStockValue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current inventory
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Products Analyzed</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {selectedProducts.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedDepartment === 'all' ? 'All departments' : 
                       selectedDepartment === 'boibari' ? 'Boibari' : 'Prodhan.com'}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Sales Trend - Last {dateRange} Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.salesTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#7C3AED" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="Revenue (৳)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="quantity" 
                    stroke="#EC4899" 
                    name="Quantity Sold"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Revenue Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#7C3AED" name="Revenue (৳)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stock vs Sales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Stock vs Sales Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.comparisonData}
                      dataKey="stock"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analytics.comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Product Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Product Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-semibold">Product</th>
                      <th className="text-center py-3 px-2 font-semibold">Stock</th>
                      <th className="text-right py-3 px-2 font-semibold">Units Sold</th>
                      <th className="text-right py-3 px-2 font-semibold">Revenue</th>
                      <th className="text-right py-3 px-2 font-semibold">Orders</th>
                      <th className="text-right py-3 px-2 font-semibold">Avg Order</th>
                      <th className="text-right py-3 px-2 font-semibold">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.productMetrics.map((metric, index) => (
                      <tr key={metric.product.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <p className="font-medium">{metric.product.item_name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {metric.product.category}
                                </Badge>
                                {metric.product.isbn && (
                                  <Badge variant="outline" className="text-xs">
                                    {metric.product.isbn}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant={metric.product.current_stock < metric.product.minimum_stock ? 'destructive' : 'default'}>
                            {metric.product.current_stock}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">{metric.totalSold}</td>
                        <td className="py-3 px-2 text-right font-semibold text-green-600">
                          ৳{metric.totalRevenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right">{metric.totalOrders}</td>
                        <td className="py-3 px-2 text-right">
                          ৳{Math.round(metric.avgOrderValue).toLocaleString()}
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

          {/* Individual Product Insights */}
          {analytics.productMetrics.map((metric, index) => (
            <Card key={metric.product.id} className="border-l-4" style={{ borderColor: COLORS[index % COLORS.length] }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{metric.product.item_name}</span>
                  <Badge className={
                    metric.product.department === 'boibari' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }>
                    {metric.product.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan.com'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Stock</p>
                    <p className="text-lg font-bold">{metric.product.current_stock}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Purchase Price</p>
                    <p className="text-lg font-bold">৳{metric.product.purchase_price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Selling Price</p>
                    <p className="text-lg font-bold text-green-600">৳{metric.product.selling_price}</p>
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
                    <p className="text-lg font-bold">{metric.product.supplier_lead_time_days || 'N/A'} days</p>
                  </div>
                </div>

                {/* Alert if low stock */}
                {metric.product.current_stock < metric.product.minimum_stock && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Low Stock Alert</p>
                      <p className="text-sm text-red-700">
                        Current stock ({metric.product.current_stock}) is below minimum ({metric.product.minimum_stock}). 
                        Consider reordering soon.
                      </p>
                    </div>
                  </div>
                )}

                {/* Supplier Info */}
                {metric.product.supplier_name && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Primary Supplier:</p>
                    <p className="text-sm text-muted-foreground">
                      {metric.product.supplier_name} 
                      {metric.product.supplier_contact && ` • ${metric.product.supplier_contact}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      ) : null}
    </div>
  );
}

export default withPermission(ProductAnalyticsDashboard, 'inventory', 'can_view');

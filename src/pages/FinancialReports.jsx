import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, PieChart, Download, Loader2, BarChart3, Shield, Lock, Package, Facebook, Target, Megaphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { Order } from '@/entities/Order';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { withPermission } from '@/components/common/PermissionGuard';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart as RePieChart, Pie, Cell 
} from 'recharts';

/**
 * FINANCIAL REPORTS PAGE - ADMIN ONLY
 * All profit and money-related analysis reports
 */

function FinancialReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState('profit_analysis');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('financial');
  const [campaignName, setCampaignName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => Inventory.list(),
    staleTime: 3 * 60 * 1000
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => Order.list('-order_date', 1000),
    staleTime: 3 * 60 * 1000
  });

  // Calculate Facebook Ads campaign data
  const campaignData = React.useMemo(() => {
    const campaigns = {};
    orders.forEach(order => {
      const campaign = order.utm_campaign || order.facebook_campaign_name || 'Organic';
      if (!campaigns[campaign]) {
        campaigns[campaign] = { name: campaign, orders: 0, revenue: 0, products: {} };
      }
      campaigns[campaign].orders++;
      campaigns[campaign].revenue += order.total_amount || 0;
      
      (order.order_items || []).forEach(item => {
        if (!campaigns[campaign].products[item.item_name]) {
          campaigns[campaign].products[item.item_name] = { qty: 0, revenue: 0 };
        }
        campaigns[campaign].products[item.item_name].qty += item.quantity || 0;
        campaigns[campaign].products[item.item_name].revenue += item.subtotal || 0;
      });
    });
    return Object.values(campaigns).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  // Product performance data
  const productPerformance = React.useMemo(() => {
    const products = {};
    orders.forEach(order => {
      (order.order_items || []).forEach(item => {
        if (!products[item.item_name]) {
          products[item.item_name] = { name: item.item_name, qty: 0, revenue: 0, orders: 0 };
        }
        products[item.item_name].qty += item.quantity || 0;
        products[item.item_name].revenue += item.subtotal || 0;
        products[item.item_name].orders++;
      });
    });
    return Object.values(products).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }, [orders]);

  const CHART_COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#10B981', '#F59E0B', '#EF4444'];

  const totalInventoryValue = inventory
    .filter(item => item.department === 'prodhan_com_e_commerce')
    .reduce((sum, item) => sum + (item.current_stock || 0) * (item.selling_price || 0), 0);

  const generateReport = async (type) => {
    setIsGenerating(true);
    const loadingToast = toast.loading('Generating financial report...');
    
    try {
      const response = await base44.functions.invoke('generateInventorySalesReport', {
        reportType: type,
        department: 'prodhan_com_e_commerce',
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        category: category === 'all' ? null : category
      });

      if (response.data && response.data.pdfBase64) {
        const pdfBlob = base64ToBlob(response.data.pdfBase64, 'application/pdf');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.dismiss(loadingToast);
        toast.success('Financial report generated successfully!');
      } else {
        throw new Error('No PDF data received');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Report generation error:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const financialReports = [
    {
      id: 'profit_analysis',
      title: 'Profit Analysis',
      description: 'Detailed profit breakdown by product',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'revenue_breakdown',
      title: 'Revenue Breakdown',
      description: 'Revenue analysis by category and product',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'margin_analysis',
      title: 'Margin Analysis',
      description: 'Profit margins and financial performance',
      icon: PieChart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-blue-800 flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Financial Reports</h1>
              <p className="text-slate-600 dark:text-slate-400">Profit & Revenue Analysis</p>
            </div>
          </div>
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <Shield className="w-3 h-3 mr-1" />
            Admin Access Only
          </Badge>
        </div>
      </div>

      {/* Inventory Value Card */}
      <Card className="bg-white border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
              <Package className="w-7 h-7 text-purple-600" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Inventory Value</p>
          <p className="text-4xl font-bold text-purple-600">
            ৳{totalInventoryValue.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Current stock value at selling price ({inventory.filter(i => i.department === 'prodhan_com_e_commerce').length} products)
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-slate-600" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label>Category (Optional)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="food_beverages">Food & Beverages</SelectItem>
                  <SelectItem value="fashion">Fashion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="premium-card hover:shadow-xl transition-all border-2 border-green-100">
          <CardContent className="p-6">
            <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-4">
              <DollarSign className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Profit Analysis</h3>
            <p className="text-sm text-slate-600 mb-4">Detailed profit breakdown by product with margins</p>
            <Button
              onClick={() => generateReport('profit_analysis')}
              disabled={isGenerating}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Generate Report</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all border-2 border-blue-100">
          <CardContent className="p-6">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Top Selling Products</h3>
            <p className="text-sm text-slate-600 mb-4">Best performers by revenue and units sold</p>
            <Button
              onClick={() => generateReport('top_selling')}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Generate Report</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="premium-card hover:shadow-xl transition-all border-2 border-purple-100">
          <CardContent className="p-6">
            <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <PieChart className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Stock Valuation</h3>
            <p className="text-sm text-slate-600 mb-4">Current inventory value and cost analysis</p>
            <Button
              onClick={() => generateReport('stock_valuation')}
              disabled={isGenerating}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Generate Report</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Reports Builder */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Financial Reports
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Facebook className="w-4 h-4" />
            Campaign Analytics
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="w-4 h-4" />
            Product Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          {/* Existing financial reports content stays here */}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Campaign Analytics */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                Facebook Ad Campaign Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                    <YAxis yAxisId="left" orientation="left" stroke="#1E40AF" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                    <Tooltip formatter={(value, name) => [name === 'revenue' ? `৳${value.toLocaleString()}` : value, name]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orders" fill="#1E40AF" name="Orders" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#10B981" name="Revenue (৳)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Campaign Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Campaign</th>
                      <th className="px-4 py-3 text-right font-semibold">Orders</th>
                      <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignData.slice(0, 15).map((campaign, idx) => (
                      <tr key={idx} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{campaign.name}</td>
                        <td className="px-4 py-3 text-right">{campaign.orders}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">৳{campaign.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">৳{Math.round(campaign.revenue / campaign.orders).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {/* Product Performance */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Product Performance Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Product */}
                <div className="h-[350px]">
                  <h4 className="font-semibold mb-4 text-slate-700">Top Products by Revenue</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productPerformance.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} />
                      <YAxis dataKey="name" type="category" width={120} fontSize={10} />
                      <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#7C3AED" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Units Sold by Product */}
                <div className="h-[350px]">
                  <h4 className="font-semibold mb-4 text-slate-700">Top Products by Units Sold</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productPerformance.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="qty" fill="#1E40AF" name="Units Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Product Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Product</th>
                      <th className="px-4 py-3 text-right font-semibold">Units Sold</th>
                      <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                      <th className="px-4 py-3 text-right font-semibold">Avg Price</th>
                      <th className="px-4 py-3 text-right font-semibold">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPerformance.map((product, idx) => (
                      <tr key={idx} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium max-w-[200px] truncate">{product.name}</td>
                        <td className="px-4 py-3 text-right">{product.qty}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">৳{product.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">৳{Math.round(product.revenue / product.qty).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{product.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Confidential Financial Data</h4>
              <p className="text-sm text-amber-800">
                These reports contain sensitive financial information including profit margins, cost analysis, and revenue breakdowns. 
                Only authorized administrators can access and generate these reports. All report generations are logged for security audit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withPermission(FinancialReportsPage, 'financial_analytics', 'can_view');
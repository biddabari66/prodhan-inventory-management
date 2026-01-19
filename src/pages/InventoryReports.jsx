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
  Calendar, Filter, Image, FileDown, Loader2, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { withPermission } from '../components/common/PermissionGuard';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

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
      
      const [orders, inventory, movements, purchaseOrders] = await Promise.all([
        base44.entities.Order.list('-order_date'),
        base44.entities.Inventory.list(),
        base44.entities.InventoryMovement.list('-movement_date', 10000),
        base44.entities.PurchaseOrder.list('-order_date')
      ]);

      const response = await base44.functions.invoke('generateInventorySalesReport', { 
        reportType,
        department: 'prodhan_com_e_commerce',
        dateFrom: startDate,
        dateTo: endDate,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        orders,
        inventory,
        movements,
        purchaseOrders
      });

      if (response.data?.pdfBase64) {
        const binaryString = atob(response.data.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${toBDTDate()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('✅ Report downloaded!');
      } else {
        throw new Error('No PDF data received');
      }
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      toast.error(`Error: ${error.message || 'Failed to generate report'}`);
    } finally {
      setReportGenerating(null);
    }
  };

  const handleCustomReport = async () => {
    setReportGenerating('custom');
    try {
      toast.info('Building your custom report...');
      
      const dateRange = getDateRange(customReport.dateRange);
      
      const [orders, inventory, movements, purchaseOrders] = await Promise.all([
        base44.entities.Order.list('-order_date'),
        base44.entities.Inventory.list(),
        base44.entities.InventoryMovement.list('-movement_date', 10000),
        base44.entities.PurchaseOrder.list('-order_date')
      ]);

      const response = await base44.functions.invoke('generateInventorySalesReport', { 
        reportType: customReport.reportType,
        department: 'prodhan_com_e_commerce',
        dateFrom: dateRange.start,
        dateTo: dateRange.end,
        groupBy: customReport.groupBy,
        includeFields: customReport.includeFields,
        sortBy: customReport.sortBy,
        sortOrder: customReport.sortOrder,
        orders,
        inventory,
        movements,
        purchaseOrders,
        suppliers
      });

      if (response.data?.pdfBase64) {
        const binaryString = atob(response.data.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const mimeType = customReport.format === 'pdf' ? 'application/pdf' : 'image/jpeg';
        const extension = customReport.format === 'pdf' ? 'pdf' : 'jpg';
        const blob = new Blob([bytes], { type: mimeType });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom_${customReport.reportType}_report_${toBDTDate()}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('✅ Custom report downloaded!');
      } else {
        throw new Error('No report data received');
      }
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
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12 p-1 bg-slate-100 rounded-xl">
            <TabsTrigger value="quick" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium">
              Quick Reports
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
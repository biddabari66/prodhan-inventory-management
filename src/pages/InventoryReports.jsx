import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileText, TrendingDown, RotateCcw, RefreshCw, Download,
  ShoppingBag, PackageX, TrendingUp, BarChart3, Warehouse, AlertTriangle, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { withPermission } from '../components/common/PermissionGuard';

// BDT timezone helpers
const toBDTDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const get30DaysAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toBDTDate(date);
};

function InventoryReportsPage() {
  const [reportGenerating, setReportGenerating] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [startDate, setStartDate] = useState(get30DaysAgo());
  const [endDate, setEndDate] = useState(toBDTDate());
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch categories dynamically
  const { data: categories = [] } = useQuery({
    queryKey: ['productCategories'],
    queryFn: () => base44.entities.ProductCategory.list(),
  });

  // Filter categories based on selected department
  const filteredCategories = useMemo(() => {
    if (selectedDepartment === 'all') return categories;
    return categories.filter(cat => 
      cat.department === selectedDepartment || cat.department === 'both'
    );
  }, [categories, selectedDepartment]);

  const handleGenerateReport = async (reportType) => {
    setReportGenerating(reportType);
    try {
      toast.info('📊 Fetching latest data...', { duration: 2000 });
      const [orders, inventory, movements] = await Promise.all([
        base44.entities.Order.list('-order_date'),
        base44.entities.Inventory.list(),
        base44.entities.InventoryMovement.list('-movement_date', 10000)
      ]);

      const requestBody = { 
        reportType,
        department: selectedDepartment,
        dateFrom: startDate,
        dateTo: endDate,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        orders,
        inventory,
        movements
      };

      toast.info('📄 Generating professional report...', { duration: 2000 });
      const response = await base44.functions.invoke('generateInventorySalesReport', requestBody);

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
        a.download = `BEE_ERP_${reportType}_${toBDTDate()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('✅ Report downloaded successfully!');
      } else {
        throw new Error('No PDF data received');
      }
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      toast.error(`Failed: ${error.message || 'Report generation error'}`);
    } finally {
      setReportGenerating(null);
    }
  };

  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
    setSelectedCategory('all');
  };

  // Report card data
  const stockReports = [
    { type: 'stock_valuation', icon: Warehouse, title: 'Stock Valuation', description: 'Current inventory value analysis', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', border: 'border-violet-200' },
    { type: 'low_stock', icon: AlertTriangle, title: 'Low Stock Alert', description: 'Items below minimum levels', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'border-red-200' },
    { type: 'movement_summary', icon: RotateCcw, title: 'Movement Summary', description: 'Stock flow analysis', gradient: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-50', border: 'border-cyan-200' }
  ];

  const salesReports = [
    { type: 'sales_summary', icon: ShoppingBag, title: 'Sales Summary', description: 'Complete sales analysis', gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { type: 'top_selling', icon: Award, title: 'Top Selling', description: 'Best performing products', gradient: 'from-amber-500 to-yellow-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { type: 'profit_analysis', icon: BarChart3, title: 'Profit Analysis', description: 'Profitability & margins', gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-50', border: 'border-green-200' },
    { type: 'damaged_products', icon: PackageX, title: 'Damaged Products', description: 'Inventory loss report', gradient: 'from-red-500 to-pink-600', bg: 'bg-red-50', border: 'border-red-200' },
    { type: 'returned_products', icon: TrendingDown, title: 'Returned Products', description: 'Customer returns analysis', gradient: 'from-orange-500 to-amber-600', bg: 'bg-orange-50', border: 'border-orange-200' }
  ];

  const ReportCard = ({ report }) => {
    const Icon = report.icon;
    const isGenerating = reportGenerating === report.type;
    
    return (
      <button
        onClick={() => handleGenerateReport(report.type)}
        disabled={!!reportGenerating}
        className={`group relative overflow-hidden rounded-2xl border-2 ${report.border} ${report.bg} p-5 text-left transition-all duration-300 hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100`}
      >
        {/* Gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${report.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
        
        {/* Content */}
        <div className="relative z-10">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${report.gradient} flex items-center justify-center mb-3 shadow-lg`}>
            {isGenerating ? (
              <RefreshCw className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Icon className="w-6 h-6 text-white" />
            )}
          </div>
          
          <h3 className="font-bold text-slate-800 text-base mb-1">{report.title}</h3>
          <p className="text-xs text-slate-500 mb-3">{report.description}</p>
          
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${isGenerating ? 'text-slate-400' : 'text-slate-600 group-hover:text-slate-800'}`}>
            <Download className="w-3.5 h-3.5" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Premium Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventory Reports</h1>
              <p className="text-slate-500 mt-1">Professional PDF reports with real-time BDT data</p>
            </div>
          </div>
          <Badge variant="outline" className="self-start md:self-center px-4 py-2 text-sm font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
            Live Data
          </Badge>
        </div>

        {/* Filters Card */}
        <Card className="border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-slate-600" />
              </div>
              Report Filters
            </CardTitle>
            <CardDescription>Configure filters to generate accurate reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Department</Label>
                <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                  <SelectTrigger className="h-11 bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="boibari">📚 Boibari.com (Books)</SelectItem>
                    <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com (E-commerce)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Start Date (BDT)</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">End Date (BDT)</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 bg-white border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-11 bg-white border-slate-200">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedDepartment !== 'all' && (
              <div className={`mt-5 p-4 rounded-xl flex items-center gap-3 ${
                selectedDepartment === 'boibari' 
                  ? 'bg-cyan-50 border border-cyan-200' 
                  : 'bg-purple-50 border border-purple-200'
              }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedDepartment === 'boibari' ? 'bg-cyan-100' : 'bg-purple-100'
                }`}>
                  {selectedDepartment === 'boibari' ? '📚' : '🛒'}
                </div>
                <div>
                  <p className={`font-semibold ${selectedDepartment === 'boibari' ? 'text-cyan-800' : 'text-purple-800'}`}>
                    Filtering by: {selectedDepartment === 'boibari' ? 'Boibari.com' : 'Prodhan.com'}
                  </p>
                  <p className="text-sm text-slate-500">{filteredCategories.length} categories available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Reports Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Stock Reports</h2>
              <p className="text-sm text-slate-500">Inventory valuation and stock analysis</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {stockReports.map((report) => (
              <ReportCard key={report.type} report={report} />
            ))}
          </div>
        </div>

        {/* Sales & Loss Reports Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Sales & Loss Reports</h2>
              <p className="text-sm text-slate-500">Revenue, profit, and loss analysis</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {salesReports.map((report) => (
              <ReportCard key={report.type} report={report} />
            ))}
          </div>
        </div>

        {/* Info Footer */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">Professional PDF Reports</h3>
              <p className="text-sm text-slate-600">
                All reports are generated with real-time data in BDT timezone (UTC+6). 
                Currency values are displayed in BDT (Bangladeshi Taka). 
                Reports include comprehensive summaries, detailed tables, and professional formatting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPermission(InventoryReportsPage, 'inventory_reports', 'can_view');
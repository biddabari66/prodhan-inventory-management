import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileText, TrendingDown, RotateCcw, RefreshCw, 
  BookOpen, ShoppingCart, ShoppingBag, PackageX
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { withPermission } from '../components/common/PermissionGuard';
import { format, subDays } from 'date-fns';

function InventoryReportsPage() {
  const [reportGenerating, setReportGenerating] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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
      let response;
      let filename;
      const requestBody = { 
        department: selectedDepartment,
        startDate: startDate,
        endDate: endDate,
        category: selectedCategory
      };

      switch (reportType) {
        case 'valuation':
          response = await base44.functions.invoke('generateStockValuationReport', requestBody);
          filename = `stock_valuation_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          break;
        case 'low_stock':
          response = await base44.functions.invoke('generateLowStockReport', requestBody);
          filename = `low_stock_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          break;
        case 'movement_summary':
          response = await base44.functions.invoke('generateMovementSummaryReport', requestBody);
          filename = `movement_summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          break;
        case 'sales':
          response = await base44.functions.invoke('generateInventorySalesReport', requestBody);
          filename = `sales_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          break;
        case 'damaged':
          response = await base44.functions.invoke('generateInventoryDamagedReport', requestBody);
          filename = `damaged_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (response.data) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('Report downloaded!');
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      toast.error(error.message || 'Error generating report');
    } finally {
      setReportGenerating(null);
    }
  };

  const ReportButton = ({ type, icon: Icon, title, color, bgColor, hoverBorder }) => (
    <button
      onClick={() => handleGenerateReport(type)}
      disabled={!!reportGenerating}
      className={`group h-36 rounded-xl border-2 border-slate-200 bg-white hover:border-${hoverBorder} hover:${bgColor} transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md`}
    >
      {reportGenerating === type ? (
        <div className="flex flex-col items-center justify-center h-full">
          <RefreshCw className={`w-8 h-8 animate-spin ${color}`} />
          <p className="text-xs text-slate-500 mt-2">Generating...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center mb-2`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <p className="font-semibold text-slate-800 text-sm">{title}</p>
        </div>
      )}
    </button>
  );

  // Reset category when department changes
  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ইনভেন্টরি রিপোর্টস</h1>
            <p className="text-slate-500 text-sm">ইনভেন্টরি ডেটার জন্য PDF রিপোর্ট তৈরি করুন</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-slate-600 font-medium">বিভাগ</Label>
                <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল বিভাগ</SelectItem>
                    <SelectItem value="boibari">
                      <span className="flex items-center gap-2"><BookOpen className="w-3 h-3" /> 📚 বইবাড়ি</span>
                    </SelectItem>
                    <SelectItem value="prodhan_com_e_commerce">
                      <span className="flex items-center gap-2"><ShoppingCart className="w-3 h-3" /> 🛒 প্রধান.কম</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600 font-medium">শুরুর তারিখ</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 font-medium">শেষ তারিখ</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 font-medium">ক্যাটাগরি</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল ক্যাটাগরি</SelectItem>
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
              <div className={`mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                selectedDepartment === 'boibari' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
              }`}>
                <span>ফিল্টার করা হচ্ছে:</span>
                <Badge className={selectedDepartment === 'boibari' ? 'bg-cyan-100 text-cyan-800' : 'bg-purple-100 text-purple-800'}>
                  {selectedDepartment === 'boibari' ? '📚 বইবাড়ি.কম' : '🛒 প্রধান.কম'}
                </Badge>
                <span className="text-slate-500">({filteredCategories.length} ক্যাটাগরি)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Reports */}
        <Card className="bg-white border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">স্টক রিপোর্টস</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ReportButton 
                type="valuation" 
                icon={FileText} 
                title="স্টক মূল্যায়ন" 
                color="text-violet-600"
                bgColor="bg-violet-50"
                hoverBorder="violet-400"
              />
              <ReportButton 
                type="low_stock" 
                icon={TrendingDown} 
                title="কম স্টক সতর্কতা" 
                color="text-red-600"
                bgColor="bg-red-50"
                hoverBorder="red-400"
              />
              <ReportButton 
                type="movement_summary" 
                icon={RotateCcw} 
                title="মুভমেন্ট সারাংশ" 
                color="text-cyan-600"
                bgColor="bg-cyan-50"
                hoverBorder="cyan-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sales & Loss Reports */}
        <Card className="bg-white border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">বিক্রয় ও ক্ষতি রিপোর্টস</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <ReportButton 
                type="sales" 
                icon={ShoppingBag} 
                title="বিক্রয় রিপোর্ট" 
                color="text-green-600"
                bgColor="bg-green-50"
                hoverBorder="green-400"
              />
              <ReportButton 
                type="damaged" 
                icon={PackageX} 
                title="ক্ষতিগ্রস্ত রিপোর্ট" 
                color="text-orange-600"
                bgColor="bg-orange-50"
                hoverBorder="orange-400"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withPermission(InventoryReportsPage, 'inventory', 'can_view');
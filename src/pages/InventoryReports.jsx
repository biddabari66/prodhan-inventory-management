import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileText, TrendingDown, RotateCcw, RefreshCw, Building2, 
  Download, BookOpen, ShoppingCart, Calendar, ShoppingBag, PackageX
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory Reports</h1>
            <p className="text-slate-500 text-sm">Generate PDF reports for inventory data</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-slate-600">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="boibari">
                      <span className="flex items-center gap-2"><BookOpen className="w-3 h-3" /> Boibari</span>
                    </SelectItem>
                    <SelectItem value="prodhan_com_e_commerce">
                      <span className="flex items-center gap-2"><ShoppingCart className="w-3 h-3" /> Prodhan.com</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">End Date</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="stationery">Stationery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedDepartment !== 'all' && (
              <div className={`mt-3 p-2 rounded-lg text-xs font-medium ${
                selectedDepartment === 'boibari' ? 'bg-cyan-50 text-cyan-700' : 'bg-purple-50 text-purple-700'
              }`}>
                Filtering: {selectedDepartment === 'boibari' ? '📚 Boibari.com' : '🛒 Prodhan.com'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Reports */}
        <Card className="bg-white border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">Stock Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ReportButton 
                type="valuation" 
                icon={FileText} 
                title="Stock Valuation" 
                color="text-violet-600"
                bgColor="bg-violet-50"
                hoverBorder="violet-400"
              />
              <ReportButton 
                type="low_stock" 
                icon={TrendingDown} 
                title="Low Stock Alerts" 
                color="text-red-600"
                bgColor="bg-red-50"
                hoverBorder="red-400"
              />
              <ReportButton 
                type="movement_summary" 
                icon={RotateCcw} 
                title="Movement Summary" 
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
            <CardTitle className="text-base font-semibold text-slate-800">Sales & Loss Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <ReportButton 
                type="sales" 
                icon={ShoppingBag} 
                title="Sales Report" 
                color="text-green-600"
                bgColor="bg-green-50"
                hoverBorder="green-400"
              />
              <ReportButton 
                type="damaged" 
                icon={PackageX} 
                title="Damaged Report" 
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
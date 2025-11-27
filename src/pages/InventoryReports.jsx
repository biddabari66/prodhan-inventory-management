import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  FileText, TrendingDown, RotateCcw, RefreshCw, Building2, 
  Download, BookOpen, ShoppingCart, BarChart3, Settings2,
  Calendar, Filter, FileSpreadsheet, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { withPermission } from '../components/common/PermissionGuard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function InventoryReportsPage() {
  const [reportGenerating, setReportGenerating] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeTab, setActiveTab] = useState('quick');

  const handleGenerateReport = async (reportType) => {
    setReportGenerating(reportType);
    try {
      let response;
      let filename;

      const requestBody = { department: selectedDepartment };

      switch (reportType) {
        case 'valuation':
          response = await base44.functions.invoke('generateStockValuationReport', requestBody);
          filename = `stock_valuation_${selectedDepartment}_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'low_stock':
          response = await base44.functions.invoke('generateLowStockReport', requestBody);
          filename = `low_stock_alerts_${selectedDepartment}_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'movement_summary':
          response = await base44.functions.invoke('generateMovementSummaryReport', requestBody);
          filename = `movement_summary_${selectedDepartment}_${new Date().toISOString().split('T')[0]}.pdf`;
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
        toast.success('Report downloaded successfully!');
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      toast.error(error.message || 'An error occurred while generating the report');
    } finally {
      setReportGenerating(null);
    }
  };

  const getDepartmentBadge = () => {
    if (selectedDepartment === 'all') {
      return <Badge variant="outline" className="bg-slate-100">All Departments</Badge>;
    }
    if (selectedDepartment === 'boibari') {
      return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">📚 Boibari.com</Badge>;
    }
    return <Badge className="bg-purple-100 text-purple-800 border-purple-300">🛒 Prodhan.com</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Premium Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 via-gray-700 to-zinc-700 flex items-center justify-center shadow-lg shadow-slate-500/30">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Inventory Reports</h1>
              <p className="text-slate-600 mt-1 text-base">Professional PDF reports with department-specific analytics</p>
            </div>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-slate-600">Department:</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    All Departments
                  </div>
                </SelectItem>
                <SelectItem value="boibari">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-600" />
                    Boibari.com (Books)
                  </div>
                </SelectItem>
                <SelectItem value="prodhan_com_e_commerce">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-purple-600" />
                    Prodhan.com (E-commerce)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Selection Indicator */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Filter className="w-4 h-4" />
          <span>Generating reports for:</span>
          {getDepartmentBadge()}
        </div>

        {/* Tabs for Report Types */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-slate-100 rounded-xl">
            <TabsTrigger 
              value="quick" 
              className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Quick Reports
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="gap-2 h-12 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium"
            >
              <Settings2 className="w-4 h-4" />
              Advanced Reporting
            </TabsTrigger>
          </TabsList>

          {/* Quick Reports Tab */}
          <TabsContent value="quick" className="mt-6">
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-violet-600" />
                  One-Click Report Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stock Valuation Report */}
                  <button
                    onClick={() => handleGenerateReport('valuation')}
                    disabled={!!reportGenerating}
                    className="group relative h-52 rounded-2xl border-2 border-slate-200 bg-white hover:border-violet-500 hover:bg-gradient-to-br hover:from-violet-50 hover:to-purple-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg"
                  >
                    {reportGenerating === 'valuation' ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <RefreshCw className="w-10 h-10 animate-spin text-violet-600 mb-3" />
                        <p className="text-sm text-slate-600">Generating...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6">
                        <div className="w-16 h-16 rounded-xl bg-violet-100 flex items-center justify-center mb-4 group-hover:bg-violet-200 transition-colors">
                          <FileText className="w-8 h-8 text-violet-600" />
                        </div>
                        <p className="font-semibold text-lg text-slate-900 mb-1">Stock Valuation</p>
                        <p className="text-sm text-slate-500 text-center mb-3">Complete inventory value with profit margins</p>
                        <Badge variant="outline" className="text-xs">Includes Returns & Damages</Badge>
                      </div>
                    )}
                  </button>

                  {/* Low Stock Alert Report */}
                  <button
                    onClick={() => handleGenerateReport('low_stock')}
                    disabled={!!reportGenerating}
                    className="group relative h-52 rounded-2xl border-2 border-slate-200 bg-white hover:border-red-500 hover:bg-gradient-to-br hover:from-red-50 hover:to-orange-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg"
                  >
                    {reportGenerating === 'low_stock' ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-3" />
                        <p className="text-sm text-slate-600">Generating...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6">
                        <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center mb-4 group-hover:bg-red-200 transition-colors">
                          <TrendingDown className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="font-semibold text-lg text-slate-900 mb-1">Low Stock Alerts</p>
                        <p className="text-sm text-slate-500 text-center mb-3">Items requiring immediate reorder</p>
                        <Badge variant="outline" className="text-xs">With Supplier Info</Badge>
                      </div>
                    )}
                  </button>

                  {/* Movement Summary Report */}
                  <button
                    onClick={() => handleGenerateReport('movement_summary')}
                    disabled={!!reportGenerating}
                    className="group relative h-52 rounded-2xl border-2 border-slate-200 bg-white hover:border-cyan-500 hover:bg-gradient-to-br hover:from-cyan-50 hover:to-blue-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg"
                  >
                    {reportGenerating === 'movement_summary' ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <RefreshCw className="w-10 h-10 animate-spin text-cyan-600 mb-3" />
                        <p className="text-sm text-slate-600">Generating...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6">
                        <div className="w-16 h-16 rounded-xl bg-cyan-100 flex items-center justify-center mb-4 group-hover:bg-cyan-200 transition-colors">
                          <RotateCcw className="w-8 h-8 text-cyan-600" />
                        </div>
                        <p className="font-semibold text-lg text-slate-900 mb-1">Movement Summary</p>
                        <p className="text-sm text-slate-500 text-center mb-3">Comprehensive transaction history</p>
                        <Badge variant="outline" className="text-xs">In/Out/Returns/Damages</Badge>
                      </div>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Reporting Tab */}
          <TabsContent value="advanced" className="mt-6 space-y-6">
            {/* Manual Report Builder Link */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 shadow-sm">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <FileSpreadsheet className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Custom Report Builder</h3>
                      <p className="text-slate-600 mt-1">Create custom reports with advanced filters, grouping, and export options</p>
                    </div>
                  </div>
                  <Link to={createPageUrl('ReportBuilder')}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30">
                      <Settings2 className="w-4 h-4 mr-2" />
                      Open Report Builder
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Product Analytics Link */}
            <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 shadow-sm">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Product Analytics Dashboard</h3>
                      <p className="text-slate-600 mt-1">Interactive charts, trends, and performance metrics for inventory</p>
                    </div>
                  </div>
                  <Link to={createPageUrl('ProductAnalytics')}>
                    <Button className="bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-500/30">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights Link */}
            <Card className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-200 shadow-sm">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">AI-Powered Insights</h3>
                      <p className="text-slate-600 mt-1">Demand forecasting, reorder suggestions, and anomaly detection</p>
                    </div>
                  </div>
                  <Link to={createPageUrl('InventoryAIInsights')}>
                    <Button className="bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/30">
                      <Sparkles className="w-4 h-4 mr-2" />
                      View AI Insights
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Reports Link */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-sm">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                      <Calendar className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Scheduled Reports</h3>
                      <p className="text-slate-600 mt-1">Automate report generation and delivery on a schedule</p>
                    </div>
                  </div>
                  <Link to={createPageUrl('ScheduledReports')}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30">
                      <Calendar className="w-4 h-4 mr-2" />
                      Manage Schedules
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Report Features Info */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-semibold text-slate-900">Report Features</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">BDT Currency</h4>
                  <p className="text-sm text-slate-600">All values formatted in Bangladesh Taka (BDT)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Department Specific</h4>
                  <p className="text-sm text-slate-600">Filter reports by Boibari or Prodhan.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">English Names</h4>
                  <p className="text-sm text-slate-600">Product names displayed in English for clarity</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withPermission(InventoryReportsPage, 'inventory', 'can_view');
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, PieChart, Download, Loader2, BarChart3, Shield, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { withPermission } from '@/components/common/PermissionGuard';

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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg">
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

export default withPermission(FinancialReportsPage, 'financial_analytics', 'can_view', true);
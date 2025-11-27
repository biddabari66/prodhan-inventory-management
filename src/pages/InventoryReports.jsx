import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, TrendingDown, RotateCcw, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generateStockValuationReport } from '../functions/generateStockValuationReport';
import { generateLowStockReport } from '../functions/generateLowStockReport';
import { generateMovementSummaryReport } from '../functions/generateMovementSummaryReport';
import { withPermission } from '../components/common/PermissionGuard';

function InventoryReportsPage() {
  const [reportGenerating, setReportGenerating] = useState(null);

  const handleGenerateReport = async (reportType) => {
    setReportGenerating(reportType);
    try {
      let response;
      let filename;

      switch (reportType) {
        case 'valuation':
          response = await generateStockValuationReport();
          filename = 'stock_valuation_report.pdf';
          break;
        case 'low_stock':
          response = await generateLowStockReport();
          filename = 'low_stock_alert_report.pdf';
          break;
        case 'movement_summary':
          response = await generateMovementSummaryReport();
          filename = 'movement_summary_report.pdf';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Premium Header Section */}
        <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 via-gray-700 to-zinc-700 flex items-center justify-center shadow-lg shadow-slate-500/30">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Inventory Reports</h1>
            <p className="text-slate-600 mt-1 text-base">Professional PDF reports for stock valuation, alerts, and movement analysis</p>
          </div>
        </div>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-xl font-semibold text-slate-900">Available Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => handleGenerateReport('valuation')}
                disabled={!!reportGenerating}
                className="group relative h-44 rounded-2xl border-2 border-slate-200 bg-white hover:border-violet-500 hover:bg-gradient-to-br hover:from-violet-50 hover:to-purple-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg"
              >
                {reportGenerating === 'valuation' ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <RefreshCw className="w-10 h-10 animate-spin text-violet-600 mb-3" />
                    <p className="text-sm text-slate-600">Generating...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center mb-4 group-hover:bg-violet-200 transition-colors">
                      <FileText className="w-7 h-7 text-violet-600" />
                    </div>
                    <p className="font-semibold text-lg text-slate-900 mb-1">Stock Valuation</p>
                    <p className="text-sm text-slate-500 text-center">Complete inventory value analysis</p>
                  </div>
                )}
              </button>

              <button
                onClick={() => handleGenerateReport('low_stock')}
                disabled={!!reportGenerating}
                className="group relative h-44 rounded-2xl border-2 border-slate-200 bg-white hover:border-red-500 hover:bg-gradient-to-br hover:from-red-50 hover:to-orange-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg"
              >
                {reportGenerating === 'low_stock' ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-3" />
                    <p className="text-sm text-slate-600">Generating...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center mb-4 group-hover:bg-red-200 transition-colors">
                      <TrendingDown className="w-7 h-7 text-red-600" />
                    </div>
                    <p className="font-semibold text-lg text-slate-900 mb-1">Low Stock Alerts</p>
                    <p className="text-sm text-slate-500 text-center">Items requiring immediate reorder</p>
                  </div>
                )}
              </button>

              <button
                onClick={() => handleGenerateReport('movement_summary')}
                disabled={!!reportGenerating}
                className="group relative h-44 rounded-2xl border-2 border-slate-200 bg-white hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-lg"
              >
                {reportGenerating === 'movement_summary' ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mb-3" />
                    <p className="text-sm text-slate-600">Generating...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                      <RotateCcw className="w-7 h-7 text-blue-600" />
                    </div>
                    <p className="font-semibold text-lg text-slate-900 mb-1">Movement Summary</p>
                    <p className="text-sm text-slate-500 text-center">Comprehensive transaction history</p>
                  </div>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withPermission(InventoryReportsPage, 'inventory', 'can_export');
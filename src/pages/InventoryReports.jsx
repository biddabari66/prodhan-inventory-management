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
    <div className="p-6 space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-gray-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">Inventory Reports</h1>
            <p className="text-muted-foreground">Generate comprehensive inventory reports</p>
          </div>
        </div>
      </header>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-3 hover:border-violet-500 hover:bg-violet-50"
              onClick={() => handleGenerateReport('valuation')}
              disabled={!!reportGenerating}
            >
              {reportGenerating === 'valuation' ? (
                <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
              ) : (
                <>
                  <FileText className="w-8 h-8 text-violet-600" />
                  <div className="text-center">
                    <p className="font-semibold">Stock Valuation Report</p>
                    <p className="text-xs text-muted-foreground">Current inventory value</p>
                  </div>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-3 hover:border-red-500 hover:bg-red-50"
              onClick={() => handleGenerateReport('low_stock')}
              disabled={!!reportGenerating}
            >
              {reportGenerating === 'low_stock' ? (
                <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
              ) : (
                <>
                  <TrendingDown className="w-8 h-8 text-red-600" />
                  <div className="text-center">
                    <p className="font-semibold">Low Stock Alert Report</p>
                    <p className="text-xs text-muted-foreground">Items requiring reorder</p>
                  </div>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50"
              onClick={() => handleGenerateReport('movement_summary')}
              disabled={!!reportGenerating}
            >
              {reportGenerating === 'movement_summary' ? (
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              ) : (
                <>
                  <RotateCcw className="w-8 h-8 text-blue-600" />
                  <div className="text-center">
                    <p className="font-semibold">Movement Summary Report</p>
                    <p className="text-xs text-muted-foreground">All stock transactions</p>
                  </div>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withPermission(InventoryReportsPage, 'inventory', 'can_export');
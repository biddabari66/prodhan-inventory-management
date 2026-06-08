import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Palette, Layers, Weight, Recycle } from 'lucide-react';
import { toast } from 'sonner';
import { erp } from '@/api/erpClient';

export default function EnhancedReportButtons() {
  const [downloading, setDownloading] = useState(null);

  const downloadReport = async (reportType, label) => {
    setDownloading(reportType);
    const loadingToast = toast.loading(`Generating ${label}...`);
    
    try {
      const response = await erp.functions.invoke('generateEnhancedInventoryReport', {
        reportType
      });

      if (response.data?.pdfBase64) {
        const byteCharacters = atob(response.data.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.dismiss(loadingToast);
        toast.success(`${label} downloaded!`);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <Button
        onClick={() => downloadReport('variant_breakdown', 'Variant Breakdown Report')}
        disabled={downloading !== null}
        variant="outline"
        className="h-auto py-4 flex flex-col items-start gap-2 hover:border-purple-400 hover:bg-purple-50"
      >
        <div className="flex items-center gap-2 w-full">
          <Palette className="w-5 h-5 text-purple-600" />
          <span className="font-semibold">Color Variants</span>
        </div>
        <p className="text-xs text-slate-600 text-left">Which colors sold most</p>
      </Button>

      <Button
        onClick={() => downloadReport('combo_impact', 'Combo Impact Report')}
        disabled={downloading !== null}
        variant="outline"
        className="h-auto py-4 flex flex-col items-start gap-2 hover:border-orange-400 hover:bg-orange-50"
      >
        <div className="flex items-center gap-2 w-full">
          <Layers className="w-5 h-5 text-orange-600" />
          <span className="font-semibold">Combo Products</span>
        </div>
        <p className="text-xs text-slate-600 text-left">Component availability</p>
      </Button>

      <Button
        onClick={() => downloadReport('weight_totals', 'Weight-Based Report')}
        disabled={downloading !== null}
        variant="outline"
        className="h-auto py-4 flex flex-col items-start gap-2 hover:border-blue-400 hover:bg-blue-50"
      >
        <div className="flex items-center gap-2 w-full">
          <Weight className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">Weight Analysis</span>
        </div>
        <p className="text-xs text-slate-600 text-left">Units + kg totals</p>
      </Button>

      <Button
        onClick={() => downloadReport('waste_analysis', 'Waste Analysis Report')}
        disabled={downloading !== null}
        variant="outline"
        className="h-auto py-4 flex flex-col items-start gap-2 hover:border-green-400 hover:bg-green-50"
      >
        <div className="flex items-center gap-2 w-full">
          <Recycle className="w-5 h-5 text-green-600" />
          <span className="font-semibold">Waste & Yield</span>
        </div>
        <p className="text-xs text-slate-600 text-left">Refining efficiency</p>
      </Button>
    </div>
  );
}
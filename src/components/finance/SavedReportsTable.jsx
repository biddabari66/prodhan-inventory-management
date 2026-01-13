import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Save, Download, FileText, Image, FileSpreadsheet, 
  Trash2, Eye, Plus, Loader2, BarChart3, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function SavedReportsTable({ roiData, roiResult, plData, plResult, payrollData, totalPayroll }) {
  const [savedReports, setSavedReports] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('roi');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const tableRef = useRef(null);

  const saveCurrentReport = () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    const newReport = {
      id: Date.now(),
      name: reportName,
      type: reportType,
      date: new Date().toISOString(),
      data: reportType === 'roi' 
        ? { input: roiData, result: roiResult }
        : reportType === 'pl' 
          ? { input: plData, result: plResult, payroll: totalPayroll }
          : { employees: payrollData, total: totalPayroll }
    };

    setSavedReports(prev => [newReport, ...prev]);
    setReportName('');
    setShowSaveDialog(false);
    toast.success('Report saved successfully!');
  };

  const deleteReport = (id) => {
    setSavedReports(prev => prev.filter(r => r.id !== id));
    toast.success('Report deleted');
  };

  const exportAsImage = async (report) => {
    setIsExporting(true);
    setSelectedReport(report);
    
    setTimeout(async () => {
      try {
        const element = document.getElementById('export-table');
        if (!element) throw new Error('Table not found');

        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false
        });

        const link = document.createElement('a');
        link.download = `${report.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Image downloaded!');
      } catch (error) {
        toast.error('Failed to export: ' + error.message);
      } finally {
        setIsExporting(false);
        setSelectedReport(null);
      }
    }, 100);
  };

  const exportAsPDF = async (report) => {
    setIsExporting(true);
    setSelectedReport(report);
    
    setTimeout(async () => {
      try {
        const element = document.getElementById('export-table');
        if (!element) throw new Error('Table not found');

        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`${report.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF downloaded!');
      } catch (error) {
        toast.error('Failed to export: ' + error.message);
      } finally {
        setIsExporting(false);
        setSelectedReport(null);
      }
    }, 100);
  };

  const renderReportTable = (report) => {
    if (report.type === 'roi') {
      const { input, result } = report.data;
      return (
        <div id="export-table" className="bg-white p-6 rounded-lg">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">{report.name}</h2>
            <p className="text-sm text-slate-500">{format(new Date(report.date), 'MMMM d, yyyy HH:mm')}</p>
            <Badge className="bg-red-100 text-red-700 mt-2">ROI Report</Badge>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="border p-2 text-left">Metric</th>
                <th className="border p-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border p-2">Product Name</td><td className="border p-2 text-right font-medium">{input.product_name || 'N/A'}</td></tr>
              <tr><td className="border p-2">Purchase Price/Unit</td><td className="border p-2 text-right">৳{input.purchase_price?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Selling Price/Unit</td><td className="border p-2 text-right">৳{input.selling_price?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Quantity Sold</td><td className="border p-2 text-right">{input.quantity_sold}</td></tr>
              <tr><td className="border p-2">Total Revenue</td><td className="border p-2 text-right font-bold text-green-600">৳{result.totalRevenue?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Total COGS</td><td className="border p-2 text-right">৳{result.totalCOGS?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Ad Spend</td><td className="border p-2 text-right">৳{input.ad_spend?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Packaging Cost</td><td className="border p-2 text-right">৳{(input.packaging_per_unit * input.quantity_sold)?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Shipping Cost</td><td className="border p-2 text-right">৳{(input.shipping_per_unit * input.quantity_sold)?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Return Loss ({input.return_rate}%)</td><td className="border p-2 text-right text-red-600">৳{result.returnLoss?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Total Costs</td><td className="border p-2 text-right font-bold text-red-600">৳{result.totalCosts?.toLocaleString()}</td></tr>
              <tr className="bg-green-50"><td className="border p-2 font-bold">Gross Profit</td><td className="border p-2 text-right font-bold text-green-600">৳{result.grossProfit?.toLocaleString()}</td></tr>
              <tr className="bg-green-50"><td className="border p-2 font-bold">Profit Per Unit</td><td className="border p-2 text-right font-bold">৳{result.profitPerUnit?.toFixed(2)}</td></tr>
              <tr className="bg-red-100"><td className="border p-2 font-bold text-lg">ROI</td><td className="border p-2 text-right font-bold text-2xl text-red-600">{result.roi?.toFixed(2)}%</td></tr>
            </tbody>
          </table>
        </div>
      );
    } else if (report.type === 'pl') {
      const { input, result, payroll } = report.data;
      return (
        <div id="export-table" className="bg-white p-6 rounded-lg">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">{report.name}</h2>
            <p className="text-sm text-slate-500">{format(new Date(report.date), 'MMMM d, yyyy HH:mm')}</p>
            <Badge className="bg-blue-100 text-blue-700 mt-2">Profit & Loss Report</Badge>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="border p-2 text-left">Item</th>
                <th className="border p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-green-50"><td className="border p-2 font-bold">Revenue</td><td className="border p-2 text-right font-bold text-green-600">৳{input.revenue?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Cost of Goods Sold</td><td className="border p-2 text-right text-red-600">-৳{input.cost_of_goods?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Ad Budget/Marketing</td><td className="border p-2 text-right text-red-600">-৳{input.ad_budget?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Shipping Cost</td><td className="border p-2 text-right text-red-600">-৳{input.shipping_cost?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Packaging Cost</td><td className="border p-2 text-right text-red-600">-৳{input.packaging_cost?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Return Loss</td><td className="border p-2 text-right text-red-600">-৳{input.return_loss?.toLocaleString()}</td></tr>
              <tr><td className="border p-2">Other Expenses</td><td className="border p-2 text-right text-red-600">-৳{input.other_expenses?.toLocaleString()}</td></tr>
              <tr><td className="border p-2 font-medium">Total Payroll</td><td className="border p-2 text-right text-red-600">-৳{payroll?.toLocaleString()}</td></tr>
              <tr className="bg-slate-100"><td className="border p-2 font-bold">Total Expenses</td><td className="border p-2 text-right font-bold text-red-600">-৳{result.totalExpenses?.toLocaleString()}</td></tr>
              <tr className="bg-green-100"><td className="border p-2 font-bold text-lg">Net Profit</td><td className={`border p-2 text-right font-bold text-2xl ${result.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>৳{result.netProfit?.toLocaleString()}</td></tr>
              <tr className="bg-blue-50"><td className="border p-2 font-bold">Profit Margin</td><td className="border p-2 text-right font-bold text-blue-600">{result.profitMargin?.toFixed(1)}%</td></tr>
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Save New Report Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowSaveDialog(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          Save Current Report
        </Button>
      </div>

      {/* Saved Reports Table */}
      {savedReports.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              Saved Reports ({savedReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead>Report Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedReports.map(report => (
                  <TableRow key={report.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>
                      <Badge className={report.type === 'roi' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                        {report.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{format(new Date(report.date), 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedReport(report)}
                          className="border-slate-300"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportAsImage(report)}
                          disabled={isExporting}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <Image className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportAsPDF(report)}
                          disabled={isExporting}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteReport(report.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-red-600" />
              Save Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Report Name</Label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g., January ROI Analysis"
              />
            </div>
            <div className="space-y-2">
              <Label>Report Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={reportType === 'roi' ? 'default' : 'outline'}
                  onClick={() => setReportType('roi')}
                  className={reportType === 'roi' ? 'bg-red-600' : ''}
                >
                  ROI Report
                </Button>
                <Button
                  type="button"
                  variant={reportType === 'pl' ? 'default' : 'outline'}
                  onClick={() => setReportType('pl')}
                  className={reportType === 'pl' ? 'bg-red-600' : ''}
                >
                  P&L Report
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={saveCurrentReport} className="bg-red-600 hover:bg-red-700">
              <Save className="w-4 h-4 mr-2" />
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={!!selectedReport && !isExporting} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          {selectedReport && renderReportTable(selectedReport)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>Close</Button>
            <Button onClick={() => exportAsImage(selectedReport)} className="bg-green-600 hover:bg-green-700">
              <Image className="w-4 h-4 mr-2" />
              Download Image
            </Button>
            <Button onClick={() => exportAsPDF(selectedReport)} className="bg-red-600 hover:bg-red-700">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Export Table */}
      {isExporting && selectedReport && (
        <div className="fixed -left-[9999px]">
          {renderReportTable(selectedReport)}
        </div>
      )}
    </div>
  );
}
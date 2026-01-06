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
  BookOpen, ShoppingCart, ShoppingBag, PackageX, TrendingUp, BarChart3
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
  const [startDate, setStartDate] = useState(get30DaysAgo());
  const [endDate, setEndDate] = useState(toBDTDate());
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch categories dynamically
  const { data: categories = [] } = useQuery({
    queryKey: ['productCategories'],
    queryFn: () => base44.entities.ProductCategory.list(),
  });

  // Filter categories for Prodhan.com only
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.department === 'prodhan_com_e_commerce'
    );
  }, [categories]);

  const handleGenerateReport = async (reportType) => {
    setReportGenerating(reportType);
    try {
      // Fetch real-time data
      toast.info('Fetching latest data...');
      const [orders, inventory, movements] = await Promise.all([
        base44.entities.Order.list('-order_date'),
        base44.entities.Inventory.list(),
        base44.entities.InventoryMovement.list('-movement_date', 10000)
      ]);

      const requestBody = { 
        reportType,
        department: 'prodhan_com_e_commerce',
        dateFrom: startDate,
        dateTo: endDate,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        orders,
        inventory,
        movements
      };

      toast.info('Generating report...');
      const response = await base44.functions.invoke('generateInventorySalesReport', requestBody);

      if (response.data?.pdfBase64) {
        // Decode base64 to blob
        const binaryString = atob(response.data.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_${toBDTDate()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('✅ Report downloaded with real-time data!');
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
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Filters */}
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <Label className="text-xs text-slate-600 font-medium">Start Date (BDT)</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 font-medium">End Date (BDT)</Label>
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
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                type="stock_valuation" 
                icon={FileText} 
                title="Stock Valuation" 
                color="text-violet-600"
                bgColor="bg-violet-50"
                hoverBorder="violet-400"
              />
              <ReportButton 
                type="low_stock" 
                icon={TrendingDown} 
                title="Low Stock Alert" 
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={async () => {
                  setReportGenerating('sales_manager');
                  try {
                    toast.info('Generating Sales Manager Report...');
                    const response = await base44.functions.invoke('generateSalesManagerReport', {});
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
                      a.download = `sales_manager_report_${toBDTDate()}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      a.remove();
                      toast.success('✅ Sales Manager Report downloaded!');
                    }
                  } catch (error) {
                    toast.error('Failed to generate report: ' + error.message);
                  } finally {
                    setReportGenerating(null);
                  }
                }}
                disabled={!!reportGenerating}
                className="group h-36 rounded-xl border-2 border-slate-200 bg-white hover:border-violet-400 hover:bg-violet-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
              >
                {reportGenerating === 'sales_manager' ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
                    <p className="text-xs text-slate-500 mt-2">Generating...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4">
                    <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center mb-2">
                      <BarChart3 className="w-6 h-6 text-violet-600" />
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">Sales Manager Report</p>
                  </div>
                )}
              </button>
              <ReportButton 
                type="sales_summary" 
                icon={ShoppingBag} 
                title="Sales Summary" 
                color="text-green-600"
                bgColor="bg-green-50"
                hoverBorder="green-400"
              />
              <ReportButton 
                type="damaged_products" 
                icon={PackageX} 
                title="Damaged Products" 
                color="text-red-600"
                bgColor="bg-red-50"
                hoverBorder="red-400"
              />
              <ReportButton 
                type="returned_products" 
                icon={RotateCcw} 
                title="Returned Products" 
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

export default withPermission(InventoryReportsPage, 'inventory_reports', 'can_view');
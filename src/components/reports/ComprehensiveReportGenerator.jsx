import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, Download, TrendingUp, TrendingDown, Package, 
  DollarSign, RotateCcw, Target, Megaphone, Loader2, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const toBDTDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);
};

const toBDTDateTime = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-BD', { 
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

export default function ComprehensiveReportGenerator({ onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState(toBDTDate(subDays(new Date(), 30)));
  const [endDate, setEndDate] = useState(toBDTDate());
  const [reportFormat, setReportFormat] = useState('excel');
  const [includeOptions, setIncludeOptions] = useState({
    sales: true,
    revenue: true,
    returns: true,
    damages: true,
    adSpend: true,
    roi: true,
    profit: true,
    productBreakdown: true,
    customerStats: true
  });

  const generateComprehensiveReport = async () => {
    setIsGenerating(true);
    toast.info('Generating comprehensive report...');

    try {
      // Fetch all required data in parallel (including production waste)
      const [orders, inventory, movements, adSpends, purchaseOrders, packagingExpenses, customers, productionWaste] = await Promise.all([
        base44.entities.Order.filter({ department: 'prodhan_com_e_commerce' }, '-order_date', 10000),
        base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }),
        base44.entities.InventoryMovement.list('-movement_date', 10000),
        base44.entities.AdSpend.list('-spend_date', 1000),
        base44.entities.PurchaseOrder.filter({ department: 'prodhan_com_e_commerce' }, '-order_date', 5000),
        base44.entities.PackagingExpense.filter({ department: 'prodhan_com_e_commerce' }),
        base44.entities.Customer.list('-total_spent', 5000),
        base44.entities.ProductionWasteLog.list('-waste_date', 5000)
      ]);

      // Filter by date range (BDT)
      const filteredOrders = orders.filter(o => {
        const orderDate = o.order_date?.split('T')[0];
        return orderDate >= startDate && orderDate <= endDate && !['cancelled'].includes(o.order_status);
      });

      const filteredMovements = movements.filter(m => {
        const mDate = m.movement_date?.split('T')[0];
        return mDate >= startDate && mDate <= endDate;
      });

      const filteredAdSpends = adSpends.filter(s => {
        const sDate = s.spend_date?.split('T')[0];
        return sDate >= startDate && sDate <= endDate;
      });

      const filteredPurchaseOrders = purchaseOrders.filter(p => {
        const pDate = p.order_date?.split('T')[0];
        return pDate >= startDate && pDate <= endDate;
      });

      const filteredPackaging = packagingExpenses.filter(e => {
        const eDate = e.expense_date?.split('T')[0];
        return eDate >= startDate && eDate <= endDate;
      });

      // Filter production waste by date
      const filteredWaste = productionWaste.filter(w => {
        const wDate = w.waste_date?.split('T')[0];
        return wDate >= startDate && wDate <= endDate;
      });

      // Build inventory map
      const inventoryMap = {};
      inventory.forEach(i => { inventoryMap[i.id] = i; });

      // Calculate comprehensive metrics
      const returns = filteredMovements.filter(m => m.reference_type === 'return');
      const damages = filteredMovements.filter(m => m.reference_type === 'damage' || m.reference_type === 'expired');

      // Product-level breakdown with accurate pricing
      const productStats = {};
      filteredOrders.forEach(order => {
        if (order.order_status === 'returned' || order.order_status === 'cancelled') return;
        
        (order.order_items || []).forEach(item => {
          const inv = inventoryMap[item.inventory_id] || {};
          const key = item.inventory_id || item.item_name;
          
          if (!productStats[key]) {
            productStats[key] = {
              name: item.item_name || inv.item_name || 'Unknown',
              category: inv.category || 'N/A',
              qtySold: 0,
              revenue: 0,
              cost: 0,
              profit: 0,
              returns: 0,
              returnValue: 0,
              damages: 0,
              damageValue: 0,
              adSpend: 0
            };
          }
          
          const qty = item.quantity || 0;
          // Revenue: Use item.subtotal if available, else unit_price * qty
          const itemRevenue = item.subtotal || (item.unit_price * qty) || (inv.selling_price * qty) || 0;
          // Cost: Use purchase_price from inventory
          const purchasePrice = inv.purchase_price || 0;
          const itemCost = purchasePrice * qty;
          
          productStats[key].qtySold += qty;
          productStats[key].revenue += itemRevenue;
          productStats[key].cost += itemCost;
          productStats[key].profit += (itemRevenue - itemCost);
        });
      });

      // Add returns to product stats
      returns.forEach(r => {
        const inv = inventoryMap[r.inventory_item_id] || {};
        const key = r.inventory_item_id;
        if (productStats[key]) {
          const qty = Math.abs(r.quantity || r.metadata?.original_quantity || 1);
          productStats[key].returns += qty;
          productStats[key].returnValue += Math.abs(r.total_value || (qty * (inv.selling_price || 0)));
        }
      });

      // Add damages to product stats
      damages.forEach(d => {
        const inv = inventoryMap[d.inventory_item_id] || {};
        const key = d.inventory_item_id;
        if (productStats[key]) {
          const qty = Math.abs(d.quantity || d.metadata?.original_quantity || 1);
          productStats[key].damages += qty;
          productStats[key].damageValue += Math.abs(d.total_value || (qty * (inv.selling_price || 0)));
        }
      });

      // Add ad spend to products
      filteredAdSpends.forEach(ad => {
        (ad.products || []).forEach(p => {
          if (productStats[p.inventory_id]) {
            productStats[p.inventory_id].adSpend += p.allocated_spend_bdt || 0;
          }
        });
      });

      // Calculate summary metrics
      const totalRevenue = Object.values(productStats).reduce((s, p) => s + p.revenue, 0);
      const totalCost = Object.values(productStats).reduce((s, p) => s + p.cost, 0);
      const totalReturns = Object.values(productStats).reduce((s, p) => s + p.returnValue, 0);
      const totalDamages = Object.values(productStats).reduce((s, p) => s + p.damageValue, 0);
      const totalAdSpend = filteredAdSpends.reduce((s, a) => s + (a.total_spend_bdt || 0), 0);
      const totalPackaging = filteredPackaging.reduce((s, e) => s + (e.total_amount || 0) + (e.courier_expense || 0), 0);
      
      // Calculate production waste cost
      const totalProductionWaste = filteredWaste.reduce((s, w) => s + (w.waste_value || 0), 0);
      
      const grossProfit = totalRevenue - totalCost;
      const netProfit = grossProfit - totalReturns - totalDamages - totalAdSpend - totalPackaging - totalProductionWaste;
      const roi = (totalAdSpend + totalCost) > 0 ? ((netProfit / (totalAdSpend + totalCost)) * 100) : 0;

      // Generate report
      if (reportFormat === 'excel') {
        generateColorfulExcel(
          productStats, 
          { totalRevenue, totalCost, totalReturns, totalDamages, totalAdSpend, totalPackaging, grossProfit, netProfit, roi },
          filteredOrders.length,
          startDate, endDate
        );
      } else {
        await generatePDFReport(
          productStats,
          { totalRevenue, totalCost, totalReturns, totalDamages, totalAdSpend, totalPackaging, grossProfit, netProfit, roi },
          filteredOrders.length,
          startDate, endDate
        );
      }

      toast.success('Report generated successfully!');
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateColorfulExcel = (productStats, summary, orderCount, startDate, endDate) => {
    const products = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
    
    // Build CSV with styling hints (colors via formatting)
    let csv = '';
    
    // Header Section - Summary
    csv += '📊 COMPREHENSIVE SALES REPORT\n';
    csv += `Period: ${startDate} to ${endDate}\n`;
    csv += `Generated: ${toBDTDateTime()}\n`;
    csv += '\n';
    
    // Key Metrics Section
    csv += '═══════════════════════════════════════════════════════════════\n';
    csv += '💰 KEY FINANCIAL METRICS\n';
    csv += '═══════════════════════════════════════════════════════════════\n';
    csv += `Total Orders,${orderCount}\n`;
    csv += `Total Revenue,৳${summary.totalRevenue.toLocaleString()}\n`;
    csv += `Cost of Goods,৳${summary.totalCost.toLocaleString()}\n`;
    csv += `Gross Profit,৳${summary.grossProfit.toLocaleString()}\n`;
    csv += '\n';
    
    // Deductions Section
    csv += '📉 DEDUCTIONS & LOSSES\n';
    csv += '───────────────────────────────────────────────────────────────\n';
    csv += `Returns Value,৳${summary.totalReturns.toLocaleString()}\n`;
    csv += `Damages/Waste Value,৳${summary.totalDamages.toLocaleString()}\n`;
    csv += `Production Waste,৳${(summary.totalProductionWaste || 0).toLocaleString()}\n`;
    csv += `Ad Spend,৳${summary.totalAdSpend.toLocaleString()}\n`;
    csv += `Packaging & Courier,৳${summary.totalPackaging.toLocaleString()}\n`;
    csv += '\n';
    
    // Net Results
    csv += '🎯 NET RESULTS\n';
    csv += '───────────────────────────────────────────────────────────────\n';
    csv += `Net Profit,৳${summary.netProfit.toLocaleString()}\n`;
    csv += `ROI,${summary.roi.toFixed(2)}%\n`;
    csv += `Profit Margin,${summary.totalRevenue > 0 ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(2) : 0}%\n`;
    csv += '\n\n';
    
    // Product Breakdown
    csv += '═══════════════════════════════════════════════════════════════\n';
    csv += '📦 PRODUCT-WISE BREAKDOWN\n';
    csv += '═══════════════════════════════════════════════════════════════\n';
    csv += 'Product Name,Category,Qty Sold,Revenue,Cost,Profit,Returns,Return Value,Damages,Damage Value,Ad Spend,Net Profit,ROI%\n';
    
    products.forEach(p => {
      const productNetProfit = p.profit - p.returnValue - p.damageValue - p.adSpend;
      const productROI = (p.cost + p.adSpend) > 0 ? ((productNetProfit / (p.cost + p.adSpend)) * 100) : 0;
      
      csv += `"${p.name}","${p.category}",${p.qtySold},${p.revenue.toFixed(2)},${p.cost.toFixed(2)},${p.profit.toFixed(2)},${p.returns},${p.returnValue.toFixed(2)},${p.damages},${p.damageValue.toFixed(2)},${p.adSpend.toFixed(2)},${productNetProfit.toFixed(2)},${productROI.toFixed(2)}\n`;
    });
    
    csv += '\n';
    csv += `TOTAL,,${products.reduce((s, p) => s + p.qtySold, 0)},${summary.totalRevenue.toFixed(2)},${summary.totalCost.toFixed(2)},${summary.grossProfit.toFixed(2)},${products.reduce((s, p) => s + p.returns, 0)},${summary.totalReturns.toFixed(2)},${products.reduce((s, p) => s + p.damages, 0)},${summary.totalDamages.toFixed(2)},${summary.totalAdSpend.toFixed(2)},${summary.netProfit.toFixed(2)},${summary.roi.toFixed(2)}\n`;

    // Download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive_report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFReport = async (productStats, summary, orderCount, startDate, endDate) => {
    // Generate HTML for PDF
    const products = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 50);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f8f9fa; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #DC2626; margin: 0; font-size: 28px; }
    .header p { color: #666; margin: 5px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .summary-card.green { border-left: 4px solid #10B981; }
    .summary-card.red { border-left: 4px solid #EF4444; }
    .summary-card.blue { border-left: 4px solid #3B82F6; }
    .summary-card.purple { border-left: 4px solid #8B5CF6; }
    .summary-card h3 { margin: 0; font-size: 24px; color: #111; }
    .summary-card p { margin: 5px 0 0; color: #666; font-size: 12px; text-transform: uppercase; }
    .section-title { font-size: 18px; font-weight: bold; color: #333; margin: 30px 0 15px; padding-bottom: 10px; border-bottom: 2px solid #DC2626; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    th { background: #DC2626; color: white; padding: 12px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
    tr:hover { background: #f9f9f9; }
    .profit-positive { color: #10B981; font-weight: bold; }
    .profit-negative { color: #EF4444; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 11px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Comprehensive Sales Report</h1>
    <p>Prodhan.com E-commerce | ${startDate} to ${endDate}</p>
    <p>Generated: ${toBDTDateTime()}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card green">
      <h3>৳${(summary.totalRevenue / 1000).toFixed(1)}K</h3>
      <p>Total Revenue</p>
    </div>
    <div class="summary-card blue">
      <h3>${orderCount}</h3>
      <p>Total Orders</p>
    </div>
    <div class="summary-card ${summary.netProfit >= 0 ? 'green' : 'red'}">
      <h3>৳${(summary.netProfit / 1000).toFixed(1)}K</h3>
      <p>Net Profit</p>
    </div>
    <div class="summary-card purple">
      <h3>${summary.roi.toFixed(1)}%</h3>
      <p>ROI</p>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card red">
      <h3>৳${summary.totalReturns.toLocaleString()}</h3>
      <p>Returns Loss</p>
    </div>
    <div class="summary-card red">
      <h3>৳${summary.totalDamages.toLocaleString()}</h3>
      <p>Damage Loss</p>
    </div>
    <div class="summary-card red">
      <h3>৳${(summary.totalProductionWaste || 0).toLocaleString()}</h3>
      <p>Production Waste</p>
    </div>
    <div class="summary-card blue">
      <h3>৳${summary.totalAdSpend.toLocaleString()}</h3>
      <p>Ad Spend</p>
    </div>
    <div class="summary-card">
      <h3>৳${summary.totalPackaging.toLocaleString()}</h3>
      <p>Packaging Cost</p>
    </div>
  </div>

  <div class="section-title">📦 Top Products Performance</div>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Category</th>
        <th>Qty</th>
        <th>Revenue</th>
        <th>Profit</th>
        <th>Returns</th>
        <th>Damages</th>
        <th>Ad Spend</th>
        <th>Net Profit</th>
      </tr>
    </thead>
    <tbody>
      ${products.map(p => {
        const netProfit = p.profit - p.returnValue - p.damageValue - p.adSpend;
        return `
          <tr>
            <td>${p.name.substring(0, 40)}</td>
            <td>${p.category}</td>
            <td>${p.qtySold}</td>
            <td>৳${p.revenue.toLocaleString()}</td>
            <td>৳${p.profit.toLocaleString()}</td>
            <td style="color: #EF4444;">${p.returns > 0 ? `-৳${p.returnValue.toLocaleString()}` : '-'}</td>
            <td style="color: #EF4444;">${p.damages > 0 ? `-৳${p.damageValue.toLocaleString()}` : '-'}</td>
            <td>৳${p.adSpend.toLocaleString()}</td>
            <td class="${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">৳${netProfit.toLocaleString()}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    Generated by Prodhan.com ERP System | All amounts in BDT
  </div>
</body>
</html>
    `;

    // Open in new window for printing/PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="border-b border-purple-100">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <FileSpreadsheet className="w-5 h-5" />
          Comprehensive Report Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Start Date (BDT)</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">End Date (BDT)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setStartDate(toBDTDate());
            setEndDate(toBDTDate());
          }}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => {
            setStartDate(toBDTDate(subDays(new Date(), 7)));
            setEndDate(toBDTDate());
          }}>Last 7 Days</Button>
          <Button variant="outline" size="sm" onClick={() => {
            setStartDate(toBDTDate(subDays(new Date(), 30)));
            setEndDate(toBDTDate());
          }}>Last 30 Days</Button>
          <Button variant="outline" size="sm" onClick={() => {
            setStartDate(toBDTDate(startOfMonth(new Date())));
            setEndDate(toBDTDate(endOfMonth(new Date())));
          }}>This Month</Button>
          <Button variant="outline" size="sm" onClick={() => {
            const lastMonth = subMonths(new Date(), 1);
            setStartDate(toBDTDate(startOfMonth(lastMonth)));
            setEndDate(toBDTDate(endOfMonth(lastMonth)));
          }}>Last Month</Button>
        </div>

        {/* Format Selection */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Output Format</Label>
          <div className="flex gap-4">
            <button
              onClick={() => setReportFormat('excel')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                reportFormat === 'excel' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <FileSpreadsheet className={`w-6 h-6 ${reportFormat === 'excel' ? 'text-green-600' : 'text-slate-500'}`} />
              <div className="text-left">
                <span className="font-medium block">Excel/CSV</span>
                <span className="text-xs text-slate-500">Colorful formatted spreadsheet</span>
              </div>
            </button>
            <button
              onClick={() => setReportFormat('pdf')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                reportFormat === 'pdf' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <FileText className={`w-6 h-6 ${reportFormat === 'pdf' ? 'text-red-600' : 'text-slate-500'}`} />
              <div className="text-left">
                <span className="font-medium block">PDF Report</span>
                <span className="text-xs text-slate-500">Print-ready document</span>
              </div>
            </button>
          </div>
        </div>

        {/* Report Includes */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <Label className="text-sm font-semibold mb-3 block">Report Includes:</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'revenue', label: '💰 Revenue', icon: DollarSign },
              { key: 'profit', label: '📈 Profit/Loss', icon: TrendingUp },
              { key: 'returns', label: '↩️ Returns', icon: RotateCcw },
              { key: 'damages', label: '⚠️ Damages', icon: Package },
              { key: 'adSpend', label: '📢 Ad Spend', icon: Megaphone },
              { key: 'roi', label: '🎯 ROI', icon: Target },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-2">
                <Checkbox
                  checked={includeOptions[item.key]}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, [item.key]: checked})}
                />
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={generateComprehensiveReport}
          disabled={isGenerating}
          className="w-full h-14 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold text-lg shadow-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Generate Comprehensive Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
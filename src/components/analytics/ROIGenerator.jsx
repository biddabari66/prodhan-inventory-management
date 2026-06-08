import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Target, Package, TrendingUp, TrendingDown, AlertCircle, X, Save, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import SearchableProductSelect from '../common/SearchableProductSelect';

export default function ROIGenerator() {
  const queryClient = useQueryClient();
  const [analysisType, setAnalysisType] = useState('single'); // 'single' or 'all'
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedProductForSingle, setSelectedProductForSingle] = useState('');
  const [savedROIs, setSavedROIs] = useState([]);
  const [roiData, setRoiData] = useState({
    purchase_price: 0,
    selling_price: 0,
    quantity_sold: 0,
    ad_spend: 0,
    packaging_per_unit: 0,
    shipping_per_unit: 0,
    waste_per_unit: 0,
    return_rate: 0,
    other_costs: 0
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => erp.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' })
  });

  const { data: adSpends = [] } = useQuery({
    queryKey: ['adSpends'],
    queryFn: () => erp.entities.AdSpend.list('-spend_date', 500)
  });

  // Load product data when single product selected
  const handleProductSelect = (productId) => {
    setSelectedProductForSingle(productId);
    if (productId) {
      const product = inventory.find(p => p.id === productId);
      if (product) {
        const productAdSpend = getProductAdSpend(productId);
        setRoiData({
          ...roiData,
          purchase_price: product.purchase_price || 0,
          selling_price: product.selling_price || 0,
          quantity_sold: product.total_sold || 0,
          ad_spend: productAdSpend,
          packaging_per_unit: product.packaging_cost || 0
        });
      }
    }
  };

  // Get ad spend for selected product
  const getProductAdSpend = (productId) => {
    let totalSpend = 0;
    adSpends.forEach(spend => {
      const productData = spend.products?.find(p => p.inventory_id === productId);
      if (productData) {
        totalSpend += productData.allocated_spend_bdt || 0;
      }
    });
    return totalSpend;
  };

  // Calculate ROI for single product
  const calculateSingleROI = () => {
    const totalRevenue = roiData.selling_price * roiData.quantity_sold;
    const totalCOGS = roiData.purchase_price * roiData.quantity_sold;
    const totalPackaging = roiData.packaging_per_unit * roiData.quantity_sold;
    const totalShipping = roiData.shipping_per_unit * roiData.quantity_sold;
    const totalWaste = roiData.waste_per_unit * roiData.quantity_sold;
    const returnLoss = totalRevenue * (roiData.return_rate / 100);
    
    const totalCosts = totalCOGS + roiData.ad_spend + totalPackaging + totalShipping + totalWaste + returnLoss + roiData.other_costs;
    const grossProfit = totalRevenue - totalCosts;
    const roi = totalCosts > 0 ? ((grossProfit / totalCosts) * 100) : 0;
    const profitPerUnit = roiData.quantity_sold > 0 ? (grossProfit / roiData.quantity_sold) : 0;
    
    return {
      totalRevenue,
      totalCOGS,
      totalPackaging,
      totalShipping,
      totalWaste,
      returnLoss,
      totalCosts,
      grossProfit,
      roi,
      profitPerUnit
    };
  };

  // Calculate ROI for all products
  const calculateAllProductsROI = useMemo(() => {
    if (selectedProducts.length === 0) return null;
    
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalAdSpend = 0;
    let totalPackaging = 0;
    let totalWaste = 0;
    
    selectedProducts.forEach(productId => {
      const product = inventory.find(p => p.id === productId);
      if (!product) return;
      
      const quantitySold = product.total_sold || 0;
      totalRevenue += (product.selling_price || 0) * quantitySold;
      totalCOGS += (product.purchase_price || 0) * quantitySold;
      totalAdSpend += getProductAdSpend(productId);
      totalPackaging += (product.packaging_cost || 0) * quantitySold;
    });
    
    const totalCosts = totalCOGS + totalAdSpend + totalPackaging + totalWaste + roiData.other_costs;
    const grossProfit = totalRevenue - totalCosts;
    const roi = totalCosts > 0 ? ((grossProfit / totalCosts) * 100) : 0;
    
    return { totalRevenue, totalCOGS, totalAdSpend, totalPackaging, totalCosts, grossProfit, roi };
  }, [selectedProducts, inventory, adSpends, roiData.other_costs]);

  const result = analysisType === 'single' ? calculateSingleROI() : calculateAllProductsROI;

  // Save ROI to table
  const handleSaveROI = () => {
    if (!result || !result.totalRevenue) {
      toast.error('Please calculate ROI first');
      return;
    }

    const productName = analysisType === 'single' 
      ? (selectedProductForSingle ? inventory.find(p => p.id === selectedProductForSingle)?.item_name : 'Manual Entry')
      : `${selectedProducts.length} Products`;

    const newROI = {
      id: Date.now(),
      date: format(new Date(), 'yyyy-MM-dd HH:mm'),
      product_name: productName,
      product_id: selectedProductForSingle || null,
      revenue: result.totalRevenue,
      costs: result.totalCosts,
      profit: result.grossProfit,
      roi: result.roi,
      type: analysisType,
      details: {
        ad_spend: roiData.ad_spend,
        packaging: result.totalPackaging || 0,
        cogs: result.totalCOGS,
        quantity: roiData.quantity_sold
      }
    };

    setSavedROIs([newROI, ...savedROIs]);
    toast.success('ROI saved to table!');
  };

  // Export saved ROIs to Excel
  const handleExportROIs = () => {
    if (savedROIs.length === 0) {
      toast.error('No saved ROIs to export');
      return;
    }

    const headers = ['Date', 'Product', 'Revenue', 'Total Costs', 'Profit', 'ROI %', 'Ad Spend', 'COGS', 'Quantity'];
    const rows = savedROIs.map(r => [
      r.date,
      r.product_name,
      r.revenue,
      r.costs,
      r.profit,
      r.roi.toFixed(2),
      r.details.ad_spend,
      r.details.cogs,
      r.details.quantity
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roi_analysis_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${savedROIs.length} ROI records`);
  };

  // Delete saved ROI
  const handleDeleteROI = (id) => {
    setSavedROIs(savedROIs.filter(r => r.id !== id));
    toast.success('ROI record deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">ROI Generator</h2>
            <p className="text-sm text-slate-600">Calculate Return on Investment with all costs</p>
          </div>
        </div>
        <Select value={analysisType} onValueChange={setAnalysisType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Per Product ROI</SelectItem>
            <SelectItem value="all">All Products ROI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-lg">ROI Inputs</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {analysisType === 'single' ? (
              <>
                <div>
                  <Label>Select Product (Optional - auto-fills data)</Label>
                  <SearchableProductSelect
                    inventory={inventory}
                    value={selectedProductForSingle}
                    onValueChange={handleProductSelect}
                    placeholder="Search product to auto-fill..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Purchase Price (per unit)</Label>
                    <Input
                      type="number"
                      value={roiData.purchase_price}
                      onChange={(e) => setRoiData({...roiData, purchase_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Selling Price (per unit)</Label>
                    <Input
                      type="number"
                      value={roiData.selling_price}
                      onChange={(e) => setRoiData({...roiData, selling_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity Sold</Label>
                    <Input
                      type="number"
                      value={roiData.quantity_sold}
                      onChange={(e) => setRoiData({...roiData, quantity_sold: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Ad Spend (BDT)</Label>
                    <Input
                      type="number"
                      value={roiData.ad_spend}
                      onChange={(e) => setRoiData({...roiData, ad_spend: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Packaging/unit</Label>
                    <Input
                      type="number"
                      value={roiData.packaging_per_unit}
                      onChange={(e) => setRoiData({...roiData, packaging_per_unit: parseFloat(e.target.value) || 0})}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Shipping/unit</Label>
                    <Input
                      type="number"
                      value={roiData.shipping_per_unit}
                      onChange={(e) => setRoiData({...roiData, shipping_per_unit: parseFloat(e.target.value) || 0})}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Waste/unit</Label>
                    <Input
                      type="number"
                      value={roiData.waste_per_unit}
                      onChange={(e) => setRoiData({...roiData, waste_per_unit: parseFloat(e.target.value) || 0})}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Return Rate (%)</Label>
                    <Input
                      type="number"
                      value={roiData.return_rate}
                      onChange={(e) => setRoiData({...roiData, return_rate: parseFloat(e.target.value) || 0})}
                      max={100}
                    />
                  </div>
                  <div>
                    <Label>Other Costs</Label>
                    <Input
                      type="number"
                      value={roiData.other_costs}
                      onChange={(e) => setRoiData({...roiData, other_costs: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Select Products</Label>
                  <SearchableProductSelect
                    inventory={inventory}
                    value=""
                    onValueChange={(v) => {
                      if (v && !selectedProducts.includes(v)) {
                        setSelectedProducts([...selectedProducts, v]);
                      }
                    }}
                    placeholder="Search and select products..."
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedProducts.map(p => {
                      const item = inventory.find(i => i.id === p);
                      return (
                        <Badge key={p} className="bg-blue-100 text-blue-800 gap-2">
                          {item?.item_name}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-red-600"
                            onClick={() => setSelectedProducts(selectedProducts.filter(id => id !== p))}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label>Other Costs (Optional)</Label>
                  <Input
                    type="number"
                    value={roiData.other_costs}
                    onChange={(e) => setRoiData({...roiData, other_costs: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-lg">ROI Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {result && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 uppercase font-semibold mb-1">Revenue</p>
                    <p className="text-xl font-bold text-green-600">৳{result.totalRevenue?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 uppercase font-semibold mb-1">Total Costs</p>
                    <p className="text-xl font-bold text-red-600">৳{result.totalCosts?.toLocaleString()}</p>
                  </div>
                </div>

                {analysisType === 'single' && (
                  <div className="space-y-2 p-4 bg-slate-50 rounded-lg border">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Cost Breakdown</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">COGS</span>
                        <span className="font-medium">৳{result.totalCOGS?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Ad Spend</span>
                        <span className="font-medium">৳{roiData.ad_spend?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Packaging</span>
                        <span className="font-medium">৳{result.totalPackaging?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Shipping</span>
                        <span className="font-medium">৳{result.totalShipping?.toLocaleString()}</span>
                      </div>
                      {result.totalWaste > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Waste</span>
                          <span className="font-medium text-red-600">৳{result.totalWaste?.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-600">Return Loss ({roiData.return_rate}%)</span>
                        <span className="font-medium text-red-600">৳{result.returnLoss?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`p-4 rounded-lg border-2 ${result.grossProfit >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-semibold ${result.grossProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      Gross Profit
                    </span>
                    <span className={`text-xl font-bold ${result.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ৳{result.grossProfit?.toLocaleString()}
                    </span>
                  </div>
                  {analysisType === 'single' && result.profitPerUnit !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Profit Per Unit</span>
                      <span className="text-sm font-semibold">৳{result.profitPerUnit?.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* ROI Display */}
                <div className={`p-6 rounded-xl text-center ${result.roi >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                  <p className="text-white/80 text-sm font-medium mb-1">Return on Investment (ROI)</p>
                  <p className="text-5xl font-bold text-white mb-2">{result.roi?.toFixed(2)}%</p>
                  <p className="text-white/90 text-sm">
                    {result.roi >= 50 ? '🚀 Excellent ROI' : 
                     result.roi >= 20 ? '✓ Great ROI' : 
                     result.roi >= 10 ? '○ Good ROI' : 
                     result.roi >= 0 ? '△ Low ROI' : '✗ Negative ROI'}
                  </p>
                </div>

                {/* Recommendations */}
                {result.roi < 20 && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold mb-1">Optimization Suggestions:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Consider reducing ad spend or optimizing targeting</li>
                        <li>Negotiate better supplier prices to reduce COGS</li>
                        <li>Improve packaging efficiency to cut costs</li>
                        <li>Reduce return rate through better quality control</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Save ROI Button */}
                <Button 
                  onClick={handleSaveROI} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save ROI to Table
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saved ROIs Table */}
      {savedROIs.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Saved ROI Records ({savedROIs.length})</CardTitle>
            <Button onClick={handleExportROIs} variant="outline" className="bg-green-50 border-green-200 text-green-700">
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Costs</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedROIs.map((roi) => (
                    <TableRow key={roi.id}>
                      <TableCell className="text-sm">{roi.date}</TableCell>
                      <TableCell className="font-medium">{roi.product_name}</TableCell>
                      <TableCell className="text-right text-green-600">৳{roi.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">৳{roi.costs.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-semibold ${roi.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ৳{roi.profit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={roi.roi >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {roi.roi.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteROI(roi.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
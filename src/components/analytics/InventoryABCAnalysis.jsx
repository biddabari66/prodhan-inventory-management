import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, Package, TrendingUp, AlertCircle } from 'lucide-react';

const ABC_COLORS = {
  A: { bg: 'bg-emerald-100', text: 'text-emerald-800', fill: '#10B981', label: 'High Value' },
  B: { bg: 'bg-amber-100', text: 'text-amber-800', fill: '#F59E0B', label: 'Medium Value' },
  C: { bg: 'bg-slate-100', text: 'text-slate-800', fill: '#64748B', label: 'Low Value' }
};

export default function InventoryABCAnalysis({ inventory = [], orders = [], movements = [] }) {
  const abcAnalysis = useMemo(() => {
    // Calculate sales volume and value for each product
    const productStats = {};
    
    inventory.forEach(item => {
      productStats[item.id] = {
        id: item.id,
        name: item.item_name,
        category: item.category,
        currentStock: item.current_stock || 0,
        purchasePrice: item.purchase_price || 0,
        sellingPrice: item.selling_price || 0,
        salesVolume: 0,
        salesValue: 0,
        stockValue: (item.current_stock || 0) * (item.purchase_price || 0)
      };
    });

    // Add sales data from orders
    orders.forEach(order => {
      if (['cancelled', 'returned'].includes(order.order_status)) return;
      (order.order_items || []).forEach(item => {
        if (productStats[item.inventory_id]) {
          productStats[item.inventory_id].salesVolume += item.quantity || 0;
          productStats[item.inventory_id].salesValue += (item.quantity || 0) * (item.unit_price || 0);
        }
      });
    });

    // Sort by sales value (descending)
    const sortedProducts = Object.values(productStats)
      .filter(p => p.salesValue > 0)
      .sort((a, b) => b.salesValue - a.salesValue);

    const totalSalesValue = sortedProducts.reduce((sum, p) => sum + p.salesValue, 0);
    
    // Classify into ABC categories
    let cumulativePercentage = 0;
    const classified = sortedProducts.map(product => {
      cumulativePercentage += (product.salesValue / totalSalesValue) * 100;
      let classification;
      
      if (cumulativePercentage <= 80) {
        classification = 'A';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      return {
        ...product,
        classification,
        percentageOfTotal: (product.salesValue / totalSalesValue) * 100,
        cumulativePercentage
      };
    });

    // Summary stats
    const summary = {
      A: { count: 0, value: 0, stockValue: 0 },
      B: { count: 0, value: 0, stockValue: 0 },
      C: { count: 0, value: 0, stockValue: 0 }
    };

    classified.forEach(p => {
      summary[p.classification].count++;
      summary[p.classification].value += p.salesValue;
      summary[p.classification].stockValue += p.stockValue;
    });

    return { products: classified, summary, totalSalesValue };
  }, [inventory, orders]);

  const chartData = [
    { name: 'A (High)', products: abcAnalysis.summary.A.count, value: abcAnalysis.summary.A.value, fill: ABC_COLORS.A.fill },
    { name: 'B (Medium)', products: abcAnalysis.summary.B.count, value: abcAnalysis.summary.B.value, fill: ABC_COLORS.B.fill },
    { name: 'C (Low)', products: abcAnalysis.summary.C.count, value: abcAnalysis.summary.C.value, fill: ABC_COLORS.C.fill }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['A', 'B', 'C'].map(classification => (
          <Card key={classification} className={`border-l-4 ${classification === 'A' ? 'border-l-emerald-500' : classification === 'B' ? 'border-l-amber-500' : 'border-l-slate-500'}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Badge className={`${ABC_COLORS[classification].bg} ${ABC_COLORS[classification].text}`}>
                  Class {classification}
                </Badge>
                <span className="text-xs text-slate-500">{ABC_COLORS[classification].label}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Products</span>
                  <span className="font-bold">{abcAnalysis.summary[classification].count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Sales Value</span>
                  <span className="font-bold text-green-600">৳{(abcAnalysis.summary[classification].value / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Stock Value</span>
                  <span className="font-bold">৳{(abcAnalysis.summary[classification].stockValue / 1000).toFixed(1)}K</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            ABC Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(v) => [`৳${v.toLocaleString()}`, 'Sales Value']} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Product Table */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Product Classification</CardTitle>
        </CardHeader>
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Sales Volume</TableHead>
                <TableHead className="text-right">Sales Value</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                <TableHead>Cumulative</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abcAnalysis.products.slice(0, 50).map((product, idx) => (
                <TableRow key={product.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-xs">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.category}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${ABC_COLORS[product.classification].bg} ${ABC_COLORS[product.classification].text}`}>
                      {product.classification}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{product.salesVolume}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">৳{product.salesValue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{product.percentageOfTotal.toFixed(2)}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={product.cumulativePercentage} className="h-2 w-16" />
                      <span className="text-xs">{product.cumulativePercentage.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
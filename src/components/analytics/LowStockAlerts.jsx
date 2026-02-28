import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, Package, ShoppingCart, TrendingUp, 
  ArrowRight, RefreshCw, Bell, CheckCircle 
} from 'lucide-react';
import { toast } from 'sonner';

export default function LowStockAlerts({ inventory = [], orders = [], movements = [] }) {
  const stockAnalysis = useMemo(() => {
    const last30DaysOrders = orders.filter(o => {
      const orderDate = new Date(o.order_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return orderDate >= thirtyDaysAgo && !['cancelled', 'returned'].includes(o.order_status);
    });

    // Calculate sales velocity for each product
    const productSales = {};
    last30DaysOrders.forEach(order => {
      (order.order_items || []).forEach(item => {
        if (!productSales[item.inventory_id]) {
          productSales[item.inventory_id] = { qty: 0, orders: 0 };
        }
        productSales[item.inventory_id].qty += item.quantity || 0;
        productSales[item.inventory_id].orders++;
      });
    });

    // Analyze each inventory item
    const alerts = inventory.map(item => {
      const sales = productSales[item.id] || { qty: 0, orders: 0 };
      const dailySalesRate = sales.qty / 30;
      const daysOfStock = dailySalesRate > 0 ? (item.current_stock || 0) / dailySalesRate : 999;
      const minimumStock = item.minimum_stock || 10;
      const reorderPoint = item.reorder_point || minimumStock * 1.5;
      const leadTime = item.supplier_lead_time_days || 7;
      
      // Calculate suggested reorder quantity
      const safetyStock = dailySalesRate * 7; // 7 days safety stock
      const reorderQty = Math.max(
        Math.ceil((dailySalesRate * leadTime) + safetyStock - (item.current_stock || 0)),
        minimumStock
      );

      // Determine alert level
      let alertLevel = 'ok';
      let alertColor = 'bg-green-100 text-green-800';
      
      if (item.current_stock <= 0) {
        alertLevel = 'critical';
        alertColor = 'bg-red-100 text-red-800';
      } else if (item.current_stock <= minimumStock || daysOfStock <= leadTime) {
        alertLevel = 'urgent';
        alertColor = 'bg-orange-100 text-orange-800';
      } else if (item.current_stock <= reorderPoint || daysOfStock <= (leadTime * 2)) {
        alertLevel = 'warning';
        alertColor = 'bg-amber-100 text-amber-800';
      }

      return {
        id: item.id,
        name: item.item_name,
        category: item.category,
        currentStock: item.current_stock || 0,
        minimumStock,
        reorderPoint,
        dailySalesRate: parseFloat(dailySalesRate.toFixed(2)),
        daysOfStock: Math.round(daysOfStock),
        monthlySales: sales.qty,
        leadTime,
        suggestedReorder: reorderQty > 0 ? reorderQty : 0,
        alertLevel,
        alertColor,
        sellingPrice: item.selling_price || 0,
        purchasePrice: item.purchase_price || 0,
        supplier: item.supplier_name
      };
    }).filter(item => item.alertLevel !== 'ok' || item.dailySalesRate > 0);

    // Sort by urgency
    const sortOrder = { critical: 0, urgent: 1, warning: 2, ok: 3 };
    alerts.sort((a, b) => sortOrder[a.alertLevel] - sortOrder[b.alertLevel]);

    // Summary
    const summary = {
      critical: alerts.filter(a => a.alertLevel === 'critical').length,
      urgent: alerts.filter(a => a.alertLevel === 'urgent').length,
      warning: alerts.filter(a => a.alertLevel === 'warning').length,
      totalReorderValue: alerts
        .filter(a => a.suggestedReorder > 0)
        .reduce((sum, a) => sum + (a.suggestedReorder * a.purchasePrice), 0)
    };

    return { items: alerts, summary };
  }, [inventory, orders]);

  const handleCreatePO = (item) => {
    toast.success(`Reorder suggestion noted for ${item.name}: ${item.suggestedReorder} units`);
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-red-700">{stockAnalysis.summary.critical}</p>
                <p className="text-sm text-red-600">Critical (Out of Stock)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-700">{stockAnalysis.summary.urgent}</p>
                <p className="text-sm text-orange-600">Urgent (Below Min)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-700">{stockAnalysis.summary.warning}</p>
                <p className="text-sm text-amber-600">Warning (Near Reorder)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">৳{(stockAnalysis.summary.totalReorderValue / 1000).toFixed(0)}K</p>
                <p className="text-sm text-blue-600">Est. Reorder Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card className="bg-white border-0 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Stock Alerts & Reorder Suggestions
          </CardTitle>
          <Badge variant="outline">{stockAnalysis.items.length} items need attention</Badge>
        </CardHeader>
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50 z-10">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Alert</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Daily Sales</TableHead>
                <TableHead className="text-right">Days Left</TableHead>
                <TableHead className="text-right">Suggested Order</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockAnalysis.items.slice(0, 50).map((item) => (
                <TableRow key={item.id} className={`hover:bg-slate-50 ${item.alertLevel === 'critical' ? 'bg-red-50' : ''}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-xs">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.supplier || item.category}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={item.alertColor}>
                      {item.alertLevel === 'critical' ? '🔴 Critical' :
                       item.alertLevel === 'urgent' ? '🟠 Urgent' :
                       item.alertLevel === 'warning' ? '🟡 Warning' : '🟢 OK'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`font-bold ${item.currentStock <= 0 ? 'text-red-600' : item.currentStock <= item.minimumStock ? 'text-orange-600' : ''}`}>
                        {item.currentStock}
                      </span>
                      <span className="text-xs text-slate-400">/ {item.minimumStock}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      <span>{item.dailySalesRate}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={item.daysOfStock <= item.leadTime ? 'border-red-300 text-red-600' : ''}>
                      {item.daysOfStock > 100 ? '100+' : item.daysOfStock} days
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.suggestedReorder > 0 && (
                      <div>
                        <p className="font-bold text-blue-600">{item.suggestedReorder} units</p>
                        <p className="text-xs text-slate-500">৳{(item.suggestedReorder * item.purchasePrice).toLocaleString()}</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.suggestedReorder > 0 && (
                      <Button size="sm" variant="outline" onClick={() => handleCreatePO(item)} className="gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Reorder
                      </Button>
                    )}
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
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ChevronUp, Package, TrendingUp } from 'lucide-react';

export default function LowStockPanel({ lowStockItems = [], todaySalesData = {} }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sortedItems = useMemo(() => {
    return [...lowStockItems].sort((a, b) => {
      // Out of stock first, then by shortage severity
      if ((a.current_stock || 0) === 0 && (b.current_stock || 0) > 0) return -1;
      if ((a.current_stock || 0) > 0 && (b.current_stock || 0) === 0) return 1;
      const shortageA = (a.minimum_stock || 0) - (a.current_stock || 0);
      const shortageB = (b.minimum_stock || 0) - (b.current_stock || 0);
      return shortageB - shortageA;
    });
  }, [lowStockItems]);

  const outOfStock = sortedItems.filter(i => (i.current_stock || 0) === 0);
  const criticalLow = sortedItems.filter(i => (i.current_stock || 0) > 0 && (i.current_stock || 0) <= (i.minimum_stock || 0) * 0.5);
  const lowStock = sortedItems.filter(i => (i.current_stock || 0) > (i.minimum_stock || 0) * 0.5);

  const displayItems = showAll ? sortedItems : sortedItems.slice(0, 10);

  if (lowStockItems.length === 0) return null;

  return (
    <Card className="bg-white border-2 border-red-200 shadow-sm rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full"
      >
        <CardHeader className="pb-3 border-b border-red-100 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 transition-colors cursor-pointer">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-base font-semibold text-slate-900">
                  Low Stock Alert — {lowStockItems.length} Items
                </p>
                <div className="flex gap-3 mt-1">
                  {outOfStock.length > 0 && (
                    <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      🔴 {outOfStock.length} Out of Stock
                    </span>
                  )}
                  {criticalLow.length > 0 && (
                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      🟠 {criticalLow.length} Critical
                    </span>
                  )}
                  {lowStock.length > 0 && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      🟡 {lowStock.length} Low
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </CardTitle>
        </CardHeader>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Product</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Stock</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Min Stock</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Shortage</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Today Sales</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Reorder Cost</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item) => {
                  const stock = item.current_stock || 0;
                  const minStock = item.minimum_stock || 0;
                  const shortage = Math.max(0, minStock - stock);
                  const isOutOfStock = stock === 0;
                  const isCritical = stock > 0 && stock <= minStock * 0.5;
                  const todaySold = todaySalesData[item.id] || 0;
                  const reorderCost = shortage * (item.purchase_price || 0);

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 transition-colors ${
                        isOutOfStock ? 'bg-red-50/60 hover:bg-red-50' :
                        isCritical ? 'bg-orange-50/40 hover:bg-orange-50' :
                        'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-[250px]" title={item.item_name}>
                          {item.item_name}
                        </p>
                        <p className="text-xs text-slate-500">{item.category}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isOutOfStock ? (
                          <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs">🔴 Out</Badge>
                        ) : isCritical ? (
                          <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">🟠 Critical</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">🟡 Low</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-lg font-bold ${isOutOfStock ? 'text-red-600' : isCritical ? 'text-orange-600' : 'text-amber-600'}`}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">{minStock}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-red-600">-{shortage}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {todaySold > 0 ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {todaySold}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-slate-700">৳{reorderCost.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {sortedItems.length > 10 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {displayItems.length} of {sortedItems.length} items
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
              >
                {showAll ? 'Show Less' : `Show All ${sortedItems.length} Items`}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
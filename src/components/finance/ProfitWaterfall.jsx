import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowRight, DollarSign } from 'lucide-react';

export default function ProfitWaterfall({ financials }) {
  const {
    collectedRevenue = 0,
    costOfGoods = 0,
    packagingCost = 0,
    returnLoss = 0,
    otherExpenses = 0,
    totalAdSpend = 0,
    totalSalaries = 0,
    totalDiscount = 0,
    customExpenses = 0
  } = financials;

  const grossProfit = collectedRevenue - costOfGoods;
  const operatingProfit = grossProfit - packagingCost - returnLoss - customExpenses;
  const netProfit = operatingProfit - totalAdSpend - totalSalaries - otherExpenses;

  const rows = [
    { label: 'Sales Revenue (Collected)', value: collectedRevenue, type: 'revenue', color: 'bg-green-500' },
    { label: 'Less: Cost of Goods Sold', value: -costOfGoods, type: 'expense', color: 'bg-red-400' },
    { label: 'GROSS PROFIT', value: grossProfit, type: 'subtotal', color: grossProfit >= 0 ? 'bg-green-600' : 'bg-red-600' },
    { label: 'Less: Packaging & Courier', value: -packagingCost, type: 'expense', color: 'bg-amber-400' },
    { label: 'Less: Returns & Wastage', value: -returnLoss, type: 'expense', color: 'bg-orange-400' },
    { label: 'Less: Production Expenses', value: -customExpenses, type: 'expense', color: 'bg-purple-400', hide: customExpenses === 0 },
    { label: 'OPERATING PROFIT', value: operatingProfit, type: 'subtotal', color: operatingProfit >= 0 ? 'bg-green-600' : 'bg-red-600' },
    { label: 'Less: Marketing / Ad Spend', value: -totalAdSpend, type: 'expense', color: 'bg-violet-400', hide: totalAdSpend === 0 },
    { label: 'Less: Staff Salaries', value: -totalSalaries, type: 'expense', color: 'bg-indigo-400', hide: totalSalaries === 0 },
    { label: 'Less: Office & Other Expenses', value: -otherExpenses, type: 'expense', color: 'bg-pink-400', hide: otherExpenses === 0 },
    { label: 'NET PROFIT / LOSS', value: netProfit, type: 'total', color: netProfit >= 0 ? 'bg-green-700' : 'bg-red-700' },
  ].filter(r => !r.hide);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-red-600" />
          Profit & Loss Waterfall
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {rows.map((row, idx) => (
            <div key={idx} className={`flex items-center justify-between p-3 rounded-lg transition-all ${
              row.type === 'subtotal' ? 'bg-slate-100 border border-slate-200' :
              row.type === 'total' ? (row.value >= 0 ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300') :
              row.type === 'revenue' ? 'bg-green-50' : 'bg-white border border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                {row.type === 'expense' && <ArrowDown className="w-3 h-3 text-red-400" />}
                {row.type === 'revenue' && <ArrowRight className="w-3 h-3 text-green-500" />}
                <span className={`text-sm ${
                  row.type === 'subtotal' || row.type === 'total' ? 'font-bold' : 'font-medium'
                } ${row.type === 'total' ? (row.value >= 0 ? 'text-green-800' : 'text-red-800') : 'text-slate-700'}`}>
                  {row.label}
                </span>
              </div>
              <span className={`text-sm font-bold ${
                row.value >= 0 ? 'text-green-700' : 'text-red-600'
              } ${row.type === 'total' ? 'text-lg' : ''}`}>
                {row.value < 0 ? '-' : ''}৳{Math.abs(row.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
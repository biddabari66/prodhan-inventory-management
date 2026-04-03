import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, BookOpen, Edit, Trash2 } from 'lucide-react';

export default function MobileInventoryCard({ item, todaySales = 0, canEdit, canDelete, canViewPurchasePrice, getPurchasePrice, onEdit, onDelete }) {
  const isLow = item.current_stock < item.minimum_stock;
  const isBook = item.category === 'books';

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header: name + status */}
        <div className="flex items-start gap-3 px-3 pt-3 pb-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isBook ? 'bg-cyan-100' : 'bg-purple-100'}`}>
            {isBook ? <BookOpen className="w-4 h-4 text-cyan-600" /> : <Package className="w-4 h-4 text-purple-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-slate-900 leading-tight" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>{item.item_name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0 h-4 rounded-full">{item.category}</Badge>
              {item.isbn && <span className="text-[10px] text-slate-400">ISBN: {item.isbn}</span>}
            </div>
          </div>
          <Badge className={`${isLow ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} rounded-full px-2 py-0 text-[10px] font-medium flex-shrink-0`}>
            {isLow ? 'Low' : 'OK'}
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-px bg-slate-100 mx-3 rounded-lg overflow-hidden mb-2">
          <div className="bg-white p-2 text-center">
            <p className="text-lg font-bold text-slate-900">{item.current_stock}</p>
            <p className="text-[10px] text-slate-500">Stock</p>
          </div>
          <div className="bg-white p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{todaySales}</p>
            <p className="text-[10px] text-slate-500">Today</p>
          </div>
          <div className="bg-white p-2 text-center">
            <p className="text-lg font-bold text-slate-700">৳{(item.selling_price || 0).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Price</p>
          </div>
        </div>

        {/* Bottom: min stock + purchase price + actions */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Min: {item.minimum_stock}</span>
            {canViewPurchasePrice && <span>Cost: ৳{getPurchasePrice(item).toLocaleString()}</span>}
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-7 px-2 text-xs text-slate-600">
                <Edit className="w-3.5 h-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(item)} className="h-7 px-2 text-xs text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
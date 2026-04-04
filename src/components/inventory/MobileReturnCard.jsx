import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, RotateCcw, Calendar, Package, User, Hash, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function MobileReturnCard({ movement, getItemName, getActionBadge, orderLookupMap, onEdit, onDelete }) {
  const metadata = movement.metadata || {};
  const qty = metadata.is_partial
    ? (metadata.good_qty || 0) + (metadata.damaged_qty || 0)
    : metadata.original_quantity || Math.abs(movement.quantity) || 1;
  const orderNum = metadata.order_number || movement.reference_number || '';
  const order = orderLookupMap?.[orderNum];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
      {/* Top row: Product + Impact */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate" title={getItemName(movement.inventory_item_id)}>
            {getItemName(movement.inventory_item_id)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {metadata.return_type && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                metadata.return_type === 'purchase_return'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {metadata.return_type === 'purchase_return' ? 'Purchase' : 'Sales'}
              </Badge>
            )}
            {getActionBadge(metadata.action)}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-red-600">-৳{Math.abs(movement.total_value || 0).toLocaleString()}</p>
          <Badge variant="outline" className="text-[10px] font-semibold mt-0.5">
            Qty: {qty}
          </Badge>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{format(new Date(movement.movement_date), 'MMM dd, yyyy')}</span>
        </div>
        {orderNum && orderNum !== '-' && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Hash className="w-3 h-3 flex-shrink-0" />
            <span className="font-mono truncate">{orderNum}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-slate-500">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {metadata.return_type === 'purchase_return'
              ? (metadata.supplier_name || '-')
              : (metadata.customer_name || '-')}
          </span>
        </div>
        {order && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <DollarSign className="w-3 h-3 flex-shrink-0" />
            <span>Order: ৳{(order.total_amount || 0).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Reason */}
      {metadata.reason && (
        <p className="text-xs text-slate-600 capitalize bg-slate-50 rounded-lg px-2.5 py-1.5">
          {metadata.reason?.replace(/_/g, ' ')}
        </p>
      )}

      {/* Notes */}
      {movement.notes && (
        <p className="text-[11px] text-slate-500 line-clamp-2 italic">{movement.notes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={() => onEdit(movement)} className="h-8 px-2.5 text-xs text-slate-600 gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(movement)} className="h-8 px-2.5 text-xs text-red-600 gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
}
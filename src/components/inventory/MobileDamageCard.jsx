import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Calendar, AlertOctagon } from 'lucide-react';
import { format } from 'date-fns';

export default function MobileDamageCard({ movement, getItemName, getActionBadge, onEdit, onDelete }) {
  const metadata = movement.metadata || {};
  const qty = metadata.original_quantity || Math.abs(movement.quantity) || 1;

  const conditionBadge = (condition) => {
    const cls = condition === 'destroyed' ? 'bg-red-100 text-red-800 border-red-200'
      : condition === 'damaged' ? 'bg-orange-100 text-orange-800 border-orange-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cls}`}>{condition || 'damaged'}</Badge>;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate" title={getItemName(movement.inventory_item_id)}>
            {getItemName(movement.inventory_item_id)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {conditionBadge(metadata.condition)}
            {getActionBadge(metadata.action || 'write_off')}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-red-600">-৳{Math.abs(movement.total_value || 0).toLocaleString()}</p>
          <Badge variant="destructive" className="text-[10px] mt-0.5">
            Qty: {qty}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{format(new Date(movement.movement_date), 'MMM dd, yyyy')}</span>
        </div>
        {movement.performed_by && (
          <span className="truncate">By: {movement.performed_by}</span>
        )}
      </div>

      {/* Reason */}
      {metadata.reason && (
        <p className="text-xs text-slate-600 capitalize bg-red-50 rounded-lg px-2.5 py-1.5">
          {metadata.reason?.replace?.(/_/g, ' ') || metadata.reason}
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
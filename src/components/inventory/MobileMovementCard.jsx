import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, RotateCcw, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const typeColors = {
  in: 'bg-green-100 text-green-800 border-green-200',
  out: 'bg-red-100 text-red-800 border-red-200',
  adjustment: 'bg-blue-100 text-blue-800 border-blue-200',
  transfer: 'bg-purple-100 text-purple-800 border-purple-200',
  return: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const typeIcons = {
  in: <ArrowRight className="w-3.5 h-3.5 text-green-600" />,
  out: <ArrowLeft className="w-3.5 h-3.5 text-red-600" />,
  adjustment: <RotateCcw className="w-3.5 h-3.5 text-blue-600" />,
  transfer: <ArrowRight className="w-3.5 h-3.5 text-purple-600" />,
};

export default function MobileMovementCard({ movement, getItemName }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {getItemName(movement.inventory_item_id)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {typeIcons[movement.movement_type] || typeIcons.in}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColors[movement.movement_type] || typeColors.in}`}>
              {movement.movement_type?.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50">
              {movement.reference_type?.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-bold ${movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Bal: {movement.balance_after}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{format(new Date(movement.movement_date), 'MMM dd, yyyy')}</span>
        </div>
        <span>৳{(movement.total_value || 0).toLocaleString()}</span>
        {movement.reference_number && (
          <span className="font-mono truncate max-w-[80px]">{movement.reference_number}</span>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, FileText, Edit, Phone, Truck, CheckCircle, Clock, Package, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

const STATUS_CONFIG = {
  pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-700' },
  on_hold: { label: 'On Hold', cls: 'bg-yellow-50 text-yellow-700' },
  call_not_received: { label: 'No Answer', cls: 'bg-amber-50 text-amber-700' },
  follow_up: { label: 'Follow Up', cls: 'bg-indigo-50 text-indigo-700' },
  callback_requested: { label: 'Callback', cls: 'bg-pink-50 text-pink-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-white text-red-600 border-2 border-red-500' },
  processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700' },
  packed: { label: 'Packed', cls: 'bg-purple-50 text-purple-700' },
  shipped: { label: 'Shipped', cls: 'bg-cyan-50 text-cyan-700' },
  out_for_delivery: { label: 'Out', cls: 'bg-orange-50 text-orange-700' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700' },
  returned: { label: 'Returned', cls: 'bg-slate-100 text-slate-600' },
};

const PAYMENT_CONFIG = {
  pending: { label: 'Unpaid', cls: 'bg-slate-100 text-slate-600' },
  partial: { label: 'Partial', cls: 'bg-amber-50 text-amber-700' },
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700' },
  refunded: { label: 'Refund', cls: 'bg-red-50 text-red-600' },
};

export default function MobileOrderCard({
  order,
  isSelected,
  onToggleSelect,
  onViewInvoice,
  onEdit,
  onStatusChange,
  onPaymentChange,
  canEdit,
  inventoryMap
}) {
  const status = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
  const payment = PAYMENT_CONFIG[order.payment_status] || PAYMENT_CONFIG.pending;

  const orderNum = order.order_number?.startsWith('PD')
    ? order.order_number
    : order.order_number
      ? `PD${order.order_number.replace(/\D/g, '').slice(-6).padStart(6, '0')}`
      : `PD${order.id?.slice(-6) || '000000'}`;

  const totalItems = (order.order_items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const discount = (order.discount_amount || 0) + (order.coupon_discount || 0);

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-0">
        {/* Top row: checkbox, order#, status, actions */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="border-slate-300 flex-shrink-0"
            />
            <span className="font-mono font-bold text-red-600 text-sm truncate">{orderNum}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge className={`${status.cls} rounded-full px-2 py-0 text-[10px] font-medium`}>{status.label}</Badge>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onClick={() => onViewInvoice(order)}>
                  <FileText className="w-4 h-4 mr-2 text-blue-600" /> View Invoice
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(order)}>
                    <Edit className="w-4 h-4 mr-2 text-purple-600" /> Edit Order
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Customer + date */}
        <div className="px-3 pt-2.5 pb-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-slate-900 truncate">{order.customer_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-500">{order.customer_phone}</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">
              {(() => { const d = new Date(order.order_date || order.created_date); return isNaN(d.getTime()) ? '-' : format(d, 'dd MMM'); })()}
            </span>
          </div>
        </div>

        {/* Items summary */}
        <div className="px-3 py-2">
          <div className="text-xs text-slate-500 space-y-0.5">
            {(order.order_items || []).slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="truncate mr-2">{item.item_name} ×{item.quantity}</span>
                <span className="text-slate-600 font-medium flex-shrink-0">৳{item.subtotal?.toLocaleString()}</span>
              </div>
            ))}
            {(order.order_items || []).length > 2 && (
              <span className="text-slate-400">+{order.order_items.length - 2} more items</span>
            )}
          </div>
        </div>

        {/* Bottom row: amount + payment */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">৳{order.total_amount?.toLocaleString()}</span>
            {discount > 0 && (
              <Badge className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-1.5 py-0 h-4 rounded-full">
                -৳{discount.toLocaleString()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={`${payment.cls} rounded-full px-2 py-0 text-[10px] font-medium`}>{payment.label}</Badge>
            <span className="text-[10px] text-slate-400">{totalItems} qty</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
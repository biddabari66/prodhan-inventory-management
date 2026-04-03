import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  MoreVertical, FileText, Edit, Phone, Truck, CheckCircle, Clock,
  Package, ChevronDown, XCircle, RefreshCw, AlertCircle, DollarSign,
  Send, Download, Receipt, PackageCheck
} from 'lucide-react';
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
  onCancelOrder,
  onSendCourier,
  onUpdateCourierStatus,
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
  const isPre = ['pending', 'on_hold', 'call_not_received', 'follow_up', 'callback_requested'].includes(order.order_status);

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-0">
        {/* Row 1: Checkbox + Order# + Date + Actions menu */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="border-slate-300 flex-shrink-0"
            />
            <span className="font-mono font-bold text-red-600 text-xs truncate">{orderNum}</span>
            <span className="text-[10px] text-slate-400 flex-shrink-0">
              {(() => { const d = new Date(order.order_date || order.created_date); return isNaN(d.getTime()) ? '' : format(d, 'dd MMM'); })()}
            </span>
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem onClick={() => onViewInvoice(order)}>
                <FileText className="w-4 h-4 mr-2 text-blue-600" /> View Invoice
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(order)}>
                  <Edit className="w-4 h-4 mr-2 text-purple-600" /> Edit Order
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                const blob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${order.order_number}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}>
                <Download className="w-4 h-4 mr-2 text-green-600" /> Download
              </DropdownMenuItem>
              {/* Courier actions */}
              {['confirmed', 'processing', 'packed'].includes(order.order_status) && !order.courier_placed && onSendCourier && (
                <DropdownMenuItem onClick={() => onSendCourier(order)}>
                  <Truck className="w-4 h-4 mr-2 text-orange-600" /> Send to Courier
                </DropdownMenuItem>
              )}
              {order.courier_placed && onUpdateCourierStatus && (
                <DropdownMenuItem onClick={() => onUpdateCourierStatus(order)}>
                  <RefreshCw className="w-4 h-4 mr-2 text-blue-600" /> Update Courier Status
                </DropdownMenuItem>
              )}
              {/* Cancel */}
              {order.order_status !== 'cancelled' && order.order_status !== 'delivered' && onCancelOrder && (
                <DropdownMenuItem onClick={() => onCancelOrder(order)} className="text-red-600">
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2: Customer info */}
        <div className="px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-slate-900 truncate">{order.customer_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-500">{order.customer_phone}</span>
              </div>
            </div>
            <span className="font-bold text-slate-900 text-sm flex-shrink-0 ml-2">৳{order.total_amount?.toLocaleString()}</span>
          </div>
        </div>

        {/* Row 3: Items */}
        <div className="px-3 pb-1.5">
          <div className="text-[11px] text-slate-500 space-y-0.5">
            {(order.order_items || []).slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="truncate mr-2">{item.item_name} ×{item.quantity}</span>
                <span className="text-slate-600 font-medium flex-shrink-0">৳{item.subtotal?.toLocaleString()}</span>
              </div>
            ))}
            {(order.order_items || []).length > 2 && (
              <span className="text-slate-400">+{order.order_items.length - 2} more</span>
            )}
          </div>
        </div>

        {/* Row 4: Status + Payment dropdowns + courier badge */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-100 bg-slate-50/30 flex-wrap">
          {/* Order Status Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className={`${status.cls} rounded-full px-2.5 py-0.5 text-[10px] font-medium inline-flex items-center gap-1`}>
                {status.label}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px] max-h-[300px] overflow-y-auto">
              {isPre && (
                <>
                  {order.order_status !== 'on_hold' && (
                    <DropdownMenuItem onClick={() => onStatusChange(order, 'on_hold')}>
                      <Clock className="w-4 h-4 mr-2 text-yellow-600" /> Put On Hold
                    </DropdownMenuItem>
                  )}
                  {order.order_status !== 'call_not_received' && (
                    <DropdownMenuItem onClick={() => onStatusChange(order, 'call_not_received')}>
                      <Phone className="w-4 h-4 mr-2 text-amber-600" /> Call Not Received
                    </DropdownMenuItem>
                  )}
                  {order.order_status !== 'follow_up' && (
                    <DropdownMenuItem onClick={() => onStatusChange(order, 'follow_up')}>
                      <RefreshCw className="w-4 h-4 mr-2 text-indigo-600" /> Follow Up
                    </DropdownMenuItem>
                  )}
                  {order.order_status !== 'callback_requested' && (
                    <DropdownMenuItem onClick={() => onStatusChange(order, 'callback_requested')}>
                      <Phone className="w-4 h-4 mr-2 text-pink-600" /> Callback
                    </DropdownMenuItem>
                  )}
                  {order.order_status !== 'pending' && (
                    <DropdownMenuItem onClick={() => onStatusChange(order, 'pending')}>
                      <AlertCircle className="w-4 h-4 mr-2 text-slate-600" /> Back to Pending
                    </DropdownMenuItem>
                  )}
                  <div className="border-t border-slate-100 my-1" />
                  <DropdownMenuItem onClick={() => onStatusChange(order, 'confirmed')}>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> ✅ Confirm
                  </DropdownMenuItem>
                </>
              )}
              {order.order_status === 'confirmed' && (
                <DropdownMenuItem onClick={() => onStatusChange(order, 'processing')}>
                  <Package className="w-4 h-4 mr-2 text-indigo-600" /> Processing
                </DropdownMenuItem>
              )}
              {(order.order_status === 'processing' || order.order_status === 'packed') && (
                <DropdownMenuItem onClick={() => onStatusChange(order, 'shipped')}>
                  <Truck className="w-4 h-4 mr-2 text-purple-600" /> Shipped
                </DropdownMenuItem>
              )}
              {(order.order_status === 'shipped' || order.order_status === 'out_for_delivery') && (
                <DropdownMenuItem onClick={() => onStatusChange(order, 'delivered')}>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Delivered
                </DropdownMenuItem>
              )}
              {order.order_status !== 'cancelled' && order.order_status !== 'delivered' && onCancelOrder && (
                <DropdownMenuItem onClick={() => onCancelOrder(order)} className="text-red-600">
                  <XCircle className="w-4 h-4 mr-2" /> Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Payment Status Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className={`${payment.cls} rounded-full px-2.5 py-0.5 text-[10px] font-medium inline-flex items-center gap-1`}>
                {payment.label}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onPaymentChange(order, 'pending')}>
                <Clock className="w-4 h-4 mr-2 text-yellow-600" /> Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPaymentChange(order, 'partial')}>
                <DollarSign className="w-4 h-4 mr-2 text-orange-600" /> Partial
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPaymentChange(order, 'paid')}>
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Paid
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-[10px] text-slate-400 ml-auto">{totalItems} qty</span>

          {discount > 0 && (
            <Badge className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-1.5 py-0 h-4 rounded-full">
              -৳{discount.toLocaleString()}
            </Badge>
          )}

          {order.courier_placed && (
            <Badge className="bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0 h-4 rounded-full">
              <PackageCheck className="w-3 h-3 mr-0.5" />
              {order.courier_status || 'Sent'}
            </Badge>
          )}

          {order.adprofit_synced && (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0 h-4 rounded-full">✓ Synced</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
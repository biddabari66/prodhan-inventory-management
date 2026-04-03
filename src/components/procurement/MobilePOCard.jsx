import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Edit, ShieldCheck, ShieldX, CheckCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function MobilePOCard({
  order,
  getStatusBadge,
  onView,
  onEdit,
  onApprove,
  onReject,
  onReceive,
  onDelete,
  canEdit,
  canApprove,
  isAdmin,
  supplierName
}) {
  const isPending = order.approval_status === 'pending' || order.order_status === 'pending_approval';

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-0">
        {/* Header: PO # + Status + Actions */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold text-violet-600 text-sm">{order.po_number}</span>
            {order.purchase_category && (
              <Badge variant="outline" className="text-[10px] px-1.5">{order.purchase_category}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {getStatusBadge(order)}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[170px]">
                <DropdownMenuItem onClick={() => onView(order)}>
                  <Eye className="w-4 h-4 mr-2" /> View Details
                </DropdownMenuItem>
                {canEdit && order.approval_status !== 'approved' && (
                  <DropdownMenuItem onClick={() => onEdit(order)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {isAdmin && isPending && (
                  <>
                    <DropdownMenuItem onClick={() => onApprove(order)} className="text-green-600">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReject(order)} className="text-red-600">
                      <ShieldX className="w-4 h-4 mr-2" /> Reject
                    </DropdownMenuItem>
                  </>
                )}
                {canApprove && order.order_status === 'approved' && (
                  <DropdownMenuItem onClick={() => onReceive(order)} className="text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark Received
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => onDelete(order)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Supplier + date */}
        <div className="px-3 py-2">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-slate-900 truncate">{supplierName}</p>
              {order.created_by_name && (
                <p className="text-[11px] text-slate-400 mt-0.5">by {order.created_by_name}</p>
              )}
            </div>
            <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">
              {format(new Date(order.order_date), 'dd MMM yyyy')}
            </span>
          </div>
        </div>

        {/* Items preview */}
        <div className="px-3 pb-2">
          <div className="text-xs text-slate-500 space-y-0.5">
            {order.order_items?.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="truncate mr-2">{item.item_name} ({item.quantity_ordered} {item.unit || 'pc'})</span>
                <span className="text-slate-600 font-medium flex-shrink-0">৳{item.total_price?.toLocaleString()}</span>
              </div>
            ))}
            {order.order_items?.length > 2 && (
              <span className="text-slate-400">+{order.order_items.length - 2} more</span>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/30">
          <span className="text-xs text-slate-500">{order.order_items?.length || 0} items</span>
          <span className="font-bold text-slate-900 text-sm">৳{order.total_amount?.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
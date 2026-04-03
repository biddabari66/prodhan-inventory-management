import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Eye } from 'lucide-react';

export default function MobileCustomerCard({ customer, onView }) {
  const segment = customer.total_spent >= 50000 ? 'VIP' :
                   customer.total_spent >= 10000 ? 'Regular' :
                   customer.total_orders <= 2 ? 'New' : 'Standard';
  
  const segmentCls = segment === 'VIP' ? 'bg-amber-100 text-amber-800' :
                     segment === 'Regular' ? 'bg-blue-100 text-blue-800' :
                     segment === 'New' ? 'bg-green-100 text-green-800' :
                     'bg-slate-100 text-slate-800';

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-3 px-3 pt-3 pb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {customer.customer_name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-slate-900 truncate">{customer.customer_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500">{customer.customer_phone}</span>
            </div>
            {customer.customer_email && (
              <div className="flex items-center gap-2 mt-0.5">
                <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-500 truncate">{customer.customer_email}</span>
              </div>
            )}
          </div>
          <Badge className={`${segmentCls} text-[10px] px-2 py-0 rounded-full flex-shrink-0`}>{segment}</Badge>
        </div>

        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500">{customer.total_orders || 0} orders</span>
            <span className="font-bold text-green-600">৳{(customer.total_spent || 0).toLocaleString()}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onView(customer)} className="h-7 px-2 text-xs text-blue-600">
            <Eye className="w-3.5 h-3.5 mr-1" /> View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, Search, CheckCircle, XCircle, Clock, 
  Users, Calendar, MapPin, Package, ShoppingBag, CreditCard, Truck, RefreshCw, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function WelcomeCallList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 🚀 FIXED: Fetch ALL confirmed+ orders for welcome calls (all-time history)
  const { data: allOrders = [], isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ['orders-welcome-calls-all'],
    queryFn: async () => {
      // Fetch all orders with valid statuses - no pagination limit for call history
      const orders = await base44.entities.Order.filter(
        { order_status: { $in: ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'] } },
        '-order_date',
        10000
      );
      return orders;
    },
    staleTime: 60000,
    cacheTime: 10 * 60 * 1000
  });

  // Fetch welcome call statuses
  const { data: welcomeStatuses = [], isLoading: statusLoading } = useQuery({
    queryKey: ['welcome-call-statuses'],
    queryFn: () => base44.entities.WelcomeCall.list('-created_date', 5000),
    staleTime: 30000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Create status lookup map for O(1) access
  const statusMap = useMemo(() => {
    const map = new Map();
    welcomeStatuses.forEach(wc => {
      // Key by order_number for exact matching
      if (wc.order_number) {
        map.set(wc.order_number, wc);
      }
    });
    return map;
  }, [welcomeStatuses]);

  // 🚀 OPTIMIZED: Convert orders to call cards with status
  const orderCards = useMemo(() => {
    if (!allOrders.length) return [];
    
    // All orders already filtered by query
    return allOrders.map(order => {
        const existingStatus = statusMap.get(order.order_number);
        return {
          ...order,
          welcome_status: existingStatus?.call_status || 'pending',
          welcome_call_id: existingStatus?.id,
          call_date: existingStatus?.call_date,
          called_by: existingStatus?.called_by,
          notes: existingStatus?.notes
        };
      });
  }, [allOrders, statusMap]);

  // Total for stats
  const totalOrders = orderCards.length;

  // 🚀 FAST FILTERING with useMemo
  const filteredCards = useMemo(() => {
    const searchLower = searchTerm?.toLowerCase() || '';
    
    return orderCards.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.welcome_status !== statusFilter) return false;
      
      // Date filter (by order date)
      if (dateFrom || dateTo) {
        const orderDateStr = order.order_date ? order.order_date.slice(0, 10) : '';
        if (dateFrom && orderDateStr < dateFrom) return false;
        if (dateTo && orderDateStr > dateTo) return false;
      }
      
      // Search filter
      if (searchLower) {
        const matchesSearch = 
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.customer_phone?.includes(searchTerm) ||
          order.order_number?.toLowerCase().includes(searchLower) ||
          order.order_items?.some(i => i.item_name?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [orderCards, searchTerm, statusFilter, dateFrom, dateTo]);

  // Stats calculation
  const stats = useMemo(() => {
    const result = { total: orderCards.length, pending: 0, done: 0, notReceived: 0 };
    for (const card of orderCards) {
      if (card.welcome_status === 'pending') result.pending++;
      else if (card.welcome_status === 'done') result.done++;
      else if (card.welcome_status === 'not_received') result.notReceived++;
    }
    return result;
  }, [orderCards]);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, status }) => {
      const data = {
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        product: order.order_items?.map(i => i.item_name).join(', ') || '',
        call_status: status,
        call_date: new Date().toISOString(),
        called_by: currentUser?.full_name || 'Unknown'
      };
      
      if (order.welcome_call_id) {
        return base44.entities.WelcomeCall.update(order.welcome_call_id, data);
      } else {
        return base44.entities.WelcomeCall.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welcome-call-statuses'] });
      toast.success('Status updated');
    }
  });

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800', icon: Clock },
      done: { label: 'Done', class: 'bg-green-100 text-green-800', icon: CheckCircle },
      not_received: { label: 'Not Received', class: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const { label, class: cls, icon: Icon } = config[status] || config.pending;
    return <Badge className={`${cls} gap-1`}><Icon className="w-3 h-3" />{label}</Badge>;
  };

  const isLoading = ordersLoading || statusLoading;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Total Orders</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Pending Calls</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.done}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Not Received</p>
            <p className="text-2xl font-bold text-red-600">{stats.notReceived}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, phone, order #, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm h-11 min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
              <option value="not_received">Not Received</option>
            </select>
            <Button variant="outline" onClick={() => refetch()} className="h-11 gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
          
          {/* Date Filters */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Order Date From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40 h-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40 h-10"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                Clear Dates
              </Button>
            )}
            <Badge variant="outline" className="ml-auto">
              Showing {filteredCards.length} orders
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-slate-600">Loading orders...</span>
        </div>
      )}

      {/* Order Cards Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(order => (
            <Card key={order.id} className="group hover:shadow-lg transition-all border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="p-0">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{order.customer_name}</h3>
                      <a href={`tel:${order.customer_phone}`} className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline">
                        <Phone className="w-3.5 h-3.5" />{order.customer_phone}
                      </a>
                    </div>
                    {getStatusBadge(order.welcome_status)}
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-4 space-y-3">
                  {/* Order Number & Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-indigo-500" />
                      <span className="font-mono text-sm font-semibold text-indigo-700">{order.order_number}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB') : ''}
                    </span>
                  </div>

                  {/* Products */}
                  {order.order_items?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 uppercase">Products</p>
                        <p className="text-sm text-slate-800 font-medium line-clamp-2">
                          {order.order_items.map(i => `${i.item_name} (×${i.quantity})`).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Amount & Payment */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-green-600" />
                      <span className="font-bold text-green-700">৳{order.total_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{order.payment_method || 'COD'}</Badge>
                      <Badge className={`text-xs ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {order.payment_status || 'Unpaid'}
                      </Badge>
                    </div>
                  </div>

                  {/* Address */}
                  {order.shipping_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {[order.shipping_address.address_line, order.shipping_address.city, order.shipping_address.district].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Order Status */}
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-500" />
                    <Badge variant="outline" className="text-xs capitalize">{order.order_status?.replace(/_/g, ' ')}</Badge>
                    {order.courier_tracking_code && (
                      <span className="text-xs text-slate-500">Track: {order.courier_tracking_code}</span>
                    )}
                  </div>

                  {/* Called By Info */}
                  {order.welcome_status !== 'pending' && order.called_by && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                      Called by {order.called_by} • {order.call_date ? new Date(order.call_date).toLocaleString('en-GB') : ''}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                  {order.welcome_status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700 h-10" 
                        onClick={() => updateStatusMutation.mutate({ order, status: 'done' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />Done
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-10" 
                        onClick={() => updateStatusMutation.mutate({ order, status: 'not_received' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />Not Received
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full text-blue-600 hover:bg-blue-50 h-9"
                      onClick={() => updateStatusMutation.mutate({ order, status: 'pending' })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Reset to Pending
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredCards.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-sm">
              <Users className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 text-lg">No orders found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your date filters</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination for filtered results */}
      {!isLoading && filteredCards.length > pageSize && (
        <Card className="bg-white border-0 shadow-sm mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {currentPage} of {Math.ceil(filteredCards.length / pageSize)} ({filteredCards.length} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= Math.ceil(filteredCards.length / pageSize)}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Phone, Search, Smile, Frown, HelpCircle, Clock,
  Users, Calendar, MapPin, Package, ShoppingBag, CreditCard, Truck, RefreshCw, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { sendFeedbackWebhook } from '@/functions/sendFeedbackWebhook';

export default function FeedbackCallList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, order: null, status: null });
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 🚀 Fetch ONLY delivered orders for feedback calls
  const { data: allOrders = [], isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ['orders-feedback-calls-all'],
    queryFn: async () => {
      const batchSize = 1000;
      let allData = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const batch = await base44.entities.Order.filter(
          { order_status: 'delivered' },
          '-order_date',
          batchSize,
          offset
        );
        allData = [...allData, ...batch];
        offset += batchSize;
        hasMore = batch.length === batchSize;
      }
      return allData;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch feedback call statuses
  const { data: feedbackStatuses = [], isLoading: statusLoading } = useQuery({
    queryKey: ['feedback-call-statuses'],
    queryFn: async () => {
      const batchSize = 1000;
      let allData = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const batch = await base44.entities.FeedbackCall.list('-created_date', batchSize, offset);
        allData = [...allData, ...batch];
        offset += batchSize;
        hasMore = batch.length === batchSize;
      }
      return allData;
    },
    staleTime: 30000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Create status lookup map
  const statusMap = useMemo(() => {
    const map = new Map();
    feedbackStatuses.forEach(fc => {
      if (fc.order_number) {
        map.set(fc.order_number, fc);
      }
    });
    return map;
  }, [feedbackStatuses]);

  // 🚀 OPTIMIZED: Convert shipped + delivered orders to feedback cards
  const orderCards = useMemo(() => {
    if (!allOrders.length) return [];
    
    // All orders already filtered by query
    return allOrders.map(order => {
        const existingStatus = statusMap.get(order.order_number);
        return {
          ...order,
          feedback_status: existingStatus?.feedback_status || 'pending',
          feedback_call_id: existingStatus?.id,
          call_date: existingStatus?.call_date,
          called_by: existingStatus?.called_by,
          feedback_notes: existingStatus?.feedback_notes
        };
      });
  }, [allOrders, statusMap]);

  // 🚀 FAST FILTERING
  const filteredCards = useMemo(() => {
    const searchLower = searchTerm?.toLowerCase() || '';
    
    return orderCards.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.feedback_status !== statusFilter) return false;
      
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

  // Stats - based on FILTERED cards so it respects date filters
  const stats = useMemo(() => {
    const source = (dateFrom || dateTo) ? filteredCards : orderCards;
    const result = { total: source.length, pending: 0, happy: 0, unhappy: 0, others: 0 };
    for (const card of source) {
      if (card.feedback_status === 'pending') result.pending++;
      else if (card.feedback_status === 'happy') result.happy++;
      else if (card.feedback_status === 'unhappy') result.unhappy++;
      else if (card.feedback_status === 'others') result.others++;
    }
    return result;
  }, [orderCards, filteredCards, dateFrom, dateTo]);

  // Send review to external webhook via backend function
  const sendReviewToWebhook = async (order, status, notes) => {
    const products = (order.order_items || []).map(item => ({
      product_name: item.item_name,
      sku: item.inventory_id || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      selected_color: item.selected_color || '',
      weight: item.weight || 0
    }));

    const payload = {
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      feedback_status: status,
      feedback_notes: notes || '',
      review_date: new Date().toISOString(),
      reviewed_by: currentUser?.full_name || 'Unknown',
      total_amount: order.total_amount,
      products,
      shipping_address: order.shipping_address || {}
    };

    try {
      const res = await sendFeedbackWebhook(payload);
      console.log('Webhook response:', res.data);
    } catch (err) {
      console.warn('Webhook send failed:', err);
    }
  };

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ order, status, notes }) => {
      const data = {
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        product: order.order_items?.map(i => i.item_name).join(', ') || '',
        feedback_status: status,
        feedback_notes: notes || '',
        call_date: new Date().toISOString(),
        called_by: currentUser?.full_name || 'Unknown'
      };
      
      // Send to external webhook
      sendReviewToWebhook(order, status, notes);
      
      if (order.feedback_call_id) {
        return base44.entities.FeedbackCall.update(order.feedback_call_id, data);
      } else {
        return base44.entities.FeedbackCall.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-call-statuses'] });
      toast.success('Feedback recorded');
      setFeedbackDialog({ open: false, order: null, status: null });
      setFeedbackNotes('');
    }
  });

  const handleStatusUpdate = (order, status) => {
    if (status === 'unhappy' || status === 'others') {
      setFeedbackDialog({ open: true, order, status });
    } else {
      updateStatusMutation.mutate({ order, status, notes: '' });
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800', icon: Clock },
      happy: { label: 'Happy', class: 'bg-green-100 text-green-800', icon: Smile },
      unhappy: { label: 'Unhappy', class: 'bg-red-100 text-red-800', icon: Frown },
      others: { label: 'Others', class: 'bg-purple-100 text-purple-800', icon: HelpCircle }
    };
    const { label, class: cls, icon: Icon } = config[status] || config.pending;
    return <Badge className={`${cls} gap-1`}><Icon className="w-3 h-3" />{label}</Badge>;
  };

  const isLoading = ordersLoading || statusLoading;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Delivered Orders</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Happy</p>
            <p className="text-2xl font-bold text-green-600">{stats.happy}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Unhappy</p>
            <p className="text-2xl font-bold text-red-600">{stats.unhappy}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase">Others</p>
            <p className="text-2xl font-bold text-purple-600">{stats.others}</p>
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
              <option value="happy">Happy</option>
              <option value="unhappy">Unhappy</option>
              <option value="others">Others</option>
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
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{order.customer_name}</h3>
                      <a href={`tel:${order.customer_phone}`} className="text-sm text-purple-600 font-medium flex items-center gap-1 hover:underline">
                        <Phone className="w-3.5 h-3.5" />{order.customer_phone}
                      </a>
                    </div>
                    {getStatusBadge(order.feedback_status)}
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-4 space-y-3">
                  {/* Order Number & Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-purple-500" />
                      <span className="font-mono text-sm font-semibold text-purple-700">{order.order_number}</span>
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
                      <span className="font-bold text-green-700">৳{(order.total_amount || order.order_items?.reduce((s, i) => s + (i.subtotal || (i.unit_price || 0) * (i.quantity || 1)), 0) || 0).toLocaleString()}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs">Delivered</Badge>
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

                  {/* Feedback Notes if exists */}
                  {order.feedback_status !== 'pending' && order.feedback_notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                      <p className="text-xs text-amber-800"><span className="font-medium">Notes:</span> {order.feedback_notes}</p>
                    </div>
                  )}

                  {/* Called By Info */}
                  {order.feedback_status !== 'pending' && order.called_by && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                      Called by {order.called_by} • {order.call_date ? new Date(order.call_date).toLocaleString('en-GB') : ''}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                  {order.feedback_status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-green-600 hover:bg-green-700 h-10" 
                        onClick={() => handleStatusUpdate(order, 'happy')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Smile className="w-4 h-4 mr-1" />Happy
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-10" 
                        onClick={() => handleStatusUpdate(order, 'unhappy')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Frown className="w-4 h-4 mr-1" />Unhappy
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50 h-10" 
                        onClick={() => handleStatusUpdate(order, 'others')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <HelpCircle className="w-4 h-4 mr-1" />Others
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full text-purple-600 hover:bg-purple-50 h-9"
                      onClick={() => updateStatusMutation.mutate({ order, status: 'pending', notes: '' })}
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
              <p className="text-slate-500 text-lg">No delivered orders found</p>
              <p className="text-slate-400 text-sm mt-1">Feedback calls are for shipped/delivered orders only</p>
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

      {/* Feedback Notes Dialog */}
      <Dialog open={feedbackDialog.open} onOpenChange={(open) => { if (!open) setFeedbackDialog({ open: false, order: null, status: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackDialog.status === 'unhappy' ? 'Record Unhappy Feedback' : 'Record Other Feedback'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Customer: <strong>{feedbackDialog.order?.customer_name}</strong>
              <br />
              Order: <strong>{feedbackDialog.order?.order_number}</strong>
            </p>
            <div>
              <Label>Feedback Notes *</Label>
              <Textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Enter detailed feedback..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setFeedbackDialog({ open: false, order: null, status: null }); setFeedbackNotes(''); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => updateStatusMutation.mutate({ 
                  order: feedbackDialog.order, 
                  status: feedbackDialog.status, 
                  notes: feedbackNotes 
                })}
                disabled={!feedbackNotes.trim() || updateStatusMutation.isPending}
                className={feedbackDialog.status === 'unhappy' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}
              >
                Save Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
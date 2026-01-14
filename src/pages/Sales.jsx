import React, { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Package, TrendingUp, Search, Filter, Eye, Edit, 
  CheckCircle, Clock, XCircle, MoreVertical, ShoppingCart, 
  RefreshCw, Send, Truck, FileText, Download, Trash2, 
  PackageCheck, ChevronRight, Home, Loader2, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Order } from '@/entities/Order';
import { Customer } from '@/entities/Customer';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from '@/components/ui/checkbox';
import { withPermission } from '../components/common/PermissionGuard';
import { getComboCount, getActualQuantity } from '../components/common/ComboProductUtils';

// Lazy load heavy components
const OrderInvoice = lazy(() => import('../components/invoices/OrderInvoice'));
const OrderFormDialog = lazy(() => import('../components/sales/OrderFormDialog'));

// Minimal Loading Skeleton
const TableSkeleton = () => (
  <div className="space-y-3 p-6">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
    ))}
  </div>
);

// Premium Stats Card Component
const StatCard = ({ label, value, trend, trendValue, icon: Icon }) => (
  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
          {trendValue !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{trendValue} today</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-red-600" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Premium Status Badge
const StatusBadge = ({ status }) => {
  const config = {
    pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    confirmed: { label: 'Confirmed', className: 'bg-red-50 text-red-700 border-red-200' },
    processing: { label: 'Processing', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    packed: { label: 'Packed', className: 'bg-purple-50 text-purple-700 border-purple-200' },
    shipped: { label: 'Shipped', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    out_for_delivery: { label: 'Out for Delivery', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    delivered: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-300' },
    returned: { label: 'Returned', className: 'bg-slate-200 text-slate-700 border-slate-300' },
  };
  const { label, className } = config[status] || config.pending;
  return <Badge className={`${className} border font-medium px-3 py-1 rounded-full text-xs`}>{label}</Badge>;
};

// Payment Badge
const PaymentBadge = ({ status }) => {
  const config = {
    pending: { label: 'Unpaid', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    partial: { label: 'Partial', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    refunded: { label: 'Refunded', className: 'bg-red-50 text-red-700 border-red-200' },
  };
  const { label, className } = config[status] || config.pending;
  return <Badge className={`${className} border font-medium px-2.5 py-0.5 rounded-full text-[10px]`}>{label}</Badge>;
};

function SalesPage() {
  const queryClient = useQueryClient();
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(50);

  // 🚀 ULTRA-FAST: Aggressive caching & minimal data fetch
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-fast'],
    queryFn: () => Order.list('-order_date', 2000),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-fast'],
    queryFn: () => Customer.list('-created_date', 1000),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory-fast'],
    queryFn: () => Inventory.list('-updated_date', 1000),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const isAdmin = useMemo(() => 
    ['admin', 'manager', 'super_admin'].includes(currentUser?.job_role?.toLowerCase()), 
    [currentUser]
  );

  // 🚀 OPTIMIZED: Single-pass filtering
  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];
    
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
      if (paymentFilter !== 'all' && o.payment_status !== paymentFilter) return false;
      
      if (dateRange.from) {
        const orderDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' })
          .format(new Date(o.order_date || o.created_date));
        const toDate = dateRange.to || dateRange.from;
        if (orderDate < dateRange.from || orderDate > toDate) return false;
      }
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!o.order_number?.toLowerCase().includes(q) && 
            !o.customer_name?.toLowerCase().includes(q) && 
            !o.customer_phone?.includes(q)) return false;
      }
      
      return true;
    });
  }, [orders, statusFilter, paymentFilter, dateRange, searchQuery]);

  const displayedOrders = useMemo(() => 
    filteredOrders.slice(0, displayLimit), 
    [filteredOrders, displayLimit]
  );

  // 🚀 OPTIMIZED: Memoized stats
  const stats = useMemo(() => {
    const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
    let todayCount = 0, pending = 0, confirmed = 0, shipped = 0, totalQty = 0;
    
    for (const o of filteredOrders) {
      const orderDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' })
        .format(new Date(o.order_date || o.created_date));
      if (orderDate === todayBDT) todayCount++;
      if (o.order_status === 'pending') pending++;
      else if (['confirmed', 'processing', 'packed'].includes(o.order_status)) confirmed++;
      else if (['shipped', 'out_for_delivery'].includes(o.order_status)) shipped++;
      
      for (const item of o.order_items || []) {
        const inv = inventory.find(i => i.id === item.inventory_id);
        totalQty += getActualQuantity(item.quantity || 0, inv, item);
      }
    }
    
    return { total: filteredOrders.length, todayCount, pending, confirmed, shipped, totalQty };
  }, [filteredOrders, inventory]);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }) => Order.update(orderId, { order_status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders-fast']);
      toast.success('Status updated');
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ orderId, status }) => Order.update(orderId, { payment_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders-fast']);
      toast.success('Payment updated');
    },
  });

  const handleBulkAction = async (action) => {
    if (!selectedOrderIds.length) return toast.error('Select orders first');
    
    if (action === 'delete') {
      if (!confirm(`Delete ${selectedOrderIds.length} orders?`)) return;
      await Promise.all(selectedOrderIds.map(id => Order.delete(id)));
    } else {
      await Promise.all(selectedOrderIds.map(id => Order.update(id, { order_status: action })));
    }
    
    queryClient.invalidateQueries(['orders-fast']);
    setSelectedOrderIds([]);
    toast.success(`${selectedOrderIds.length} orders updated`);
  };

  if (ordersLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
          </div>
          <TableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-6 py-5 space-y-5">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Home className="w-4 h-4" />
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900 font-medium">Sales Management</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Sales Orders</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage and track all customer orders</p>
          </div>
          
          <Button 
            onClick={() => { setEditingOrder(null); setIsOrderFormOpen(true); }}
            className="bg-[#E11D48] hover:bg-[#BE123C] text-white shadow-lg shadow-red-200/50 px-6 h-11 font-semibold rounded-xl transition-all hover:shadow-xl hover:shadow-red-300/50"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Sale Order
          </Button>
        </div>

        {/* Stats Cards - Unified White Design */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Orders" value={stats.total} trendValue={stats.todayCount} trend="up" icon={ShoppingCart} />
          <StatCard label="Pending" value={stats.pending} icon={Clock} />
          <StatCard label="Confirmed" value={stats.confirmed} icon={CheckCircle} />
          <StatCard label="Shipped" value={stats.shipped} icon={Truck} />
          <StatCard label="Products Qty" value={stats.totalQty} icon={Package} />
        </div>

        {/* Search & Filters - Glassmorphism */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search orders by ID, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white transition-colors"
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">⌘K</kbd>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-11 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[130px] h-11 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 px-4 rounded-xl border-slate-200">
                    <Filter className="w-4 h-4 mr-2" />
                    Date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="end">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setDateRange({ from: today, to: today });
                      }}>Today</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        const d = new Date(); d.setDate(d.getDate() - 1);
                        const y = d.toISOString().split('T')[0];
                        setDateRange({ from: y, to: y });
                      }}>Yesterday</Button>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">From</label>
                        <Input type="date" value={dateRange.from || ''} onChange={(e) => setDateRange(p => ({...p, from: e.target.value}))} className="h-9" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">To</label>
                        <Input type="date" value={dateRange.to || ''} onChange={(e) => setDateRange(p => ({...p, to: e.target.value}))} className="h-9" />
                      </div>
                    </div>
                    {dateRange.from && (
                      <Button size="sm" variant="ghost" className="w-full text-red-600" onClick={() => setDateRange({})}>
                        Clear Dates
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">{selectedOrderIds.length} orders selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('confirmed')}>Confirm</Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('shipped')}>Ship</Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleBulkAction('delete')}>Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedOrderIds([])}>Clear</Button>
            </div>
          </div>
        )}

        {/* Orders Table - Premium Design */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Orders <span className="text-slate-400 font-normal text-sm ml-2">({filteredOrders.length})</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries(['orders-fast'])} className="text-slate-500">
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="w-12 pl-6">
                    <Checkbox 
                      checked={selectedOrderIds.length === displayedOrders.length && displayedOrders.length > 0}
                      onCheckedChange={() => setSelectedOrderIds(
                        selectedOrderIds.length === displayedOrders.length ? [] : displayedOrders.map(o => o.id)
                      )}
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">Order</TableHead>
                  <TableHead className="font-semibold text-slate-600">Customer</TableHead>
                  <TableHead className="font-semibold text-slate-600">Items</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center">Payment</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-center pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <ShoppingCart className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-500 font-medium">No orders found</p>
                    </TableCell>
                  </TableRow>
                ) : displayedOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                    <TableCell className="pl-6">
                      <Checkbox 
                        checked={selectedOrderIds.includes(order.id)}
                        onCheckedChange={() => setSelectedOrderIds(prev => 
                          prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]
                        )}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{order.order_number}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{format(new Date(order.order_date), 'MMM d, h:mm a')}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-100">
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">
                            {order.customer_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{order.customer_name}</p>
                          <p className="text-xs text-slate-400">{order.customer_phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        {order.order_items?.slice(0, 2).map((item, i) => (
                          <p key={i} className="text-sm text-slate-600 truncate">{item.item_name}</p>
                        ))}
                        {order.order_items?.length > 2 && (
                          <p className="text-xs text-slate-400">+{order.order_items.length - 2} more</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold text-slate-900">৳{order.total_amount?.toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button><PaymentBadge status={order.payment_status} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => updatePaymentMutation.mutate({ orderId: order.id, status: 'pending' })}>Unpaid</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updatePaymentMutation.mutate({ orderId: order.id, status: 'paid' })}>Paid</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button><StatusBadge status={order.order_status} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'confirmed' })}>Confirm</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'shipped' })}>Ship</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'delivered' })}>Delivered</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'cancelled' })} className="text-red-600">Cancel</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedOrder(order); setIsInvoiceOpen(true); }}>
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingOrder(order); setIsOrderFormOpen(true); }}>
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><FileText className="w-4 h-4 mr-2" /> Download Invoice</DropdownMenuItem>
                            <DropdownMenuItem><Send className="w-4 h-4 mr-2" /> Sync Adprofit</DropdownMenuItem>
                            {!order.courier_placed && <DropdownMenuItem><Truck className="w-4 h-4 mr-2" /> Send to Courier</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Load More */}
          {displayedOrders.length < filteredOrders.length && (
            <div className="border-t border-slate-100 p-4 text-center">
              <Button variant="outline" onClick={() => setDisplayLimit(p => p + 50)} className="rounded-xl">
                Load More ({filteredOrders.length - displayedOrders.length} remaining)
              </Button>
            </div>
          )}
        </Card>

        {/* Dialogs */}
        <Suspense fallback={null}>
          {isOrderFormOpen && (
            <OrderFormDialog
              isOpen={isOrderFormOpen}
              onClose={() => { setIsOrderFormOpen(false); setEditingOrder(null); }}
              order={editingOrder}
              customers={customers}
              inventory={inventory}
              currentUser={currentUser}
            />
          )}
          
          <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Order Invoice</DialogTitle>
              </DialogHeader>
              {selectedOrder && <OrderInvoice order={selectedOrder} />}
            </DialogContent>
          </Dialog>
        </Suspense>
      </div>
    </div>
  );
}

export default withPermission(SalesPage, 'sales', 'can_view');
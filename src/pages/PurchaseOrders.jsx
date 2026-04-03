import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Package, ShoppingCart, DollarSign,
  CheckCircle, Clock, Edit, Trash2, Eye,
  FileText, Search, MoreVertical, Box,
  Image, ShieldCheck, ShieldX, User
} from 'lucide-react';
import PackagingExpenseForm from '../components/procurement/PackagingExpenseForm';
import PurchaseOrderForm from '../components/procurement/PurchaseOrderForm';
import PurchaseCategoryFilter from '../components/procurement/PurchaseCategoryFilter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { withPermission, usePermission } from '../components/common/PermissionGuard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import MobilePOCard from '../components/procurement/MobilePOCard';

// Main Purchase Orders Page
function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewOrderDialog, setViewOrderDialog] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Packaging Expense Form state
  const [isPackagingFormOpen, setIsPackagingFormOpen] = useState(false);
  const [editingPackagingExpense, setEditingPackagingExpense] = useState(null);
  const [packagingApprovalDialog, setPackagingApprovalDialog] = useState(null);
  const [packagingRejectionReason, setPackagingRejectionReason] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(null);

  // Permission-based access control
  const { hasPermission: canCreate } = usePermission('purchase_orders', 'can_create');
  const { hasPermission: canEdit } = usePermission('purchase_orders', 'can_edit');
  const { hasPermission: canApprove } = usePermission('purchase_orders', 'can_approve');

  // Fetch data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.job_role === 'admin' || currentUser?.role === 'admin';

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 500),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory-purchase'],
    queryFn: () => base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 1000),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Packaging Expenses
  const { data: packagingExpenses = [] } = useQuery({
    queryKey: ['packagingExpenses'],
    queryFn: () => base44.entities.PackagingExpense.list('-expense_date', 500),
  });

  // Create purchase order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const order = await base44.entities.PurchaseOrder.create(orderData);

      // Create notification for admin
      await base44.entities.Notification.create({
        user_id: 'admin',
        title: '🛒 New Purchase Order Pending Approval',
        message: `PO ${orderData.po_number} worth ৳${orderData.total_amount?.toLocaleString()} from ${orderData.supplier_name} submitted by ${orderData.created_by_name}`,
        category: 'inventory',
        priority: 'high',
        is_actionable: true,
        action_text: 'Review PO',
        action_url: `/PurchaseOrders?highlight=${order.id}`
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Purchase order submitted for approval!');
      setIsFormOpen(false);
      setEditingOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });

  // Update purchase order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedOrder = await base44.entities.PurchaseOrder.update(id, data);
      return updatedOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Purchase order updated!');
      setIsFormOpen(false);
      setEditingOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });

  // Approve order mutation
  const approveOrderMutation = useMutation({
    mutationFn: async (order) => {
      await base44.entities.PurchaseOrder.update(order.id, {
        order_status: 'approved',
        approval_status: 'approved',
        approved_by_id: currentUser?.id,
        approved_by_name: currentUser?.display_name || currentUser?.full_name,
        approval_date: new Date().toISOString()
      });

      // Notify creator
      if (order.created_by_id) {
        await base44.entities.Notification.create({
          user_id: order.created_by_id,
          title: '✅ Purchase Order Approved',
          message: `Your PO ${order.po_number} has been approved by ${currentUser?.full_name}`,
          category: 'inventory',
          priority: 'medium',
          action_text: 'View PO',
          action_url: `/PurchaseOrders?highlight=${order.id}`
        });
      }

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'update',
        entity_type: 'PurchaseOrder',
        entity_id: order.id,
        module: 'purchase_orders',
        description: `Approved PO ${order.po_number} worth ৳${order.total_amount?.toLocaleString()}`,
        new_values: { order_status: 'approved', approval_status: 'approved' },
        timestamp: new Date().toISOString()
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Purchase order approved!');
      setApprovalDialog(null);
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    },
  });

  // Reject order mutation
  const rejectOrderMutation = useMutation({
    mutationFn: async ({ order, reason }) => {
      await base44.entities.PurchaseOrder.update(order.id, {
        order_status: 'rejected',
        approval_status: 'rejected',
        rejection_reason: reason,
        approved_by_id: currentUser?.id,
        approved_by_name: currentUser?.display_name || currentUser?.full_name,
        approval_date: new Date().toISOString()
      });

      // Notify creator
      if (order.created_by_id) {
        await base44.entities.Notification.create({
          user_id: order.created_by_id,
          title: '❌ Purchase Order Rejected',
          message: `Your PO ${order.po_number} has been rejected. Reason: ${reason}`,
          category: 'inventory',
          priority: 'high',
          action_text: 'View Details',
          action_url: `/PurchaseOrders?highlight=${order.id}`
        });
      }

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'update',
        entity_type: 'PurchaseOrder',
        entity_id: order.id,
        module: 'purchase_orders',
        description: `Rejected PO ${order.po_number}. Reason: ${reason}`,
        new_values: { order_status: 'rejected', rejection_reason: reason },
        timestamp: new Date().toISOString()
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Purchase order rejected');
      setApprovalDialog(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error('Failed to reject: ' + error.message);
    },
  });

  // Receive order mutation
  const receiveOrderMutation = useMutation({
    mutationFn: async (order) => {
      // Update order status with receiver info
      await base44.entities.PurchaseOrder.update(order.id, {
        order_status: 'received',
        actual_delivery_date: new Date().toISOString().split('T')[0],
        received_by_id: currentUser?.id,
        received_by_name: currentUser?.display_name || currentUser?.full_name,
        received_date: new Date().toISOString()
      });

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'update',
        entity_type: 'PurchaseOrder',
        entity_id: order.id,
        module: 'purchase_orders',
        description: `Received PO ${order.po_number} from ${order.supplier_name}`,
        new_values: { order_status: 'received', received_by_name: currentUser?.full_name },
        timestamp: new Date().toISOString()
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Order marked as received! Now send to Production House.');
    },
    onError: (error) => {
      toast.error('Failed to receive order: ' + error.message);
    },
  });

  // Create packaging expense mutation
  const createPackagingExpenseMutation = useMutation({
    mutationFn: async (expenseData) => {
      const expense = await base44.entities.PackagingExpense.create(expenseData);

      // Create notification for admin
      await base44.entities.Notification.create({
        user_id: 'admin',
        title: '📦 New Packaging Expense Pending Approval',
        message: `Packaging expense ${expenseData.expense_number} worth ৳${expenseData.total_amount?.toLocaleString()} submitted by ${expenseData.created_by_name}`,
        category: 'inventory',
        priority: 'high',
        is_actionable: true,
        action_text: 'Review Expense',
        action_url: `/PurchaseOrders?tab=packaging`
      });

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['packagingExpenses']);
      toast.success('Packaging expense submitted for approval!');
      setIsPackagingFormOpen(false);
      setEditingPackagingExpense(null);
    },
    onError: (error) => {
      toast.error('Failed to create expense: ' + error.message);
    },
  });

  // Update packaging expense mutation
  const updatePackagingExpenseMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const expense = await base44.entities.PackagingExpense.update(id, data);
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['packagingExpenses']);
      toast.success('Packaging expense updated!');
      setIsPackagingFormOpen(false);
      setEditingPackagingExpense(null);
    },
    onError: (error) => {
      toast.error('Failed to update expense: ' + error.message);
    },
  });

  // Approve packaging expense mutation
  const approvePackagingExpenseMutation = useMutation({
    mutationFn: async (expense) => {
      await base44.entities.PackagingExpense.update(expense.id, {
        status: 'approved',
        approved_by_id: currentUser?.id,
        approved_by_name: currentUser?.display_name || currentUser?.full_name,
        approval_date: new Date().toISOString()
      });

      // Notify creator
      if (expense.created_by_id) {
        await base44.entities.Notification.create({
          user_id: expense.created_by_id,
          title: '✅ Packaging Expense Approved',
          message: `Your packaging expense ${expense.expense_number} has been approved by ${currentUser?.full_name}`,
          category: 'inventory',
          priority: 'medium'
        });
      }

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['packagingExpenses']);
      toast.success('Packaging expense approved!');
      setPackagingApprovalDialog(null);
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    },
  });

  // Reject packaging expense mutation
  const rejectPackagingExpenseMutation = useMutation({
    mutationFn: async ({ expense, reason }) => {
      await base44.entities.PackagingExpense.update(expense.id, {
        status: 'rejected', rejection_reason: reason,
        approved_by_id: currentUser?.id, approved_by_name: currentUser?.display_name || currentUser?.full_name,
        approval_date: new Date().toISOString()
      });
      if (expense.created_by_id) {
        await base44.entities.Notification.create({
          user_id: expense.created_by_id, title: '❌ Packaging Expense Rejected',
          message: `Your packaging expense ${expense.expense_number} has been rejected. Reason: ${reason}`,
          category: 'inventory', priority: 'high'
        });
      }
      return expense;
    },
    onSuccess: () => { queryClient.invalidateQueries(['packagingExpenses']); toast.success('Packaging expense rejected'); setPackagingApprovalDialog(null); setPackagingRejectionReason(''); },
    onError: (error) => toast.error('Failed to reject: ' + error.message),
  });

  // Delete PO mutation (admin only)
  const deleteOrderMutation = useMutation({
    mutationFn: async (order) => {
      await base44.entities.PurchaseOrder.delete(order.id);
      await base44.entities.AuditLog.create({ user_id: currentUser?.id, user_name: currentUser?.full_name, action: 'delete', entity_type: 'PurchaseOrder', entity_id: order.id, module: 'purchase_orders', description: `Deleted PO ${order.po_number}`, timestamp: new Date().toISOString() });
      return order;
    },
    onSuccess: (order) => { queryClient.invalidateQueries(['purchaseOrders']); toast.success(`PO ${order.po_number} deleted`); setDeleteDialog(null); },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  // Delete packaging expense mutation (admin only)
  const deletePackagingMutation = useMutation({
    mutationFn: async (expense) => {
      await base44.entities.PackagingExpense.delete(expense.id);
      await base44.entities.AuditLog.create({ user_id: currentUser?.id, user_name: currentUser?.full_name, action: 'delete', entity_type: 'PackagingExpense', entity_id: expense.id, module: 'purchase_orders', description: `Deleted expense ${expense.expense_number}`, timestamp: new Date().toISOString() });
      return expense;
    },
    onSuccess: (expense) => { queryClient.invalidateQueries(['packagingExpenses']); toast.success(`Expense ${expense.expense_number} deleted`); setDeleteDialog(null); },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const handlePackagingExpenseSubmit = (expenseData) => {
    if (editingPackagingExpense) {
      updatePackagingExpenseMutation.mutate({ id: editingPackagingExpense.id, data: expenseData });
    } else {
      createPackagingExpenseMutation.mutate(expenseData);
    }
  };

  const handleOrderSubmit = (orderData) => {
    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data: orderData });
    } else {
      createOrderMutation.mutate(orderData);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleReceive = (order) => {
    if (confirm('Mark this order as received? You can then send it to Production House.')) {
      receiveOrderMutation.mutate(order);
    }
  };

  const supplierMap = useMemo(() => {
    const map = {};
    suppliers.forEach(s => { map[s.id] = s; });
    return map;
  }, [suppliers]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = [...purchaseOrders];

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_approval') {
        filtered = filtered.filter(o => o.approval_status === 'pending' || o.order_status === 'pending_approval');
      } else {
        filtered = filtered.filter(o => o.order_status === statusFilter);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => {
        const currentSupplier = supplierMap[o.supplier_id];
        const supplierName = currentSupplier?.supplier_name || o.supplier_name;
        return o.po_number?.toLowerCase().includes(query) ||
               supplierName?.toLowerCase().includes(query) ||
               o.created_by_name?.toLowerCase().includes(query);
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(o => o.purchase_category === categoryFilter);
    }

    if (startDate) {
      filtered = filtered.filter(o => o.order_date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(o => o.order_date <= endDate);
    }

    return filtered;
  }, [purchaseOrders, statusFilter, searchQuery, startDate, endDate, supplierMap, categoryFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      totalOrders: filteredOrders.length,
      totalValue: filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      pendingApproval: purchaseOrders.filter(o => o.approval_status === 'pending' || o.order_status === 'pending_approval').length,
      receivedOrders: filteredOrders.filter(o => o.order_status === 'received').length,
      // Packaging stats
      totalPackagingExpenses: packagingExpenses.length,
      totalPackagingValue: packagingExpenses.reduce((sum, e) => sum + (e.total_amount || 0), 0),
      pendingPackagingApproval: packagingExpenses.filter(e => e.status === 'pending_approval').length
    };
  }, [filteredOrders, purchaseOrders, packagingExpenses]);

  const getPackagingStatusBadge = (status) => {
    const c = { pending_approval: { l: 'Pending Approval', c: 'bg-amber-100 text-amber-800' }, approved: { l: 'Approved', c: 'bg-green-100 text-green-800' }, rejected: { l: 'Rejected', c: 'bg-red-100 text-red-800' } };
    const { l, c: cn } = c[status] || c.pending_approval;
    return <Badge className={cn}>{l}</Badge>;
  };

  const getStatusBadge = (order) => {
    if (order.approval_status === 'rejected' || order.order_status === 'rejected') {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    }
    if (order.approval_status === 'pending' || order.order_status === 'pending_approval') {
      return <Badge className="bg-amber-100 text-amber-800">Pending Approval</Badge>;
    }
    const config = {
      draft: { label: 'Draft', class: 'bg-gray-100 text-gray-800' },
      approved: { label: 'Approved', class: 'bg-blue-100 text-blue-800' },
      confirmed: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'Shipped', class: 'bg-purple-100 text-purple-800' },
      received: { label: 'Received', class: 'bg-green-100 text-green-800' },
      in_production: { label: 'In Production', class: 'bg-indigo-100 text-indigo-800' },
      completed: { label: 'Completed', class: 'bg-emerald-100 text-emerald-800' },
      cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800' },
    };
    const { label, class: className } = config[order.order_status] || config.draft;
    return <Badge className={className}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 animate-pulse mx-auto text-violet-600" />
          <p className="text-muted-foreground mt-2">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-foreground font-medium">Purchase Orders</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground tracking-tight">Purchase Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">Create orders with invoice upload & admin approval</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {canCreate && (
              <Button
                onClick={() => { setEditingPackagingExpense(null); setIsPackagingFormOpen(true); }}
                variant="outline"
                className="border-amber-500 text-amber-700 hover:bg-amber-50 h-9 sm:h-10 px-2.5 sm:px-4 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <Box className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Packaging Expense</span>
                <span className="sm:hidden">Packaging</span>
              </Button>
            )}
            {canCreate && (
              <Button
                onClick={() => { setEditingOrder(null); setIsFormOpen(true); }}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-9 sm:h-10 px-3 sm:px-4 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Create PO</span>
                <span className="sm:hidden">New PO</span>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="bg-card border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5 text-[#D32F2F]" />
              </div>
              <p className="text-3xl font-bold text-[#111827]">{stats.totalOrders}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Total Orders</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5 text-[#D32F2F]" />
              </div>
              <p className="text-3xl font-bold text-[#111827]">৳{stats.totalValue.toLocaleString()}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Total Value</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm rounded-xl border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingApproval}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Pending Approval</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.receivedOrders}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Received</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm rounded-xl border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                <Box className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-600">৳{stats.totalPackagingValue.toLocaleString()}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Packaging ({stats.pendingPackagingApproval} pending)</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter */}
        <PurchaseCategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} />

        {/* Filters */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search PO, supplier, or creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">⏳ Pending Approval</SelectItem>
                  <SelectItem value="approved">✅ Approved</SelectItem>
                  <SelectItem value="received">📦 Received</SelectItem>
                  <SelectItem value="in_production">🏭 In Production</SelectItem>
                  <SelectItem value="completed">✔️ Completed</SelectItem>
                  <SelectItem value="rejected">❌ Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for PO and Packaging */}
        <Tabs defaultValue="purchase_orders" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="purchase_orders" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Purchase Orders ({filteredOrders.length})
            </TabsTrigger>
            <TabsTrigger value="packaging" className="gap-2">
              <Box className="w-4 h-4" />
              Packaging Expenses ({packagingExpenses.length})
              {stats.pendingPackagingApproval > 0 && (
                <Badge className="ml-1 bg-amber-500 text-white text-xs">{stats.pendingPackagingApproval}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchase_orders">
            {/* Mobile PO Cards */}
            <div className="md:hidden space-y-3">
              {filteredOrders.length === 0 ? (
                <Card className="bg-white border-0 shadow-sm rounded-xl">
                  <CardContent className="py-12 text-center">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">No purchase orders found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders.map((order) => (
                  <MobilePOCard
                    key={order.id}
                    order={order}
                    getStatusBadge={getStatusBadge}
                    onView={setViewOrderDialog}
                    onEdit={handleEdit}
                    onApprove={(o) => setApprovalDialog({ order: o, action: 'approve' })}
                    onReject={(o) => setApprovalDialog({ order: o, action: 'reject' })}
                    onReceive={handleReceive}
                    onDelete={(o) => setDeleteDialog({ type: 'po', item: o })}
                    canEdit={canEdit}
                    canApprove={canApprove}
                    isAdmin={isAdmin}
                    supplierName={supplierMap[order.supplier_id]?.supplier_name || order.supplier_name}
                  />
                ))
              )}
            </div>

            {/* Desktop Orders Table */}
            <Card className="bg-white border border-slate-200 shadow-sm hidden md:block">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xl font-semibold text-slate-900">Purchase Orders ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No purchase orders found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono font-semibold text-violet-600">
                          {order.po_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.order_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.purchase_category && <Badge variant="outline" className="text-xs">{order.purchase_category}</Badge>}
                            {order.purchase_type && order.purchase_type !== 'product' && (
                              <Badge className="text-[10px] bg-purple-100 text-purple-700 block w-fit">{order.purchase_type.replace('_', ' ')}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">
                            {supplierMap[order.supplier_id]?.supplier_name || order.supplier_name}
                          </p>
                          <p className="text-xs text-slate-400">{order.created_by_name || ''}</p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 max-w-xs">
                            {order.order_items?.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">{item.item_name}</span>
                                <span className="text-slate-500 ml-1">({item.quantity_ordered} {item.unit || 'pc'})</span>
                              </div>
                            ))}
                            {order.order_items?.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{order.order_items.length - 2} more</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ৳{order.total_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(order)}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewOrderDialog(order)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {canEdit && order.approval_status !== 'approved' && (
                                <DropdownMenuItem onClick={() => handleEdit(order)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (order.approval_status === 'pending' || order.order_status === 'pending_approval') && (
                                <>
                                  <DropdownMenuItem onClick={() => setApprovalDialog({ order, action: 'approve' })} className="text-green-600">
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setApprovalDialog({ order, action: 'reject' })} className="text-red-600">
                                    <ShieldX className="w-4 h-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canApprove && order.order_status === 'approved' && (
                                <DropdownMenuItem onClick={() => handleReceive(order)} className="text-green-600">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Received
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem onClick={() => setDeleteDialog({ type: 'po', item: order })} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Packaging Expenses Tab */}
          <TabsContent value="packaging">
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Box className="w-5 h-5 text-amber-600" />
                  Packaging Expenses ({packagingExpenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packagingExpenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            <Box className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No packaging expenses found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        packagingExpenses.map((expense) => (
                          <TableRow key={expense.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono font-semibold text-amber-600">
                              {expense.expense_number}
                            </TableCell>
                            <TableCell>
                              {format(new Date(expense.expense_date), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {expense.items?.slice(0, 3).map((item, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {item.product_name?.slice(0, 20)}...
                                  </Badge>
                                ))}
                                {expense.items?.length > 3 && (
                                  <Badge variant="outline" className="text-xs">+{expense.items.length - 3} more</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-sm">{expense.created_by_name || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ৳{expense.total_amount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {expense.invoice_images?.length > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(expense.invoice_images[0], '_blank')}
                                  className="text-blue-600"
                                >
                                  <Image className="w-4 h-4 mr-1" />
                                  {expense.invoice_images.length > 1 ? `${expense.invoice_images.length} imgs` : 'View'}
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">No invoice</span>
                              )}
                            </TableCell>
                            <TableCell>{getPackagingStatusBadge(expense.status)}</TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingPackagingExpense(expense);
                                    setIsPackagingFormOpen(true);
                                  }}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View / Edit
                                  </DropdownMenuItem>
                                  {isAdmin && expense.status === 'pending_approval' && (
                                    <>
                                      <DropdownMenuItem onClick={() => setPackagingApprovalDialog({ expense, action: 'approve' })} className="text-green-600">
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setPackagingApprovalDialog({ expense, action: 'reject' })} className="text-red-600">
                                        <ShieldX className="w-4 h-4 mr-2" />
                                        Reject
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {isAdmin && (
                                    <DropdownMenuItem onClick={() => setDeleteDialog({ type: 'packaging', item: expense })} className="text-red-600">
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Purchase Order Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Package className="w-6 h-6" />
                {editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <PurchaseOrderForm
                order={editingOrder}
                suppliers={suppliers}
                inventory={inventory}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onSubmit={handleOrderSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingOrder(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* View Order Dialog */}
        <Dialog open={!!viewOrderDialog} onOpenChange={() => setViewOrderDialog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                PO Details: {viewOrderDialog?.po_number}
              </DialogTitle>
            </DialogHeader>
            {viewOrderDialog && (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Supplier</p>
                    <p className="font-semibold">{viewOrderDialog.supplier_name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Order Date</p>
                    <p className="font-semibold">{format(new Date(viewOrderDialog.order_date), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Total Amount</p>
                    <p className="font-bold text-violet-600">৳{viewOrderDialog.total_amount?.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600">Created By</p>
                    <p className="font-semibold">{viewOrderDialog.created_by_name || 'N/A'}</p>
                  </div>
                  {viewOrderDialog.received_by_name && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600">Received By</p>
                      <p className="font-semibold">{viewOrderDialog.received_by_name}</p>
                    </div>
                  )}
                  {viewOrderDialog.approved_by_name && (
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-emerald-600">Approved By</p>
                      <p className="font-semibold">{viewOrderDialog.approved_by_name}</p>
                    </div>
                  )}
                </div>

                {/* Invoice Images */}
                {(viewOrderDialog.invoice_images?.length > 0 || viewOrderDialog.invoice_image_url) && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Image className="w-4 h-4" /> Invoice Images ({viewOrderDialog.invoice_images?.length || 1})
                      {viewOrderDialog.invoice_number && <span className="text-slate-500">#{viewOrderDialog.invoice_number}</span>}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {(viewOrderDialog.invoice_images?.length > 0 ? viewOrderDialog.invoice_images : [viewOrderDialog.invoice_image_url]).map((url, idx) => (
                        <div key={idx} className="relative">
                          <img 
                            src={url} 
                            alt={`Invoice ${idx + 1}`} 
                            className="h-48 w-auto rounded border cursor-pointer hover:opacity-90 object-contain"
                            onClick={() => window.open(url, '_blank')}
                          />
                          <Badge className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px]">
                            #{idx + 1}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection reason */}
                {viewOrderDialog.rejection_reason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-700 mb-1">❌ Rejection Reason:</p>
                    <p className="text-red-600">{viewOrderDialog.rejection_reason}</p>
                  </div>
                )}

                {/* Items Table */}
                <div>
                  <h4 className="font-semibold mb-2">Order Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-center">Unit</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewOrderDialog.order_items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{(item.unit || 'pc').toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="text-right">৳{item.unit_price?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">৳{item.total_price?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Custom Expenses */}
                {viewOrderDialog.custom_expenses?.length > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-semibold text-purple-800 mb-2">Production Expenses ({viewOrderDialog.purchase_category})</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {viewOrderDialog.custom_expenses.map((exp, idx) => (
                        <div key={idx} className="flex justify-between p-2 bg-white rounded">
                          <span className="text-sm text-slate-600">{exp.field_name}</span>
                          <span className="text-sm font-semibold">৳{exp.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-purple-200 flex justify-between">
                      <span className="text-sm font-semibold text-purple-800">Total Production Cost</span>
                      <span className="font-bold text-purple-700">৳{viewOrderDialog.custom_expenses_total?.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {viewOrderDialog.notes && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm">{viewOrderDialog.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <AlertDialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {approvalDialog?.action === 'approve' ? '✅ Approve Purchase Order' : '❌ Reject Purchase Order'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {approvalDialog?.action === 'approve' ? (
                  <>
                    Are you sure you want to approve <strong>{approvalDialog?.order?.po_number}</strong> worth ৳{approvalDialog?.order?.total_amount?.toLocaleString()}?
                  </>
                ) : (
                  <div className="space-y-3">
                    <p>Please provide a reason for rejecting <strong>{approvalDialog?.order?.po_number}</strong>:</p>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter rejection reason..."
                      rows={3}
                    />
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancel</AlertDialogCancel>
              {approvalDialog?.action === 'approve' ? (
                <AlertDialogAction 
                  onClick={() => approveOrderMutation.mutate(approvalDialog.order)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </AlertDialogAction>
              ) : (
                <AlertDialogAction 
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      toast.error('Please provide a rejection reason');
                      return;
                    }
                    rejectOrderMutation.mutate({ order: approvalDialog.order, reason: rejectionReason });
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reject
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Packaging Expense Form Dialog */}
        <Dialog open={isPackagingFormOpen} onOpenChange={setIsPackagingFormOpen}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Box className="w-6 h-6 text-amber-600" />
                {editingPackagingExpense ? 'Edit Packaging Expense' : 'Create Packaging Expense'}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <PackagingExpenseForm
                expense={editingPackagingExpense}
                inventory={inventory}
                currentUser={currentUser}
                onSubmit={handlePackagingExpenseSubmit}
                onCancel={() => {
                  setIsPackagingFormOpen(false);
                  setEditingPackagingExpense(null);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>🗑️ Delete {deleteDialog?.type === 'po' ? 'Purchase Order' : 'Packaging Expense'}</AlertDialogTitle>
              <AlertDialogDescription>
                Permanently delete <strong>{deleteDialog?.type === 'po' ? deleteDialog?.item?.po_number : deleteDialog?.item?.expense_number}</strong>? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
                if (deleteDialog?.type === 'po') deleteOrderMutation.mutate(deleteDialog.item);
                else deletePackagingMutation.mutate(deleteDialog.item);
              }}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Packaging Approval Dialog */}
        <AlertDialog open={!!packagingApprovalDialog} onOpenChange={() => setPackagingApprovalDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {packagingApprovalDialog?.action === 'approve' ? '✅ Approve Packaging Expense' : '❌ Reject Packaging Expense'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {packagingApprovalDialog?.action === 'approve' ? (
                  <>
                    Are you sure you want to approve <strong>{packagingApprovalDialog?.expense?.expense_number}</strong> worth ৳{packagingApprovalDialog?.expense?.total_amount?.toLocaleString()}?
                  </>
                ) : (
                  <div className="space-y-3">
                    <p>Please provide a reason for rejecting <strong>{packagingApprovalDialog?.expense?.expense_number}</strong>:</p>
                    <Textarea
                      value={packagingRejectionReason}
                      onChange={(e) => setPackagingRejectionReason(e.target.value)}
                      placeholder="Enter rejection reason..."
                      rows={3}
                    />
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPackagingRejectionReason('')}>Cancel</AlertDialogCancel>
              {packagingApprovalDialog?.action === 'approve' ? (
                <AlertDialogAction 
                  onClick={() => approvePackagingExpenseMutation.mutate(packagingApprovalDialog.expense)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </AlertDialogAction>
              ) : (
                <AlertDialogAction 
                  onClick={() => {
                    if (!packagingRejectionReason.trim()) {
                      toast.error('Please provide a rejection reason');
                      return;
                    }
                    rejectPackagingExpenseMutation.mutate({ expense: packagingApprovalDialog.expense, reason: packagingRejectionReason });
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reject
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default withPermission(PurchaseOrdersPage, 'purchase_orders', 'can_view');
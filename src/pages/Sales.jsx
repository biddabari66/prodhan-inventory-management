import React, { useState, useEffect, useCallback, useMemo, Component } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Package, Users, TrendingUp, DollarSign, Truck, Search,
  Filter, Download, Eye, Edit, Phone, Mail, MapPin, Calendar,
  CreditCard, CheckCircle, Clock, AlertCircle, XCircle, MoreVertical,
  ShoppingCart, RefreshCw, Send, Printer, FileText, ArrowUpDown, Upload, FileSpreadsheet, Loader2, Shield, Trash2, PackageCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Order } from '@/entities/Order';
import { Customer } from '@/entities/Customer';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import BulkOrderCSVUpload from '../components/sales/BulkOrderCSVUpload';
import OrderForm from '../components/sales/OrderForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CardSkeleton, TableSkeleton } from '../components/common/SkeletonLoader';
import OrderInvoice from '../components/invoices/OrderInvoice';
import ThermalReceipt from '../components/invoices/ThermalReceipt';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Receipt } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import SearchableProductSelect from '../components/common/SearchableProductSelect';
import { ChevronDown } from 'lucide-react';
import SearchableCustomerSelect from '../components/common/SearchableCustomerSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { withPermission } from '../components/common/PermissionGuard';
import { useCachedQuery } from '../components/common/CachedQuery';
import { getComboCount, getActualQuantity } from '../components/common/ComboProductUtils';

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('SalesPage ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
          <Card className="max-w-md w-full shadow-lg rounded-2xl border-0">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-[#D32F2F]" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
              <p className="text-sm text-slate-500">
                {this.state.error?.message || 'An unexpected error occurred in Sales.'}
              </p>
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-xl px-6"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Bulk Upload Dialog — isolated so a crash never kills the parent ──────────
function BulkUploadDialog({ open, onOpenChange, inventory, customers, onComplete }) {
  const [key, setKey] = useState(0); // remount on re-open to reset internal state

  const handleOpenChange = (val) => {
    if (val) setKey(k => k + 1); // fresh mount every time dialog opens
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Bulk Order Import (CSV)
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-y-auto max-h-[80vh]">
          <ErrorBoundary key={`bulk-eb-${key}`}>
            <BulkOrderCSVUpload
              key={key}
              inventory={inventory}
              customers={customers}
              onComplete={() => {
                onComplete();
                onOpenChange(false);
              }}
            />
          </ErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Sales Page ──────────────────────────────────────────────────────────
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
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
  const [productFilter, setProductFilter] = useState('all');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeCustomerDetails: true,
    includeProductDetails: true,
    includeShippingAddress: true,
    includePaymentInfo: true,
    onlyFiltered: true
  });
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // 🚀 LIGHTNING FAST: Cached current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // 🚀 LIGHTNING FAST: Orders with pagination for ALL orders + fast initial load
  const [allOrdersLoaded, setAllOrdersLoaded] = useState(false);

  // First load: Get recent 500 orders fast
  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-sales-recent'],
    queryFn: () => Order.list('-order_date', 500),
    staleTime: 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    refetchInterval: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Background load: Get ALL orders (runs after initial render)
  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders-sales-all'],
    queryFn: async () => {
      const batchSize = 1000;
      let allData = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batch = await Order.list('-order_date', batchSize, offset);
        allData = [...allData, ...batch];
        offset += batchSize;
        hasMore = batch.length === batchSize;
      }

      setAllOrdersLoaded(true);
      return allData;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: recentOrders.length > 0,
  });

  // Use all orders if loaded, otherwise use recent
  const orders = allOrdersLoaded && allOrders.length > 0 ? allOrders : recentOrders;

  // 🚀 LIGHTNING FAST: Real-time subscription with debounce
  useEffect(() => {
    let timeoutId = null;
    const unsubscribe = Order.subscribe(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['orders-sales'] });
      }, 500);
    });
    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [queryClient]);

  // 🚀 LIGHTNING FAST: Customers with very long cache
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-sales'],
    queryFn: () => Customer.list('-created_date', 500),
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // 🚀 LIGHTNING FAST: Inventory with very long cache
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory-sales'],
    queryFn: () => Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 500),
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const canViewAllDepartments = useMemo(() => {
    return ['super_admin', 'admin'].includes(currentUser?.job_role?.toLowerCase());
  }, [currentUser]);

  const userDepartment = useMemo(() => {
    if (!currentUser) return 'all';
    if (canViewAllDepartments) return 'all';
    return currentUser?.department || 'all';
  }, [currentUser, canViewAllDepartments]);

  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    if (currentUser && !canViewAllDepartments && departmentFilter !== userDepartment) {
      setDepartmentFilter(userDepartment);
    }
  }, [currentUser, canViewAllDepartments, userDepartment, departmentFilter]);

  // 🚀 LIGHTNING FAST: Permissions with long cache
  const { data: rawUserPermissions = [] } = useQuery({
    queryKey: ['user-permissions', currentUser?.id],
    queryFn: () => base44.entities.UserPermission.filter({ user_id: currentUser.id }),
    enabled: !!currentUser?.id,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const userPermissions = useMemo(() => {
    const permMap = {};
    rawUserPermissions.forEach(p => {
      permMap[p.module] = {
        can_view: p.can_view || false,
        can_create: p.can_create || false,
        can_edit: p.can_edit || false,
        can_delete: p.can_delete || false,
        can_approve: p.can_approve || false,
        can_export: p.can_export || false
      };
    });
    return permMap;
  }, [rawUserPermissions]);

  const hasPermission = useCallback((module, action) => {
    if (['admin', 'super_admin'].includes(currentUser?.job_role?.toLowerCase())) return true;
    return userPermissions[module]?.[action] === true;
  }, [currentUser?.job_role, userPermissions]);

  const canEdit = hasPermission('sales', 'can_edit');
  const canDelete = hasPermission('sales', 'can_delete');
  const canCreate = hasPermission('sales', 'can_create');
  const canApprove = hasPermission('sales', 'can_approve');
  const canExport = hasPermission('sales', 'can_export');

  const isAdmin = useMemo(() => {
    return ['admin', 'manager', 'super_admin'].includes(currentUser?.job_role?.toLowerCase());
  }, [currentUser]);

  // Create order mutation - NO inventory deduction on create
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      let customerId = orderData.customer_id;

      if (!customerId) {
        const existingByPhone = customers.find(c => c.customer_phone === orderData.customer_phone);
        const existingByEmail = orderData.customer_email
          ? customers.find(c => c.customer_email === orderData.customer_email)
          : null;

        const existingCustomer = existingByPhone || existingByEmail;

        if (existingCustomer) {
          customerId = existingCustomer.id;
          await Customer.update(customerId, {
            total_orders: (existingCustomer.total_orders || 0) + 1,
            total_spent: (existingCustomer.total_spent || 0) + orderData.total_amount
          });
          toast.info(`Using existing customer: ${existingCustomer.customer_name}`);
        } else {
          const newCustomer = await Customer.create({
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_email: orderData.customer_email,
            customer_type: 'retail',
            shipping_addresses: [orderData.shipping_address],
            total_orders: 1,
            total_spent: orderData.total_amount,
            customer_since: new Date().toISOString()
          });
          customerId = newCustomer.id;
        }
      }

      const order = await Order.create({
        ...orderData,
        customer_id: customerId
      });

      // NO inventory deduction here - only when shipped

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['customers']);
      toast.success('Sale order created successfully! Inventory will be deducted when shipped.');
      setIsOrderFormOpen(false);
      setEditingOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedOrder = await Order.update(id, data);
      return updatedOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      toast.success('Order updated successfully!');
      setIsOrderFormOpen(false);
      setEditingOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });

  // Update order status - inventory deduction is handled automatically by backend automation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      return await Order.update(orderId, { order_status: newStatus });
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries(['orders']);
      if (newStatus === 'shipped') {
        // Backend automation deducts inventory; refresh after short delays to catch the update
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-sales'] });
        }, 2000);
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-sales'] });
        }, 5000);
        toast.success('Order shipped! Inventory will be deducted automatically.');
      } else {
        toast.success('Order status updated!');
      }
    },
    onError: (error) => {
      toast.error('Failed to update order status: ' + error.message);
    },
  });

  const handleQuickStatusChange = (order, newStatus) => {
    updateOrderStatusMutation.mutate({ orderId: order.id, newStatus });
  };

  // Payment status update mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ orderId, newPaymentStatus }) => {
      return await Order.update(orderId, { payment_status: newPaymentStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      toast.success('Payment status updated!');
    },
    onError: (error) => {
      toast.error('Failed to update payment status: ' + error.message);
    },
  });

  const handlePaymentStatusChange = (order, newPaymentStatus) => {
    updatePaymentStatusMutation.mutate({ orderId: order.id, newPaymentStatus });
  };

  const handleBulkAction = async (action) => {
    if (selectedOrderIds.length === 0) {
      toast.error('Please select orders first');
      return;
    }

    if (action === 'delete') {
      if (!confirm(`Delete ${selectedOrderIds.length} order(s)? This cannot be undone.`)) {
        return;
      }

      try {
        await Promise.all(selectedOrderIds.map(id => Order.delete(id)));
        queryClient.invalidateQueries(['orders']);
        toast.success(`${selectedOrderIds.length} order(s) deleted successfully`);
        setSelectedOrderIds([]);
      } catch (error) {
        toast.error('Failed to delete orders: ' + error.message);
      }
    } else {
      try {
        // Process sequentially to avoid race conditions, especially for 'shipped' status
        for (const id of selectedOrderIds) {
          await Order.update(id, { order_status: action });
        }
        queryClient.invalidateQueries(['orders']);
        if (action === 'shipped') {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-sales'] });
          }, 3000);
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-sales'] });
          }, 6000);
          toast.success(`${selectedOrderIds.length} order(s) shipped! Inventory will be deducted automatically.`);
        } else {
          toast.success(`${selectedOrderIds.length} order(s) updated to ${action}`);
        }
        setSelectedOrderIds([]);
      } catch (error) {
        toast.error('Failed to update orders: ' + error.message);
      }
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleOrderSubmit = (orderData) => {
    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data: orderData });
    } else {
      createOrderMutation.mutate(orderData);
    }
  };

  const handleEditOrder = (order) => {
    try {
      if (!order || !order.id) {
        toast.error('Invalid order data');
        return;
      }

      const validatedOrder = {
        ...order,
        order_items: Array.isArray(order.order_items) ? order.order_items : [],
        shipping_address: order.shipping_address || {
          address_line: '',
          city: '',
          district: '',
          postal_code: '',
          phone: ''
        },
        department: order.department || 'prodhan_com_e_commerce',
        discount_amount: order.discount_amount || 0,
        coupon_discount: order.coupon_discount || 0,
        shipping_cost: order.shipping_cost || 60
      };

      setEditingOrder(validatedOrder);
      setIsOrderFormOpen(true);
    } catch (error) {
      console.error('Error opening order for edit:', error);
      toast.error('Failed to load order for editing: ' + error.message);
    }
  };

  const handleViewInvoice = (order) => {
    setSelectedOrder(order);
    setIsInvoiceOpen(true);
  };

  const handleDepartmentFilterChange = (value) => {
    if (!canViewAllDepartments) {
      if (value !== userDepartment) {
        toast.error('You can only view orders from your assigned department.');
        return;
      }
    }
    setDepartmentFilter(value);
  };

  // 🚀 LIGHTNING FAST: Optimized filtering with virtual pagination
  const [displayLimit, setDisplayLimit] = useState(50);

  // 🚀 Pre-compute date strings for ALL orders ONCE
  const ordersWithDateStr = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    return orders.map(o => ({
      ...o,
      _dateStr: new Date(o.order_date || o.created_date).toISOString().slice(0, 10)
    }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!ordersWithDateStr || ordersWithDateStr.length === 0) return [];

    let filtered = ordersWithDateStr;

    if (!canViewAllDepartments) {
      filtered = filtered.filter(o => o.department === userDepartment);
    } else if (departmentFilter !== 'all') {
      filtered = filtered.filter(o => o.department === departmentFilter);
    }

    if (dateRange.from) {
      const fromDateStr = dateRange.from;
      const toDateStr = dateRange.to || dateRange.from;
      filtered = filtered.filter(o => o._dateStr >= fromDateStr && o._dateStr <= toDateStr);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(o => o.payment_status === paymentFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_number?.toLowerCase().includes(query) ||
        o.customer_name?.toLowerCase().includes(query) ||
        o.customer_phone?.includes(query)
      );
    }

    if (productFilter !== 'all') {
      filtered = filtered.filter(o =>
        o.order_items?.some(item => item.inventory_id === productFilter)
      );
    }

    return filtered;
  }, [ordersWithDateStr, departmentFilter, searchQuery, statusFilter, paymentFilter, dateRange, canViewAllDepartments, userDepartment, productFilter]);

  // 🚀 Display only limited rows for smooth scrolling
  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, displayLimit);
  }, [filteredOrders, displayLimit]);

  const loadMoreOrders = useCallback(() => {
    setDisplayLimit(prev => Math.min(prev + 100, filteredOrders.length));
  }, [filteredOrders.length]);

  // Fast Excel Export Function
  const handleExportExcel = useCallback(() => {
    const ordersToExport = exportOptions.onlyFiltered ? filteredOrders : orders;

    if (ordersToExport.length === 0) {
      toast.error('No orders to export');
      return;
    }

    toast.loading('Generating Excel...', { id: 'export' });

    setTimeout(() => {
      try {
        const headers = ['Order #', 'Date', 'Status', 'Payment Status'];

        if (exportOptions.includeCustomerDetails) {
          headers.push('Customer Name', 'Customer Phone', 'Customer Email');
        }

        if (exportOptions.includeShippingAddress) {
          headers.push('Address', 'City', 'District', 'Postal Code');
        }

        if (exportOptions.includeProductDetails) {
          headers.push('Products', 'Total Items', 'Subtotal');
        }

        if (exportOptions.includePaymentInfo) {
          headers.push('Payment Method', 'Discount', 'Shipping', 'Total Amount', 'Paid Amount');
        }

        headers.push('Notes', 'Created Date');

        const rows = ordersToExport.map(order => {
          const row = [
            order.order_number || '',
            order.order_date ? format(new Date(order.order_date), 'yyyy-MM-dd') : '',
            order.order_status || '',
            order.payment_status || ''
          ];

          if (exportOptions.includeCustomerDetails) {
            row.push(
              order.customer_name || '',
              order.customer_phone || '',
              order.customer_email || ''
            );
          }

          if (exportOptions.includeShippingAddress) {
            const addr = order.shipping_address || {};
            row.push(
              addr.address_line || '',
              addr.city || '',
              addr.district || '',
              addr.postal_code || ''
            );
          }

          if (exportOptions.includeProductDetails) {
            const products = (order.order_items || []).map(item =>
              `${item.item_name} (×${item.quantity})`
            ).join('; ');
            const totalItems = (order.order_items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
            row.push(products, totalItems, order.subtotal || 0);
          }

          if (exportOptions.includePaymentInfo) {
            row.push(
              order.payment_method || '',
              (order.discount_amount || 0) + (order.coupon_discount || 0),
              order.shipping_cost || 0,
              order.total_amount || 0,
              order.paid_amount || 0
            );
          }

          row.push(
            order.customer_notes || '',
            order.created_date ? format(new Date(order.created_date), 'yyyy-MM-dd HH:mm') : ''
          );

          return row;
        });

        const escapeCSV = (val) => {
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const csvContent = [
          headers.map(escapeCSV).join(','),
          ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_orders_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${ordersToExport.length} orders`, { id: 'export' });
        setIsExportDialogOpen(false);
      } catch (error) {
        toast.error('Export failed: ' + error.message, { id: 'export' });
      }
    }, 100);
  }, [filteredOrders, orders, exportOptions]);

  const hasDateFilter = dateRange.from !== undefined;

  // 🚀 LIGHTNING FAST: Pre-compute inventory map for O(1) lookups
  const inventoryMap = useMemo(() => {
    const map = new Map();
    inventory.forEach(i => map.set(i.id, i));
    return map;
  }, [inventory]);

  // 🚀 LIGHTNING FAST: Stats with optimized calculations using BDT timezone
  const stats = useMemo(() => {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
    const statsOrders = hasDateFilter ? filteredOrders : ordersWithDateStr;

    let pendingOrders = 0, confirmedOrders = 0, shippedOrders = 0, totalReturns = 0, totalProductQuantity = 0;

    for (const o of statsOrders) {
      if (o.order_status === 'pending') pendingOrders++;
      else if (['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(o.order_status)) confirmedOrders++;
      if (['shipped', 'out_for_delivery'].includes(o.order_status)) shippedOrders++;
      if (o.order_status === 'returned') totalReturns++;

      for (const item of (o.order_items || [])) {
        const invItem = inventoryMap.get(item.inventory_id);
        totalProductQuantity += getActualQuantity(item.quantity || 0, invItem, item);
      }
    }

    let todayOrdersCount = 0, todayPending = 0, todayConfirmed = 0, todayShipped = 0, todayReturns = 0, todayProductQty = 0;

    for (const o of ordersWithDateStr) {
      const orderDate = o.order_date || o.created_date;
      if (!orderDate) continue;

      const orderDateBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(orderDate));
      if (orderDateBDT !== todayStr) continue;

      todayOrdersCount++;
      if (o.order_status === 'pending') todayPending++;
      else if (['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(o.order_status)) todayConfirmed++;
      if (['shipped', 'out_for_delivery'].includes(o.order_status)) todayShipped++;
      if (o.order_status === 'returned') todayReturns++;

      for (const item of (o.order_items || [])) {
        const invItem = inventoryMap.get(item.inventory_id);
        todayProductQty += getActualQuantity(item.quantity || 0, invItem, item);
      }
    }

    return {
      totalOrders: statsOrders.length,
      pendingOrders, confirmedOrders, shippedOrders, totalProductQuantity, totalReturns,
      todayOrders: todayOrdersCount, todayPending, todayConfirmed, todayShipped, todayReturns, todayProductQty,
      isFiltered: hasDateFilter
    };
  }, [ordersWithDateStr, filteredOrders, hasDateFilter, inventoryMap]);

  // Premium Pill Badges
  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-slate-100 text-slate-700 border border-slate-200' },
      confirmed: { label: 'Confirmed', class: 'bg-white text-[#D32F2F] border-2 border-[#D32F2F]' },
      processing: { label: 'Processing', class: 'bg-blue-50 text-blue-700 border border-blue-200' },
      packed: { label: 'Packed', class: 'bg-purple-50 text-purple-700 border border-purple-200' },
      shipped: { label: 'Shipped', class: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
      out_for_delivery: { label: 'Out for Delivery', class: 'bg-orange-50 text-orange-700 border border-orange-200' },
      delivered: { label: 'Delivered', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
      cancelled: { label: 'Cancelled', class: 'bg-red-50 text-red-700 border border-red-200' },
      returned: { label: 'Returned', class: 'bg-slate-100 text-slate-600 border border-slate-200' },
    };
    const { label, class: className } = config[status] || config.pending;
    return <Badge className={`${className} rounded-full px-3 py-0.5 text-xs font-medium`}>{label}</Badge>;
  };

  const getPaymentBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-slate-100 text-slate-600 border border-slate-200' },
      partial: { label: 'Partial', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
      paid: { label: 'Paid', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
      refunded: { label: 'Refunded', class: 'bg-red-50 text-red-600 border border-red-200' },
    };
    const { label, class: className } = config[status] || config.pending;
    return <Badge className={`${className} rounded-full px-3 py-0.5 text-xs font-medium`}>{label}</Badge>;
  };

  if (ordersLoading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto animate-pulse">
            <ShoppingCart className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-slate-600 font-medium">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="w-full px-6 py-6 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Sales Management</span>
        </div>

        {/* Premium Header with Glassmorphism Search */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Sales Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track and manage all your sales orders</p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Glassmorphism Search Bar */}
            <div className="relative flex-1 lg:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search orders... ⌘K"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 h-11 px-4 bg-white border-slate-200 shadow-sm rounded-xl hover:bg-slate-50">
                  <Filter className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline text-slate-700">Filters</span>
                  {(dateRange.from || statusFilter !== 'all' || paymentFilter !== 'all') && (
                    <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-600 text-white text-xs">
                      {[dateRange.from, statusFilter !== 'all', paymentFilter !== 'all'].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Quick Date Filters</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const todayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
                          setDateRange({ from: todayBDT, to: todayBDT });
                        }}
                        className="text-sm"
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date();
                          const bdtNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
                          bdtNow.setDate(bdtNow.getDate() - 1);
                          const yesterdayBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(bdtNow);
                          setDateRange({ from: yesterdayBDT, to: yesterdayBDT });
                        }}
                        className="text-sm"
                      >
                        Yesterday
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Date Range</Label>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-slate-600">From</Label>
                        <Input
                          type="date"
                          value={dateRange.from || ''}
                          onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">To</Label>
                        <Input
                          type="date"
                          value={dateRange.to || ''}
                          onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Order Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="packed">Packed</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Payment Status</Label>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Product Filter</Label>
                    <SearchableProductSelect
                      inventory={inventory.filter(i => i.department === departmentFilter || departmentFilter === 'all')}
                      value={productFilter}
                      onValueChange={setProductFilter}
                      placeholder="Search products..."
                      showStock={false}
                      showPrice={false}
                      allowClear={true}
                      onClear={() => setProductFilter('all')}
                    />
                  </div>

                  {(dateRange.from || statusFilter !== 'all' || paymentFilter !== 'all' || productFilter !== 'all') && (
                    <>
                      <Separator />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateRange({ from: undefined, to: undefined });
                          setStatusFilter('all');
                          setPaymentFilter('all');
                          setProductFilter('all');
                        }}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Clear All Filters
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {canExport && (
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(true)}
                className="h-11 px-4 bg-white border-slate-200 shadow-sm rounded-xl hover:bg-slate-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            {canCreate && (
              <>
                <Button
                  onClick={() => setIsBulkUploadOpen(true)}
                  variant="outline"
                  className="h-11 px-4 bg-white border-blue-500 text-blue-700 hover:bg-blue-50 shadow-sm rounded-xl"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk CSV
                </Button>
                <Button
                  onClick={() => {
                    setEditingOrder(null);
                    setIsOrderFormOpen(true);
                  }}
                  className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-lg shadow-red-500/25 px-6 h-11 font-semibold rounded-xl transition-all hover:shadow-red-500/40 hover:scale-[1.02]"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Sale
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Premium Minimalist Stats Cards */}
        {stats.isFiltered && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">
              Showing stats for filtered date range: {dateRange.from} {dateRange.to && dateRange.to !== dateRange.from ? `to ${dateRange.to}` : ''}
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Orders */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-[#D32F2F]" />
                </div>
                {!stats.isFiltered && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Today: {stats.todayOrders}</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats.totalOrders}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">{stats.isFiltered ? 'Filtered Orders' : 'Total Orders'}</p>
            </CardContent>
          </Card>

          {/* Total Product Qty */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#D32F2F]" />
                </div>
                {!stats.isFiltered && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Today: {stats.todayProductQty}</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats.totalProductQuantity}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Products Sold</p>
            </CardContent>
          </Card>

          {/* Total Returns */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-[#D32F2F]" />
                </div>
                {!stats.isFiltered && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Today: {stats.todayReturns}</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats.totalReturns}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Returns</p>
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                {!stats.isFiltered && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Today: {stats.todayPending}</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats.pendingOrders}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Pending</p>
            </CardContent>
          </Card>

          {/* Confirmed Orders */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                {!stats.isFiltered && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Today: {stats.todayConfirmed}</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats.confirmedOrders}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Confirmed</p>
            </CardContent>
          </Card>

          {/* Shipped Orders */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                {!stats.isFiltered && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">Today: {stats.todayShipped}</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats.shippedOrders}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Shipped</p>
            </CardContent>
          </Card>
        </div>

        {/* Premium Bulk Actions Bar */}
        {selectedOrderIds.length > 0 && (
          <Card className="bg-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#D32F2F] text-white rounded-full px-4 py-1">
                    {selectedOrderIds.length} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrderIds([])}
                    className="text-slate-600 hover:text-slate-900 rounded-lg"
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Bulk Print Invoices */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
                      if (selectedOrders.length === 0) {
                        toast.error('No orders selected');
                        return;
                      }

                      const printWindow = window.open('', '_blank', 'width=800,height=600');
                      if (!printWindow) {
                        toast.error('Please allow popups for bulk printing');
                        return;
                      }

                      import('../components/invoices/BulkInvoiceTemplate').then(module => {
                        const html = module.generateBulkInvoiceHTML(selectedOrders);
                        printWindow.document.write(html);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                        }, 800);
                        toast.success(`Printing ${selectedOrders.length} branded invoices...`);
                      }).catch(err => {
                        console.error('Failed to load invoice template:', err);
                        toast.error('Failed to generate invoices');
                        printWindow.close();
                      });
                    }}
                    className="text-orange-600 hover:bg-orange-50"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Print All Invoices
                  </Button>
                  {canApprove && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction('confirmed')}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirm All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction('shipped')}
                        className="text-cyan-600 hover:bg-cyan-50"
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        Ship All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction('delivered')}
                        className="text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Delivered
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction('delete')}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Premium Orders Table */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-slate-900">Sales Orders</span>
                <Badge className="bg-slate-100 text-slate-700 font-medium rounded-full px-3">
                  {filteredOrders.length}
                </Badge>
                {displayedOrders.length < filteredOrders.length && (
                  <span className="text-sm text-slate-400">showing {displayedOrders.length}</span>
                )}
                {!allOrdersLoaded && recentOrders.length > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 font-medium rounded-full px-3 animate-pulse">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                    Loading all...
                  </Badge>
                )}
                {allOrdersLoaded && (
                  <Badge className="bg-green-100 text-green-700 font-medium rounded-full px-3">
                    ✓ All {orders.length} loaded
                  </Badge>
                )}
              </div>
              {filteredOrders.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-[#D32F2F] hover:text-[#B71C1C] hover:bg-red-50 rounded-lg"
                >
                  {selectedOrderIds.length === filteredOrders.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="w-12 pl-6">
                      <Checkbox
                        checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="border-slate-300"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Order #</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Items</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">Qty</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 uppercase tracking-wider pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No sales orders found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors h-16">
                        <TableCell className="pl-6">
                          <Checkbox
                            checked={selectedOrderIds.includes(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                            className="border-slate-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-[#D32F2F] text-sm">
                              {order.order_number?.startsWith('PD')
                                ? order.order_number
                                : order.order_number
                                  ? `PD${order.order_number.replace(/\D/g, '').slice(-6).padStart(6, '0')}`
                                  : `PD${order.id?.slice(-6) || '000000'}`}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {order.adprofit_synced && (
                                <Badge className="bg-emerald-500 text-white text-xs w-fit shadow-sm">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Adprofit Synced
                                </Badge>
                              )}
                              {(order.order_source === 'website' || order.order_source === 'landing_page' || order.tags?.some(tag => tag?.includes('woocommerce') || tag?.includes('WP-') || tag?.includes('landing'))) && (
                                <Badge className="bg-purple-100 text-purple-700 text-xs w-fit">
                                  🌐 Landing Page
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.order_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                                {order.customer_name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>{order.customer_name}</p>
                              <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px]">
                            {order.order_items && order.order_items.length > 0 ? (
                              <div className="text-sm space-y-1.5">
                                {order.order_items.map((item, idx) => {
                                  const inventoryItem = inventoryMap.get(item.inventory_id);
                                  const isCombo = inventoryItem?.is_bundle && inventoryItem?.bundle_items?.length > 0;

                                  return (
                                    <div key={idx} className="border-l-2 border-slate-200 pl-2">
                                      <p className="font-medium text-slate-800" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                                        {item.item_name}
                                      </p>
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        <span className="text-xs text-slate-500">×{item.quantity}</span>
                                        <span className="text-xs text-slate-500">@৳{item.unit_price?.toLocaleString()}</span>
                                        {item.discount > 0 && (
                                          <span className="text-xs text-red-500">-৳{item.discount}</span>
                                        )}
                                        <span className="text-xs font-medium text-emerald-600">= ৳{item.subtotal?.toLocaleString()}</span>
                                      </div>
                                      {isCombo && (
                                        <p className="text-xs text-blue-600 mt-0.5">
                                          🎁 Combo: {inventoryItem.bundle_items.map(bi => {
                                            const comp = inventoryMap.get(bi.inventory_id);
                                            return `${bi.quantity}×${comp?.item_name || 'Unknown'}`;
                                          }).join(' + ')}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-sm">No items</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {order.order_items && order.order_items.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {order.order_items.map((item, idx) => {
                                const inventoryItem = inventoryMap.get(item.inventory_id);
                                const bundleCount = getComboCount(inventoryItem, item);
                                const isCombo = bundleCount > 1;
                                const actualQty = getActualQuantity(item.quantity, inventoryItem, item);

                                return (
                                  <div key={idx} className="inline-flex items-center gap-1.5">
                                    <span className="font-bold text-red-600 text-base">×{actualQty}</span>
                                    {isCombo && (
                                      <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 h-4">
                                        {bundleCount}×{item.quantity}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-bold text-slate-900 text-sm">৳{order.total_amount?.toLocaleString()}</span>
                            {((order.discount_amount || 0) + (order.coupon_discount || 0)) > 0 && (
                              <Badge className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-1.5 py-0 h-4 font-medium rounded-full">
                                -৳{((order.discount_amount || 0) + (order.coupon_discount || 0)).toLocaleString()} off
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 gap-1">
                                {getPaymentBadge(order.payment_status)}
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" sideOffset={4}>
                              <DropdownMenuItem onClick={() => handlePaymentStatusChange(order, 'pending')}>
                                <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                                Mark as Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePaymentStatusChange(order, 'partial')}>
                                <DollarSign className="w-4 h-4 mr-2 text-orange-600" />
                                Mark as Partial
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePaymentStatusChange(order, 'paid')}>
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                Mark as Paid
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 gap-1">
                                {getStatusBadge(order.order_status)}
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" sideOffset={4}>
                              {order.order_status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'confirmed')}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                                  Confirm Order
                                </DropdownMenuItem>
                              )}
                              {order.order_status === 'confirmed' && (
                                <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'processing')}>
                                  <Package className="w-4 h-4 mr-2 text-indigo-600" />
                                  Mark as Processing
                                </DropdownMenuItem>
                              )}
                              {(order.order_status === 'processing' || order.order_status === 'packed') && (
                                <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'shipped')}>
                                  <Truck className="w-4 h-4 mr-2 text-purple-600" />
                                  Mark as Shipped
                                </DropdownMenuItem>
                              )}
                              {(order.order_status === 'shipped' || order.order_status === 'out_for_delivery') && (
                                <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'delivered')}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  Mark as Delivered
                                </DropdownMenuItem>
                              )}
                              {order.order_status !== 'cancelled' && order.order_status !== 'delivered' && (
                                <DropdownMenuItem onClick={async () => {
                                  // For shipped orders, use the revert function
                                  if (['shipped', 'out_for_delivery'].includes(order.order_status)) {
                                    const reason = prompt('Enter cancellation reason (inventory will be reverted):');
                                    if (reason === null) return;
                                    
                                    const loadingToast = toast.loading('Cancelling order and reverting inventory...');
                                    try {
                                      const response = await base44.functions.invoke('revertInventoryOnCancel', {
                                        order_id: order.id,
                                        reason: reason
                                      });
                                      toast.dismiss(loadingToast);
                                      
                                      if (response.data?.success) {
                                        queryClient.invalidateQueries(['orders']);
                                        queryClient.invalidateQueries(['inventory']);
                                        toast.success(`Order cancelled. ${response.data.items_reverted} items restored to inventory.`);
                                      } else {
                                        toast.error(response.data?.error || 'Failed to cancel order');
                                      }
                                    } catch (error) {
                                      toast.dismiss(loadingToast);
                                      toast.error('Error: ' + error.message);
                                    }
                                  } else {
                                    handleQuickStatusChange(order, 'cancelled');
                                  }
                                }}>
                                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                                  Cancel Order
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewInvoice(order)}
                              className="h-9 w-9 p-0 hover:bg-blue-50"
                              title="Full Invoice"
                            >
                              <FileText className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0 hover:bg-orange-50"
                                  title="Print Small Receipt"
                                >
                                  <Receipt className="w-4 h-4 text-orange-600" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="text-center">Small Receipt</DialogTitle>
                                </DialogHeader>
                                <ThermalReceipt order={order} />
                              </DialogContent>
                            </Dialog>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                                className="h-9 w-9 p-0 hover:bg-purple-50"
                                title="Edit Order"
                              >
                                <Edit className="w-4 h-4 text-purple-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const blob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `invoice-${order.order_number}.pdf`;
                                a.click();
                                window.URL.revokeObjectURL(url);
                                toast.success('Invoice downloaded!');
                              }}
                              className="h-9 w-9 p-0 hover:bg-green-50"
                              title="Download Invoice"
                            >
                              <Download className="w-4 h-4 text-green-600" />
                            </Button>
                            {['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(order.order_status) && !order.adprofit_synced && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  base44.functions.invoke('syncToAdprofit', { order_id: order.id })
                                    .then(async (response) => {
                                      if (response.data?.success) {
                                        queryClient.invalidateQueries(['orders']);
                                      }
                                    })
                                    .catch((error) => {
                                      console.error('Adprofit sync error:', error);
                                    });
                                  toast.success('Sync started in background');
                                }}
                                className="h-9 w-9 p-0 hover:bg-indigo-50"
                                title="Sync to Adprofit"
                              >
                                <Send className="w-4 h-4 text-indigo-600" />
                              </Button>
                            )}
                            {/* Send to Courier Button */}
                            {['confirmed', 'processing', 'packed'].includes(order.order_status) && !order.courier_placed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  const loadingToast = toast.loading('🚚 Sending to Courier...');
                                  try {
                                    // Build item description
                                    const itemDescription = order.order_items?.map(item =>
                                      `${item.item_name} (×${item.quantity})`
                                    ).join(', ') || 'Products';

                                    // Build full address
                                    const address = order.shipping_address || {};
                                    const fullAddress = [
                                      address.address_line,
                                      address.city,
                                      address.district,
                                      address.postal_code
                                    ].filter(Boolean).join(', ');

                                    // Calculate total items
                                    const totalLot = order.order_items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;

                                    // ✅ FIX: Normalize invoice number to PD***** format for ALL order sources
                                    const rawNumber = order.order_number || '';
                                    const invoiceNumber = rawNumber.startsWith('PD')
                                      ? rawNumber
                                      : rawNumber
                                        ? `PD${rawNumber.replace(/\D/g, '').slice(-6).padStart(6, '0')}`
                                        : `PD${Date.now().toString().slice(-6)}`;

                                    if (rawNumber !== invoiceNumber) {
                                      await Order.update(order.id, { order_number: invoiceNumber });
                                    }

                                    const courierPayload = {
                                      invoice: invoiceNumber,
                                      recipient_name: order.customer_name,
                                      recipient_phone: order.customer_phone,
                                      recipient_address: fullAddress || 'Address not provided',
                                      cod_amount: order.payment_status === 'paid' ? 0 : (order.total_amount || 0),
                                      note: order.customer_notes || '',
                                      item_description: itemDescription,
                                      total_lot: totalLot,
                                      delivery_type: 0
                                    };

                                    const response = await fetch('https://primary-production-2437.up.railway.app/webhook/cc89a1d1-b50c-4126-ab94-5952ecf1a2e5', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify(courierPayload)
                                    });

                                    toast.dismiss(loadingToast);

                                    if (response.ok) {
                                      const result = await response.json();

                                      const consignmentData = Array.isArray(result) ? result[0] : result;
                                      const consignment = consignmentData?.consignment || consignmentData;

                                      if (consignmentData?.status === 200 || consignment?.consignment_id || consignment?.tracking_code) {
                                        await Order.update(order.id, {
                                          courier_placed: true,
                                          courier_placed_date: new Date().toISOString(),
                                          courier_tracking_code: consignment?.tracking_code || null,
                                          courier_consignment_id: String(consignment?.consignment_id || '')
                                        });

                                        queryClient.invalidateQueries(['orders']);
                                        toast.success('✅ Order sent to courier successfully!');
                                      } else {
                                        toast.error('Courier response invalid: ' + JSON.stringify(result));
                                      }
                                    } else {
                                      const errorText = await response.text();
                                      toast.error('Courier request failed: ' + (errorText || response.statusText));
                                    }
                                  } catch (error) {
                                    toast.dismiss(loadingToast);
                                    toast.error('Failed to send to courier: ' + error.message);
                                  }
                                }}
                                className="h-9 w-9 p-0 hover:bg-orange-50"
                                title="Send to Courier"
                              >
                                <Truck className="w-4 h-4 text-orange-600" />
                              </Button>
                            )}
                            {order.courier_placed && (
                              <>
                                <Badge className="bg-orange-100 text-orange-800 text-xs h-7 px-2">
                                  <PackageCheck className="w-3 h-3 mr-1" />
                                  {order.courier_status || 'Sent'}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    const loadingToast = toast.loading('🔄 Updating status...');
                                    try {
                                      const rawNum = order.order_number || '';
                                      const pdOrderNumber = rawNum.startsWith('PD')
                                        ? rawNum
                                        : rawNum
                                          ? `PD${rawNum.replace(/\D/g, '').slice(-6).padStart(6, '0')}`
                                          : `PD${order.id?.slice(-6) || '000000'}`;

                                      const webhookResponse = await fetch('https://primary-production-2437.up.railway.app/webhook/49c76188-047b-4479-8166-2e5e92fd8b1a', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          tracking_code: order.courier_tracking_code,
                                          consignment_id: order.courier_consignment_id,
                                          order_number: pdOrderNumber
                                        })
                                      });

                                      toast.dismiss(loadingToast);

                                      if (webhookResponse.ok) {
                                        const result = await webhookResponse.json();
                                        queryClient.invalidateQueries(['orders-sales-recent']);
                                        queryClient.invalidateQueries(['orders-sales-all']);
                                        toast.success(`✅ Status: ${result.new_status || 'Updated'}`);
                                      } else {
                                        const errorText = await webhookResponse.text();
                                        toast.error('Failed: ' + (errorText || webhookResponse.statusText));
                                      }
                                    } catch (error) {
                                      toast.dismiss(loadingToast);
                                      toast.error('Error: ' + error.message);
                                    }
                                  }}
                                  className="h-8 px-3 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                  title="Update Status from Steadfast"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Update
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* Load More Row */}
                  {displayedOrders.length < filteredOrders.length && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        <Button
                          variant="outline"
                          onClick={loadMoreOrders}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Load More ({filteredOrders.length - displayedOrders.length} remaining)
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Order Form Dialog */}
        <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                {editingOrder ? 'Edit Sale Order' : 'Create New Sale Order'}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <OrderForm
                order={editingOrder}
                customers={customers}
                inventory={inventory}
                onSubmit={handleOrderSubmit}
                onCancel={() => {
                  setIsOrderFormOpen(false);
                  setEditingOrder(null);
                }}
                currentUser={currentUser}
                canViewAllDepartments={canViewAllDepartments}
                userDepartment={userDepartment}
                initialDepartment={departmentFilter}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <AlertDialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Export Sales Orders
              </AlertDialogTitle>
              <AlertDialogDescription>
                Choose what data to include in your export.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Label className="font-medium">Export filtered orders only</Label>
                <Checkbox
                  checked={exportOptions.onlyFiltered}
                  onCheckedChange={(checked) => setExportOptions({...exportOptions, onlyFiltered: checked})}
                />
              </div>
              <p className="text-xs text-slate-500">
                {exportOptions.onlyFiltered
                  ? `Will export ${filteredOrders.length} filtered orders`
                  : `Will export all ${orders.length} orders`}
              </p>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Include in Export:</Label>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Customer Details (Name, Phone, Email)</Label>
                  <Checkbox
                    checked={exportOptions.includeCustomerDetails}
                    onCheckedChange={(checked) => setExportOptions({...exportOptions, includeCustomerDetails: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Shipping Address</Label>
                  <Checkbox
                    checked={exportOptions.includeShippingAddress}
                    onCheckedChange={(checked) => setExportOptions({...exportOptions, includeShippingAddress: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Product Details</Label>
                  <Checkbox
                    checked={exportOptions.includeProductDetails}
                    onCheckedChange={(checked) => setExportOptions({...exportOptions, includeProductDetails: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Payment Info (Method, Amounts)</Label>
                  <Checkbox
                    checked={exportOptions.includePaymentInfo}
                    onCheckedChange={(checked) => setExportOptions({...exportOptions, includePaymentInfo: checked})}
                  />
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExportExcel}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Invoice Dialog */}
        <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Invoice</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <OrderInvoice order={selectedOrder} />
            )}
          </DialogContent>
        </Dialog>

        {/* ── Bulk Upload Dialog (isolated + error-bounded) ── */}
        <BulkUploadDialog
          open={isBulkUploadOpen}
          onOpenChange={setIsBulkUploadOpen}
          inventory={inventory}
          customers={customers}
          onComplete={() => {
            queryClient.invalidateQueries(['orders-sales-recent']);
            queryClient.invalidateQueries(['orders-sales-all']);
          }}
        />

      </div>
    </div>
  );
}

export default withPermission(SalesPage, 'sales', 'can_view');
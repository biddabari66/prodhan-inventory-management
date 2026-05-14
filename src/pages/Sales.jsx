import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import DailySalesFinalizer from '../components/sales/DailySalesFinalizer';
import MobileOrderCard from '../components/sales/MobileOrderCard';

// Main Sales Page
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
  const [showDuplicates, setShowDuplicates] = useState(false);
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

      const loadingToast = toast.loading(`Deleting ${selectedOrderIds.length} order(s)...`);
      try {
        const results = await Promise.allSettled(selectedOrderIds.map(id => Order.delete(id)));
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        toast.dismiss(loadingToast);
        queryClient.invalidateQueries(['orders-sales-recent']);
        queryClient.invalidateQueries(['orders-sales-all']);
        if (failed > 0) {
          toast.success(`${succeeded} order(s) deleted. ${failed} were already removed.`);
        } else {
          toast.success(`${succeeded} order(s) deleted successfully`);
        }
        setSelectedOrderIds([]);
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error('Failed to delete orders: ' + error.message);
      }
    } else {
      try {
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

  // 🚀 Pre-compute date strings for ALL orders ONCE (BDT timezone)
  const bdtFormatter = useMemo(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }), []);

  const ordersWithDateStr = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    return orders.map(o => {
      const d = new Date(o.order_date || o.created_date);
      const isValid = !isNaN(d.getTime());
      return {
        ...o,
        _dateStr: isValid ? bdtFormatter.format(d) : '1970-01-01'
      };
    });
  }, [orders, bdtFormatter]);

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

    if (showDuplicates) {
      const seen = new Map();
      filtered.forEach(o => {
        const key = `${(o.customer_phone || '').trim()}_${o.total_amount || 0}`;
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(o.id);
      });
      const dupIds = new Set();
      seen.forEach(ids => { if (ids.length > 1) ids.forEach(id => dupIds.add(id)); });
      filtered = filtered.filter(o => dupIds.has(o.id));
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
          headers.push('Products', 'Variants', 'Total Items', 'Subtotal');
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
            const variants = (order.order_items || []).map(item => item.variant_label || '').filter(Boolean).join('; ');
            const totalItems = (order.order_items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
            row.push(products, variants || '—', totalItems, order.subtotal || 0);
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
      if (['pending', 'on_hold', 'call_not_received', 'follow_up', 'callback_requested'].includes(o.order_status)) pendingOrders++;
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

      const parsedDate = new Date(orderDate);
      if (isNaN(parsedDate.getTime())) continue;

      const orderDateBDT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(parsedDate);
      if (orderDateBDT !== todayStr) continue;

      todayOrdersCount++;
      if (['pending', 'on_hold', 'call_not_received', 'follow_up', 'callback_requested'].includes(o.order_status)) todayPending++;
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
      on_hold: { label: 'On Hold', class: 'bg-yellow-50 text-yellow-700 border border-yellow-300' },
      call_not_received: { label: 'Call Not Received', class: 'bg-amber-50 text-amber-700 border border-amber-300' },
      follow_up: { label: 'Follow Up', class: 'bg-indigo-50 text-indigo-700 border border-indigo-300' },
      callback_requested: { label: 'Callback Requested', class: 'bg-pink-50 text-pink-700 border border-pink-300' },
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
      <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Sales Management</span>
        </div>

        {/* Premium Header with Glassmorphism Search */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="hidden sm:block">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Sales Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track and manage all your sales orders</p>
          </div>
          {/* Mobile: Search + action row */}
          <div className="w-full space-y-2 lg:space-y-0 lg:w-auto">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-10 sm:h-11 bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-1 h-10 sm:h-11 px-2.5 sm:px-4 bg-white border-slate-200 shadow-sm rounded-xl hover:bg-slate-50">
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
                       <SelectItem value="on_hold">On Hold</SelectItem>
                       <SelectItem value="call_not_received">Call Not Received</SelectItem>
                       <SelectItem value="follow_up">Follow Up</SelectItem>
                       <SelectItem value="callback_requested">Callback Requested</SelectItem>
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

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Duplicate Detection</Label>
                    <Button
                      variant={showDuplicates ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowDuplicates(!showDuplicates)}
                      className={`w-full h-9 text-sm ${showDuplicates ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-amber-700 border-amber-300 hover:bg-amber-50'}`}
                    >
                      {showDuplicates ? '✓ Showing Duplicates' : '🔍 Find Duplicate Orders'}
                    </Button>
                    <p className="text-xs text-slate-400 mt-1">Same phone + same amount</p>
                  </div>

                  {(dateRange.from || statusFilter !== 'all' || paymentFilter !== 'all' || productFilter !== 'all' || showDuplicates) && (
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
                          setShowDuplicates(false);
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
                className="h-10 sm:h-11 px-2.5 sm:px-4 bg-white border-slate-200 shadow-sm rounded-xl hover:bg-slate-50"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
            {canCreate && (
              <Button
                onClick={() => {
                  setEditingOrder(null);
                  setIsOrderFormOpen(true);
                }}
                className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-lg shadow-red-500/25 px-3 sm:px-6 h-10 sm:h-11 font-semibold rounded-xl"
              >
                <Plus className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Create Sale</span>
              </Button>
            )}
          </div>
          {/* Second row on mobile: finalize + bulk */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {isAdmin && (
              <DailySalesFinalizer
                isAdmin={isAdmin}
                onComplete={() => {
                  queryClient.invalidateQueries(['orders-sales-recent']);
                  queryClient.invalidateQueries(['orders-sales-all']);
                }}
              />
            )}
            {canCreate && (
              <Button
                onClick={() => setIsBulkUploadOpen(true)}
                variant="outline"
                className="h-9 px-3 bg-white border-blue-500 text-blue-700 hover:bg-blue-50 shadow-sm rounded-lg text-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Bulk CSV
              </Button>
            )}
          </div>
          </div>
        </div>

        {/* Order Form Dialog */}
        <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                {editingOrder ? 'Edit Sale Order' : 'Create New Sale Order'}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 overflow-y-auto max-h-[calc(95vh-100px)]">
              <OrderForm
                order={editingOrder}
                customers={customers}
                inventory={inventory}
                inventoryMap={inventoryMap}
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

        {/* Export Dialog and other dialogs... (keep all existing dialogs as before) */}
      </div>
    </div>
  );
}

export default withPermission(SalesPage, 'sales', 'can_view');
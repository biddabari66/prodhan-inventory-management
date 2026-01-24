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

// Enhanced Order Form Component
const OrderForm = ({ order, customers, inventory, onSubmit, onCancel, currentUser, canViewAllDepartments, userDepartment, initialDepartment }) => {
  const defaultDepartment = 'prodhan_com_e_commerce';

  const [formData, setFormData] = useState(order || {
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    order_items: [],
    shipping_address: {
      address_line: '',
      city: '',
      district: '',
      postal_code: '',
      phone: ''
    },
    payment_method: 'cod',
    payment_status: 'pending',
    department: defaultDepartment,
    discount_amount: 0,
    coupon_discount: 0,
    discount_code: '',
    shipping_cost: 60,
    customer_notes: '',
    tags: []
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);

  const departmentFilteredInventory = useMemo(() => {
    try {
      return inventory.filter(item => {
        return item?.department === formData.department && (item?.current_stock || 0) > 0;
      });
    } catch (error) {
      console.error('Error filtering inventory:', error);
      return [];
    }
  }, [inventory, formData.department]);

  useEffect(() => {
    try {
      if (formData.customer_id && customers.length > 0) {
        const customer = customers.find(c => c.id === formData.customer_id);
        if (customer) {
          setSelectedCustomer(customer);
          setFormData(prev => ({
            ...prev,
            customer_name: customer.customer_name || prev.customer_name,
            customer_phone: customer.customer_phone || prev.customer_phone,
            customer_email: customer.customer_email || prev.customer_email || '',
            shipping_address: customer.shipping_addresses?.[0] || prev.shipping_address
          }));
        }
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  }, [formData.customer_id, customers]);

  const calculations = useMemo(() => {
    const subtotal = formData.order_items.reduce((sum, item) => sum + item.subtotal, 0);
    const regularDiscount = formData.discount_amount || 0;
    const couponDiscount = formData.coupon_discount || 0;
    const totalDiscount = regularDiscount + couponDiscount;
    const shippingCost = formData.shipping_cost || 0;
    const total = subtotal - totalDiscount + shippingCost;

    return { subtotal, regularDiscount, couponDiscount, totalDiscount, shippingCost, total };
  }, [formData.order_items, formData.discount_amount, formData.coupon_discount, formData.shipping_cost]);

  const handleAddItem = () => {
    if (!selectedInventoryItem || itemQuantity <= 0) {
      toast.error('Please select an item and enter valid quantity');
      return;
    }

    const inventoryItem = departmentFilteredInventory.find(i => i.id === selectedInventoryItem);
    if (!inventoryItem) {
      toast.error('Selected item not available');
      return;
    }

    // Check combo product component availability
    if (inventoryItem.is_bundle && inventoryItem.bundle_items?.length > 0) {
      let canFulfillCombo = true;
      let unavailableComponent = null;

      for (const bundleItem of inventoryItem.bundle_items) {
        const component = inventory.find(i => i.id === bundleItem.inventory_id);
        const requiredQty = bundleItem.quantity * itemQuantity;

        if (!component || component.current_stock < requiredQty) {
          canFulfillCombo = false;
          unavailableComponent = component?.item_name || 'Unknown';
          break;
        }
      }

      if (!canFulfillCombo) {
        toast.error(`Cannot fulfill combo: Insufficient stock for component "${unavailableComponent}"`);
        return;
      }
    }

    if (inventoryItem.current_stock < itemQuantity) {
      toast.error(`Only ${inventoryItem.current_stock} units available in stock`);
      return;
    }

    const unitPrice = inventoryItem.selling_price;
    const discount = itemDiscount || 0;
    const subtotal = (unitPrice * itemQuantity) - discount;

    const newItem = {
      inventory_id: inventoryItem.id,
      item_name: inventoryItem.item_name,
      quantity: itemQuantity,
      unit_price: unitPrice,
      discount: discount,
      subtotal: subtotal,
      is_combo: inventoryItem.is_bundle || false
    };

    setFormData(prev => ({
      ...prev,
      order_items: [...prev.order_items, newItem]
    }));

    setSelectedInventoryItem('');
    setItemQuantity(1);
    setItemDiscount(0);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      order_items: prev.order_items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.order_items.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    if (!formData.customer_name || !formData.customer_phone) {
      toast.error('Please enter customer details');
      return;
    }

    if (!formData.shipping_address.address_line || !formData.shipping_address.city) {
      toast.error('Please enter complete shipping address');
      return;
    }

    // Generate short order number: PD + 6 digits (e.g., PD020483)
    const generateShortOrderNumber = () => {
      const timestamp = Date.now().toString().slice(-5);
      const random = Math.floor(Math.random() * 10);
      return `PD0${timestamp}${random}`;
    };

    const orderData = {
      ...formData,
      order_number: order?.order_number || generateShortOrderNumber(),
      order_date: order?.order_date || new Date().toISOString(),
      subtotal: calculations.subtotal,
      total_amount: calculations.total,
      order_status: order?.order_status || 'pending',
      paid_amount: formData.payment_status === 'paid' ? calculations.total : 0
    };

    onSubmit(orderData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Existing Customer (Optional)</Label>
            <SearchableCustomerSelect
              customers={customers}
              value={formData.customer_id}
              onValueChange={(value) => setFormData({...formData, customer_id: value})}
              placeholder="Search customers by name, phone, or email..."
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Customer Name *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                placeholder="Enter name"
                required
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={formData.customer_phone}
                onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                placeholder="01XXXXXXXXX"
                required
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                placeholder="customer@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Order Items
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              🛒 Prodhan.com Products
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border-2 bg-purple-50 border-purple-300">
            <p className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products shown below are from <strong>Prodhan.com E-commerce</strong> only.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="md:col-span-2">
              <Label className="font-semibold">
                Select Product
                <span className="text-muted-foreground font-normal ml-2">
                  ({departmentFilteredInventory.length} available)
                </span>
              </Label>
              <SearchableProductSelect
                inventory={departmentFilteredInventory}
                value={selectedInventoryItem}
                onValueChange={setSelectedInventoryItem}
                placeholder="Search by name, ISBN, barcode..."
                disabled={departmentFilteredInventory.length === 0}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Discount (BDT)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={itemDiscount}
                onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>
          </div>

          {formData.order_items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.order_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-center">{item.quantity || 0}</TableCell>
                    <TableCell className="text-right">BDT {(item.unit_price || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">-BDT {(item.discount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">BDT {(item.subtotal || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No items added yet. Start adding products above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Shipping Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Full Address *</Label>
              <Textarea
                value={formData.shipping_address.address_line}
                onChange={(e) => setFormData({
                  ...formData,
                  shipping_address: {...formData.shipping_address, address_line: e.target.value}
                })}
                placeholder="House/Flat no, Road, Area"
                rows={2}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  value={formData.shipping_address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    shipping_address: {...formData.shipping_address, city: e.target.value}
                  })}
                  placeholder="e.g. Dhaka"
                  required
                />
              </div>
              <div>
                <Label>District *</Label>
                <Input
                  value={formData.shipping_address.district}
                  onChange={(e) => setFormData({
                    ...formData,
                    shipping_address: {...formData.shipping_address, district: e.target.value}
                  })}
                  placeholder="e.g. Dhaka"
                  required
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  value={formData.shipping_address.postal_code}
                  onChange={(e) => setFormData({
                    ...formData,
                    shipping_address: {...formData.shipping_address, postal_code: e.target.value}
                  })}
                  placeholder="e.g. 1205"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({...formData, payment_method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => setFormData({...formData, payment_status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="font-semibold">Department</Label>
              <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white">🛒 Prodhan.com E-commerce</Badge>
                  <span className="text-sm text-purple-700">All orders are for Prodhan.com</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Regular Discount (BDT)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.discount_amount}
                onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Coupon Discount (BDT)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.coupon_discount}
                onChange={(e) => setFormData({...formData, coupon_discount: parseFloat(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Shipping Cost (BDT)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.shipping_cost}
                onChange={(e) => setFormData({...formData, shipping_cost: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items Total:</span>
              <span className="font-medium">BDT {(calculations.subtotal || 0).toLocaleString()}</span>
            </div>
            {calculations.totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Discount:</span>
                <span className="font-medium text-red-600">-BDT {(calculations.totalDiscount || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping:</span>
              <span className="font-medium">BDT {(calculations.shippingCost || 0).toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-red-600">BDT {(calculations.total || 0).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <Label>Customer Notes</Label>
            <Textarea
              value={formData.customer_notes}
              onChange={(e) => setFormData({...formData, customer_notes: e.target.value})}
              placeholder="Any special requests from customer..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          {order ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
};

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
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeCustomerDetails: true,
    includeProductDetails: true,
    includeShippingAddress: true,
    includePaymentInfo: true,
    onlyFiltered: true
  });

  // 🚀 LIGHTNING FAST: Cached current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 10 * 60 * 1000, // 10 min cache
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
      // Load in batches for smoother UI
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
    staleTime: 5 * 60 * 1000, // 5 min cache for full data
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: recentOrders.length > 0, // Only run after initial load
  });

  // Use all orders if loaded, otherwise use recent
  const orders = allOrdersLoaded && allOrders.length > 0 ? allOrders : recentOrders;

  // 🚀 LIGHTNING FAST: Real-time subscription with debounce
  useEffect(() => {
    let timeoutId = null;
    const unsubscribe = Order.subscribe(() => {
      // Debounce to avoid rapid refetches
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
    staleTime: 30 * 60 * 1000, // 30 min cache
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // 🚀 LIGHTNING FAST: Inventory with very long cache
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory-sales'],
    queryFn: () => Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 500),
    staleTime: 30 * 60 * 1000, // 30 min cache
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
    staleTime: 15 * 60 * 1000, // 15 min cache
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

  // Check if user has specific permission
  const hasPermission = useCallback((module, action) => {
    // Super admin and admin have all permissions
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

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      let customerId = orderData.customer_id;

      if (!customerId) {
        // Check for duplicates by phone or email
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

      // Update inventory with combo and variant support
      for (const item of orderData.order_items) {
        const inventoryItem = inventory.find(i => i.id === item.inventory_id);
        if (!inventoryItem) continue;

        // Check if this is a combo product
        if (inventoryItem.is_bundle && inventoryItem.bundle_items?.length > 0) {
          // Deduct all component items
          for (const bundleItem of inventoryItem.bundle_items) {
            const componentItem = inventory.find(i => i.id === bundleItem.inventory_id);
            if (componentItem) {
              const deductQty = bundleItem.quantity * item.quantity;
              const newComponentStock = componentItem.current_stock - deductQty;

              await Inventory.update(bundleItem.inventory_id, {
                current_stock: newComponentStock
              });

              await base44.entities.InventoryMovement.create({
                inventory_item_id: bundleItem.inventory_id,
                movement_type: 'out',
                quantity: -deductQty,
                reference_type: 'sale',
                reference_id: order.id,
                reference_number: order.order_number,
                unit_cost: componentItem.selling_price,
                total_value: -(deductQty * componentItem.selling_price),
                performed_by: currentUser?.id || 'system',
                notes: `Combo Sale: ${order.order_number} - Component of ${inventoryItem.item_name} (${item.quantity}×)`,
                movement_date: new Date().toISOString().split('T')[0],
                balance_after: newComponentStock
              });
            }
          }

          // Record combo movement (informational)
          await base44.entities.InventoryMovement.create({
            inventory_item_id: item.inventory_id,
            movement_type: 'out',
            quantity: -item.quantity,
            reference_type: 'sale',
            reference_id: order.id,
            reference_number: order.order_number,
            unit_cost: item.unit_price,
            total_value: -(item.quantity * item.unit_price),
            performed_by: currentUser?.id || 'system',
            notes: `Combo Sale: ${order.order_number} - ${inventoryItem.bundle_items.length} components auto-deducted`,
            movement_date: new Date().toISOString().split('T')[0],
            balance_after: inventoryItem.current_stock
          });
        } else {
          // Regular product or variant tracking
          const newStock = inventoryItem.current_stock - item.quantity;

          // Handle color variant deduction if applicable
          let updatedColorVariants = inventoryItem.color_variants;
          if (item.selected_color && inventoryItem.color_variants?.length > 0) {
            updatedColorVariants = inventoryItem.color_variants.map(variant => {
              if (variant.color === item.selected_color) {
                return { ...variant, quantity: variant.quantity - item.quantity };
              }
              return variant;
            });
          }

          await Inventory.update(item.inventory_id, {
            current_stock: newStock,
            ...(updatedColorVariants && { color_variants: updatedColorVariants })
          });

          await base44.entities.InventoryMovement.create({
            inventory_item_id: item.inventory_id,
            movement_type: 'out',
            quantity: -item.quantity,
            reference_type: 'sale',
            reference_id: order.id,
            reference_number: order.order_number,
            unit_cost: item.unit_price,
            total_value: -(item.quantity * item.unit_price),
            performed_by: currentUser?.id || 'system',
            notes: `Sale: ${order.order_number} - Customer: ${order.customer_name}${item.selected_color ? ` - Color: ${item.selected_color}` : ''}`,
            movement_date: new Date().toISOString().split('T')[0],
            balance_after: newStock
          });
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['inventory']);
      toast.success('Sale order created successfully!');
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

  // Update order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      return await Order.update(orderId, { order_status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      toast.success('Order status updated!');
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
      // Bulk status update
      try {
        await Promise.all(selectedOrderIds.map(id => 
          Order.update(id, { order_status: action })
        ));
        queryClient.invalidateQueries(['orders']);
        toast.success(`${selectedOrderIds.length} order(s) updated to ${action}`);
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
      // Validate order data before editing
      if (!order || !order.id) {
        toast.error('Invalid order data');
        return;
      }
      
      // Ensure order has required fields
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
  const [displayLimit, setDisplayLimit] = useState(50); // Start with less for instant render
  
  // Pre-compute BDT date formatter once
  const bdtFormatter = useMemo(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }), []);
  
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    let filtered = orders;
    
    // 🚀 Fast path: Department filter first (most selective)
    if (!canViewAllDepartments) {
      filtered = filtered.filter(o => o.department === userDepartment);
    } else if (departmentFilter !== 'all') {
      filtered = filtered.filter(o => o.department === departmentFilter);
    }

    // 🚀 Date filter - optimized with pre-computed formatter
    if (dateRange.from) {
      const fromDateStr = dateRange.from;
      const toDateStr = dateRange.to || dateRange.from;
      filtered = filtered.filter(o => {
        const orderDateBDT = bdtFormatter.format(new Date(o.order_date || o.created_date));
        return orderDateBDT >= fromDateStr && orderDateBDT <= toDateStr;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(o => o.payment_status === paymentFilter);
    }

    // 🚀 Search filter - only if query exists (expensive)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_number?.toLowerCase().includes(query) ||
        o.customer_name?.toLowerCase().includes(query) ||
        o.customer_phone?.includes(query)
      );
    }

    // Product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(o => 
        o.order_items?.some(item => item.inventory_id === productFilter)
      );
    }

    return filtered;
  }, [orders, departmentFilter, searchQuery, statusFilter, paymentFilter, dateRange, canViewAllDepartments, userDepartment, productFilter, bdtFormatter]);

  // 🚀 Display only limited rows for smooth scrolling
  const displayedOrders = useMemo(() => {
    return filteredOrders.slice(0, displayLimit);
  }, [filteredOrders, displayLimit]);

  // Load more handler
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
    
    // Use setTimeout to not block UI
    setTimeout(() => {
      try {
        // Build headers dynamically
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
        
        // Build rows
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
            row.push(
              products,
              totalItems,
              order.subtotal || 0
            );
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
        
        // Generate CSV content (Excel compatible)
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
        
        // Add BOM for Excel UTF-8 compatibility
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

  // Check if date filter is applied to determine which stats to show
  const hasDateFilter = dateRange.from !== undefined;

  // 🚀 LIGHTNING FAST: Pre-compute inventory map for O(1) lookups
  const inventoryMap = useMemo(() => {
    const map = new Map();
    inventory.forEach(i => map.set(i.id, i));
    return map;
  }, [inventory]);

  // 🚀 LIGHTNING FAST: Stats with optimized calculations
  const stats = useMemo(() => {
    const todayBDT = bdtFormatter.format(new Date());
    const statsOrders = hasDateFilter ? filteredOrders : orders;
    
    // Single pass for main stats
    let pendingOrders = 0, confirmedOrders = 0, shippedOrders = 0, totalReturns = 0, totalProductQuantity = 0;
    
    for (const o of statsOrders) {
      if (o.order_status === 'pending') pendingOrders++;
      else if (['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(o.order_status)) confirmedOrders++;
      if (['shipped', 'out_for_delivery'].includes(o.order_status)) shippedOrders++;
      if (o.order_status === 'returned') totalReturns++;
      
      // Product qty with O(1) lookup
      for (const item of (o.order_items || [])) {
        const invItem = inventoryMap.get(item.inventory_id);
        totalProductQuantity += getActualQuantity(item.quantity || 0, invItem, item);
      }
    }

    // Today's stats - single pass
    let todayOrdersCount = 0, todayPending = 0, todayConfirmed = 0, todayShipped = 0, todayReturns = 0, todayProductQty = 0;
    
    for (const o of orders) {
      const orderDateBDT = bdtFormatter.format(new Date(o.order_date || o.created_date));
      if (orderDateBDT !== todayBDT) continue;
      
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
  }, [orders, filteredOrders, hasDateFilter, inventoryMap, bdtFormatter]);

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

  // 🚀 LIGHTNING FAST: Show skeleton only on first load, not on refetch
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
                        // Use Bangladesh timezone (Asia/Dhaka) for today
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
                        // Use Bangladesh timezone for yesterday
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
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
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
              <div className="flex gap-2">
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
                         <span className="font-mono font-bold text-[#D32F2F] text-sm">{order.order_number?.startsWith('PD') ? order.order_number : `PD${order.order_number?.replace(/\D/g, '').slice(-6) || order.id?.slice(-6) || '000000'}`}</span>
                         <div className="flex flex-wrap gap-1">
                           {order.adprofit_synced && (
                             <Badge className="bg-emerald-500 text-white text-xs w-fit shadow-sm">
                               <CheckCircle className="w-3 h-3 mr-1" />
                               Adprofit Synced
                             </Badge>
                           )}
                           {order.order_source === 'website' && order.tags?.some(tag => tag?.includes('woocommerce') || tag?.includes('WP-')) && (
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
                        <span className="font-bold text-slate-900 text-sm">৳{order.total_amount?.toLocaleString()}</span>
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
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(order, 'cancelled')}>
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
                                // Silent background sync - no loading toast
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
                                  
                                  // Prepare payload as per Steadfast documentation
                                  const courierPayload = {
                                    invoice: order.order_number,
                                    recipient_name: order.customer_name,
                                    recipient_phone: order.customer_phone,
                                    recipient_address: fullAddress || 'Address not provided',
                                    cod_amount: order.payment_status === 'paid' ? 0 : (order.total_amount || 0),
                                    note: order.customer_notes || '',
                                    item_description: itemDescription,
                                    total_lot: totalLot,
                                    delivery_type: 0 // 0 = home delivery
                                  };
                                  
                                  // Send to webhook
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
                                    
                                    // Handle response - can be array or object
                                    const consignmentData = Array.isArray(result) ? result[0] : result;
                                    const consignment = consignmentData?.consignment || consignmentData;
                                    
                                    // Check if successful (status 200 or consignment exists)
                                    if (consignmentData?.status === 200 || consignment?.consignment_id || consignment?.tracking_code) {
                                      // Update order with courier info
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
                            <Badge className="bg-orange-100 text-orange-800 text-xs h-7 px-2">
                              <PackageCheck className="w-3 h-3 mr-1" />
                              Courier
                            </Badge>
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
      </div>
    </div>
  );
}

export default withPermission(SalesPage, 'sales', 'can_view');
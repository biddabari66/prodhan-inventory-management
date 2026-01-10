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
  ShoppingCart, RefreshCw, Send, Printer, FileText, ArrowUpDown, Upload, FileSpreadsheet, Loader2, Shield, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Order } from '@/entities/Order';
import { Customer } from '@/entities/Customer';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CardSkeleton, TableSkeleton } from '../components/common/SkeletonLoader';
import OrderInvoice from '../components/invoices/OrderInvoice';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import SearchableProductSelect from '../components/common/SearchableProductSelect';
import { ChevronDown } from 'lucide-react';
import SearchableCustomerSelect from '../components/common/SearchableCustomerSelect';
import { Checkbox } from '@/components/ui/checkbox';

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
    return inventory.filter(item => {
      return item.department === formData.department && item.current_stock > 0;
    });
  }, [inventory, formData.department]);

  useEffect(() => {
    if (formData.customer_id && customers.length > 0) {
      const customer = customers.find(c => c.id === formData.customer_id);
      if (customer) {
        setSelectedCustomer(customer);
        setFormData(prev => ({
          ...prev,
          customer_name: customer.customer_name,
          customer_phone: customer.customer_phone,
          customer_email: customer.customer_email || '',
          shipping_address: customer.shipping_addresses?.[0] || prev.shipping_address
        }));
      }
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

    const orderData = {
      ...formData,
      order_number: order?.order_number || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
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
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">BDT {item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">-BDT {item.discount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">BDT {item.subtotal.toLocaleString()}</TableCell>
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
          <div className="bg-gradient-to-br from-violet-50 to-pink-50 p-6 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items Total:</span>
              <span className="font-medium">BDT {calculations.subtotal.toLocaleString()}</span>
            </div>
            {calculations.totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Discount:</span>
                <span className="font-medium text-red-600">-BDT {calculations.totalDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping:</span>
              <span className="font-medium">BDT {calculations.shippingCost.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-violet-600">BDT {calculations.total.toLocaleString()}</span>
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
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 5 * 60 * 1000
  });

  // CRITICAL FIX: Fetch ALL orders (no limit) to show complete history
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const allOrders = await Order.list('-order_date');
      console.log('✅ Loaded all orders:', allOrders.length);
      return allOrders;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => Customer.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => Inventory.list(),
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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

  // PRODUCTION: Auto-sync to Adprofit on confirmed status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      // CRITICAL: Auto-sync BEFORE updating status for immediate feedback
      if (newStatus === 'confirmed') {
        try {
          const loadingToast = toast.loading('🔄 Confirming & syncing to Adprofit...');
          
          const syncResponse = await base44.functions.invoke('syncToAdprofit', { order_id: orderId });
          
          toast.dismiss(loadingToast);
          
          if (syncResponse.data?.success) {
            const { synced_items, failed_items } = syncResponse.data;
            
            // Update order with sync info
            const updatedOrder = await Order.update(orderId, { 
              order_status: newStatus,
              adprofit_synced: true,
              adprofit_sync_date: new Date().toISOString(),
              adprofit_synced_items: synced_items,
              adprofit_failed_items: failed_items || 0
            });
            
            if (failed_items > 0) {
              toast.warning(`⚠️ Confirmed & partially synced (${synced_items}/${synced_items + failed_items} items)`);
            } else {
              toast.success(`✅ Order confirmed & synced to Adprofit (${synced_items} items)!`);
            }
            
            return updatedOrder;
          } else {
            // Still confirm order even if sync fails
            const updatedOrder = await Order.update(orderId, { order_status: newStatus });
            toast.warning('Order confirmed but Adprofit sync failed');
            return updatedOrder;
          }
        } catch (syncError) {
          console.error('Adprofit auto-sync error:', syncError);
          // Still confirm order even if sync fails
          const updatedOrder = await Order.update(orderId, { order_status: newStatus });
          toast.warning('Order confirmed but Adprofit sync failed: ' + syncError.message);
          return updatedOrder;
        }
      } else {
        // For other status changes, just update normally
        return await Order.update(orderId, { order_status: newStatus });
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['orders']);
      if (variables.newStatus !== 'confirmed') {
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
    setEditingOrder(order);
    setIsOrderFormOpen(true);
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

  // OPTIMIZED: Fast order filtering with early returns
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    let filtered = [...orders];

    if (!canViewAllDepartments) {
      filtered = filtered.filter(order => order.department === userDepartment);
    } else if (departmentFilter !== 'all') {
      filtered = filtered.filter(order => order.department === departmentFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_phone?.includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === paymentFilter);
    }

    if (productFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.order_items?.some(item => item.inventory_id === productFilter)
      );
    }

    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      toDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate >= fromDate && orderDate <= toDate;
      });
    }

    return filtered;
  }, [orders, departmentFilter, searchQuery, statusFilter, paymentFilter, dateRange, canViewAllDepartments, userDepartment, productFilter]);

  // PRODUCTION-READY: 100% accurate stats for all historical data
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // CRITICAL FIX: If date filter is active, "Today" cards = filtered data
    const isDateFilterActive = dateRange.from !== undefined;
    
    // If date filter active, use filtered orders; otherwise calculate actual today
    const todayOrders = isDateFilterActive 
      ? filteredOrders 
      : filteredOrders.filter(o => {
          const orderDate = new Date(o.order_date).toISOString().split('T')[0];
          return orderDate === today;
        });
    
    // CRITICAL FIX: Total Orders = ALL orders (pending + confirmed + everything)
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    
    // Status breakdown
    const pendingOrders = filteredOrders.filter(o => o.order_status === 'pending').length;
    const confirmedOrders = filteredOrders.filter(o => ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(o.order_status)).length;
    const shippedOrders = filteredOrders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status)).length;
    const totalReturns = filteredOrders.filter(o => o.order_status === 'returned').length;
    
    // CRITICAL: Total Product Qty = sum actual quantities from ALL orders (including pending)
    const totalProductQuantity = filteredOrders.reduce((totalSum, order) => {
      return totalSum + (order.order_items || []).reduce((orderSum, item) => {
        const inventoryItem = inventory.find(i => i.id === item.inventory_id);
        const actualQty = getActualQuantity(item.quantity || 0, inventoryItem, item);
        return orderSum + actualQty;
      }, 0);
    }, 0);

    // Today's stats (matches filtered data when date filter active)
    const todayOrdersCount = todayOrders.length;
    const todayPending = todayOrders.filter(o => o.order_status === 'pending').length;
    const todayConfirmed = todayOrders.filter(o => ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'].includes(o.order_status)).length;
    const todayShipped = todayOrders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status)).length;
    const todayReturns = todayOrders.filter(o => o.order_status === 'returned').length;
    
    // Today's product quantity (matches filtered data when date filter active)
    const todayProductQty = todayOrders.reduce((totalSum, order) => {
      return totalSum + (order.order_items || []).reduce((orderSum, item) => {
        const inventoryItem = inventory.find(i => i.id === item.inventory_id);
        const actualQty = getActualQuantity(item.quantity || 0, inventoryItem, item);
        return orderSum + actualQty;
      }, 0);
    }, 0);

    return { 
      totalOrders, 
      totalRevenue, 
      pendingOrders, 
      confirmedOrders, 
      shippedOrders, 
      totalProductQuantity,
      totalReturns,
      todayOrders: todayOrdersCount,
      todayPending,
      todayConfirmed,
      todayShipped,
      todayReturns,
      todayProductQty
    };
  }, [filteredOrders, inventory, dateRange.from]);

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800' },
      processing: { label: 'Processing', class: 'bg-indigo-100 text-indigo-800' },
      packed: { label: 'Packed', class: 'bg-purple-100 text-purple-800' },
      shipped: { label: 'Shipped', class: 'bg-cyan-100 text-cyan-800' },
      out_for_delivery: { label: 'Out for Delivery', class: 'bg-orange-100 text-orange-800' },
      delivered: { label: 'Delivered', class: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800' },
      returned: { label: 'Returned', class: 'bg-gray-100 text-gray-800' },
    };
    const { label, class: className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const getPaymentBadge = (status) => {
    const config = {
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
      partial: { label: 'Partial', class: 'bg-orange-100 text-orange-800' },
      paid: { label: 'Paid', class: 'bg-green-100 text-green-800' },
      refunded: { label: 'Refunded', class: 'bg-red-100 text-red-800' },
    };
    const { label, class: className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  if (ordersLoading) {
    return (
      <div className="p-6 space-y-6">
        <CardSkeleton count={3} />
        <TableSkeleton rows={10} columns={8} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="w-full px-6 py-6 space-y-6">
      {/* Compact Header with Search & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Sales Management</h1>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by order number, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 h-10">
                <Filter className="w-4 h-4" />
                Filters
                {(dateRange.from || statusFilter !== 'all' || paymentFilter !== 'all') && (
                  <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-violet-600 text-white text-xs">
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
                        const today = new Date().toISOString().split('T')[0];
                        setDateRange({ from: today, to: today });
                      }}
                      className="text-sm"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toISOString().split('T')[0];
                        setDateRange({ from: yesterdayStr, to: yesterdayStr });
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
          <Button
            onClick={() => {
              setEditingOrder(null);
              setIsOrderFormOpen(true);
            }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg px-6 h-10 font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Sale Order
          </Button>
        </div>
      </div>

      {/* Stats Cards with Today's Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Total Orders */}
        <div className="space-y-2">
          <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-emerald-600">{stats.totalOrders}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="py-2 px-3">
              <p className="text-xs text-emerald-700 font-medium">Today: {stats.todayOrders}</p>
            </CardContent>
          </Card>
        </div>

        {/* Total Product Qty */}
        <div className="space-y-2">
          <Card className="bg-white border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Product Qty</p>
              <p className="text-3xl font-bold text-indigo-600">{stats.totalProductQuantity}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200">
            <CardContent className="py-2 px-3">
              <p className="text-xs text-indigo-700 font-medium">Today: {stats.todayProductQty}</p>
            </CardContent>
          </Card>
        </div>

        {/* Total Returns */}
        <div className="space-y-2">
          <Card className="bg-white border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Returns</p>
              <p className="text-3xl font-bold text-red-600">{stats.totalReturns}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200">
            <CardContent className="py-2 px-3">
              <p className="text-xs text-red-700 font-medium">Today: {stats.todayReturns}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Orders */}
        <div className="space-y-2">
          <Card className="bg-white border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pending Orders</p>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingOrders}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="py-2 px-3">
              <p className="text-xs text-amber-700 font-medium">Today: {stats.todayPending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Confirmed Orders */}
        <div className="space-y-2">
          <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Confirmed Orders</p>
              <p className="text-3xl font-bold text-blue-600">{stats.confirmedOrders}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="py-2 px-3">
              <p className="text-xs text-blue-700 font-medium">Today: {stats.todayConfirmed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Shipped Orders */}
        <div className="space-y-2">
          <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Shipped Orders</p>
              <p className="text-3xl font-bold text-purple-600">{stats.shippedOrders}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200">
            <CardContent className="py-2 px-3">
              <p className="text-xs text-purple-700 font-medium">Today: {stats.todayShipped}</p>
            </CardContent>
          </Card>
        </div>
      </div>



      {/* Bulk Actions Bar */}
      {selectedOrderIds.length > 0 && (
        <Card className="bg-violet-50 border-violet-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-violet-600 text-white">
                  {selectedOrderIds.length} order(s) selected
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedOrderIds([])}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex gap-2">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center justify-between text-xl font-semibold text-slate-900">
            <span>Sales Orders ({filteredOrders.length})</span>
            {filteredOrders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-violet-600 hover:text-violet-700"
              >
                {selectedOrderIds.length === filteredOrders.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item Names</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No sales orders found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedOrderIds.includes(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                        />
                      </TableCell>
                      <TableCell>
                       <div className="flex flex-col gap-1">
                         <span className="font-mono font-semibold text-violet-600">{order.order_number}</span>
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
                            <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
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
                        <div className="max-w-[250px]">
                          {order.order_items && order.order_items.length > 0 ? (
                            <div className="text-sm space-y-1">
                              {order.order_items.map((item, idx) => {
                                const inventoryItem = inventory.find(i => i.id === item.inventory_id);
                                const isCombo = inventoryItem?.is_bundle && inventoryItem?.bundle_items?.length > 0;

                                return (
                                  <div key={idx}>
                                    <p className="font-medium text-slate-800 truncate" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                                      {item.item_name.substring(0, 30)}
                                      {item.item_name.length > 30 ? '...' : ''}
                                    </p>
                                    {isCombo && (
                                      <p className="text-xs text-blue-600 ml-2">
                                        🎁 Combo: {inventoryItem.bundle_items.map(bi => {
                                          const comp = inventory.find(i => i.id === bi.inventory_id);
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
                              const inventoryItem = inventory.find(i => i.id === item.inventory_id);
                              const bundleCount = getComboCount(inventoryItem, item);
                              const isCombo = bundleCount > 1;
                              const actualQty = getActualQuantity(item.quantity, inventoryItem, item);

                              return (
                                <div key={idx} className="inline-flex items-center gap-1.5">
                                  <span className="font-bold text-violet-600 text-base">×{actualQty}</span>
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
                      <TableCell className="text-right font-semibold">
                        BDT {order.total_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1">
                              {getPaymentBadge(order.payment_status)}
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1">
                              {getStatusBadge(order.order_status)}
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center">
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
                            title="View Invoice"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                          </Button>
                          {isAdmin && (
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
                              onClick={async () => {
                                const loadingToast = toast.loading('🔄 Syncing to Adprofit...');
                                try {
                                  const response = await base44.functions.invoke('syncToAdprofit', { order_id: order.id });
                                  toast.dismiss(loadingToast);
                                  
                                  if (response.data?.success) {
                                    queryClient.invalidateQueries(['orders']);
                                    const { synced_items, failed_items } = response.data;
                                    if (failed_items > 0) {
                                      toast.warning(`⚠️ Partially synced: ${synced_items}/${synced_items + failed_items} items`);
                                    } else {
                                      toast.success(`✅ Synced ${synced_items} items to Adprofit!`);
                                    }
                                  } else {
                                    toast.error('Sync failed: ' + (response.data?.error || 'Unknown error'));
                                  }
                                } catch (error) {
                                  toast.dismiss(loadingToast);
                                  toast.error('Sync failed: ' + error.message);
                                }
                              }}
                              className="h-9 w-9 p-0 hover:bg-indigo-50"
                              title="Sync to Adprofit"
                            >
                              <Send className="w-4 h-4 text-indigo-600" />
                            </Button>
                          )}

                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
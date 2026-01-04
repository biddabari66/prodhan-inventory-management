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
import SearchableCustomerSelect from '../components/common/SearchableCustomerSelect';
import { Checkbox } from '@/components/ui/checkbox';

import { withPermission } from '../components/common/PermissionGuard';
import { useCachedQuery } from '../components/common/CachedQuery';

// Enhanced Order Form Component
const OrderForm = ({ order, customers, inventory, onSubmit, onCancel, currentUser, canViewAllDepartments, userDepartment, initialDepartment }) => {
  const defaultDepartment = useMemo(() => {
    if (order) return order.department;
    if (!canViewAllDepartments && userDepartment && userDepartment !== 'all') return userDepartment;
    if (initialDepartment && initialDepartment !== 'all') return initialDepartment;
    return 'boibari';
  }, [order, canViewAllDepartments, userDepartment, initialDepartment]);

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
      subtotal: subtotal
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
            <Badge variant="outline" className={formData.department === 'boibari' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-red-100 text-red-800 border-red-300'}>
              {formData.department === 'boibari' ? '📚 Boibari Products' : '🛒 Prodhan.com Products'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg border-2 ${formData.department === 'boibari' ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300'}`}>
            <p className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products shown below are from <strong>{formData.department === 'boibari' ? 'Boibari.com (Books)' : 'Prodhan.com (E-commerce)'}</strong> only.
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
              <Label className="font-semibold">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => {
                  if (!canViewAllDepartments && value !== userDepartment) {
                    toast.error('You can only create orders for your department');
                    return;
                  }
                  setFormData({...formData, department: value, order_items: []});
                  toast.info(`Product list updated to ${value === 'boibari' ? 'Boibari' : 'Prodhan.com'} items`);
                }}
                disabled={!canViewAllDepartments}
              >
                <SelectTrigger className={!canViewAllDepartments ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boibari">📚 Boibari</SelectItem>
                  <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com (E-commerce)</SelectItem>
                </SelectContent>
              </Select>
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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => Order.list('-order_date', 500),
    staleTime: 1 * 60 * 1000
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => Customer.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => Inventory.list(),
    staleTime: 2 * 60 * 1000
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

      // Update inventory
      for (const item of orderData.order_items) {
        const inventoryItem = inventory.find(i => i.id === item.inventory_id);
        if (inventoryItem) {
          const newStock = inventoryItem.current_stock - item.quantity;
          await Inventory.update(item.inventory_id, {
            current_stock: newStock
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
            notes: `Sale: ${order.order_number} - Customer: ${order.customer_name}`,
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

  // Status update mutation with Adprofit sync
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      const updatedOrder = await Order.update(orderId, { order_status: newStatus });
      
      // Auto-sync to Adprofit when order is delivered
      if (newStatus === 'delivered') {
        try {
          const syncResponse = await base44.functions.invoke('syncToAdprofit', { order_id: orderId });
          
          if (syncResponse.data?.success) {
            const { synced_items, failed_items } = syncResponse.data;
            if (failed_items > 0) {
              toast.warning(`⚠️ Order delivered & partially synced to Adprofit (${synced_items}/${synced_items + failed_items} items)`);
            } else {
              toast.success(`✅ Order delivered & synced to Adprofit (${synced_items} items)!`);
            }
          } else {
            toast.warning('Order delivered but Adprofit sync failed. Check order details.');
          }
        } catch (syncError) {
          console.error('Adprofit sync error:', syncError);
          toast.warning('Order delivered but Adprofit sync failed');
        }
      }
      
      return updatedOrder;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['orders']);
      if (variables.newStatus !== 'delivered') {
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

  // Filter orders
  const filteredOrders = useMemo(() => {
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
  }, [orders, departmentFilter, searchQuery, statusFilter, paymentFilter, dateRange, canViewAllDepartments, userDepartment]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const pendingOrders = filteredOrders.filter(o => o.order_status === 'pending' || o.order_status === 'confirmed').length;
    const deliveredOrders = filteredOrders.filter(o => o.order_status === 'delivered').length;

    return { totalOrders, totalRevenue, pendingOrders, deliveredOrders };
  }, [filteredOrders]);

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
      <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-green-500/30">
            <ShoppingCart className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-slate-900">
                Sales Management
              </h1>
              {!canViewAllDepartments && (
                <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1 px-3 py-1.5">
                  <Shield className="w-4 h-4" />
                  {userDepartment === 'boibari' ? '📚 Boibari Only' : '🛒 Prodhan.com Only'}
                </Badge>
              )}
            </div>
            <p className="text-slate-600 mt-1">
              কাস্টমার অর্ডার ও বিক্রয় ব্যবস্থাপনা করুন
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => {
              setEditingOrder(null);
              setIsOrderFormOpen(true);
            }}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Sale Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <ShoppingCart className="w-5 h-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-600">
              {stats.totalOrders}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="premium-card border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                BDT {stats.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Orders
            </CardTitle>
            <Clock className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.pendingOrders}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.deliveredOrders}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by order number, customer name, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Select
                value={departmentFilter}
                onValueChange={handleDepartmentFilterChange}
                disabled={!canViewAllDepartments}
              >
                <SelectTrigger className={!canViewAllDepartments ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {canViewAllDepartments && (
                    <SelectItem value="all">All Departments</SelectItem>
                  )}
                  <SelectItem value="boibari">📚 Boibari</SelectItem>
                  <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Order Status" />
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

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                  onClick={() => handleBulkAction('delivered')}
                  className="text-green-600 hover:bg-green-50"
                >
                  <Truck className="w-4 h-4 mr-1" />
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
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
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
                          {order.adprofit_synced && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs w-fit">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Adprofit ✓
                            </Badge>
                          )}
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
                            <p className="font-medium text-sm">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {order.order_items && order.order_items.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {order.order_items[0].item_name}
                              </p>
                              {order.order_items.length > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  +{order.order_items.length - 1} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm">No items</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        BDT {order.total_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(order.payment_status)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.order_status)}
                      </TableCell>
                      <TableCell className="text-center">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="sm">
                             <MoreVertical className="w-4 h-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleViewInvoice(order)}>
                             <FileText className="w-4 h-4 mr-2" />
                             View Invoice
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                             <Edit className="w-4 h-4 mr-2" />
                             Edit Order
                           </DropdownMenuItem>

                           {order.order_status === 'delivered' && !order.adprofit_synced && (
                             <DropdownMenuItem onClick={async () => {
                               toast.info('Syncing to Adprofit...');
                               try {
                                 const response = await base44.functions.invoke('syncToAdprofit', { order_id: order.id });
                                 if (response.data?.success) {
                                   queryClient.invalidateQueries(['orders']);
                                   toast.success('✅ Synced to Adprofit successfully!');
                                 } else {
                                   toast.error('Sync failed: ' + (response.data?.error || 'Unknown error'));
                                 }
                               } catch (error) {
                                 toast.error('Sync failed: ' + error.message);
                               }
                             }}>
                               <Send className="w-4 h-4 mr-2 text-blue-600" />
                               Sync to Adprofit
                             </DropdownMenuItem>
                           )}

                           {order.order_status === 'delivered' && order.adprofit_synced && (
                             <DropdownMenuItem disabled>
                               <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                               Synced to Adprofit ✓
                             </DropdownMenuItem>
                           )}

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
                                <Truck className="w-4 h-4 mr-2 text-cyan-600" />
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
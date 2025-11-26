import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Package, Users, DollarSign, Truck, Search,
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
import { steadfastIntegration } from '@/functions/steadfastIntegration';
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

import { withPermission } from '../components/common/PermissionGuard';
import { handleOrderStatusChange } from '@/functions/handleOrderStatusChange';
import { useCachedQuery } from '../components/common/CachedQuery';

const OrderForm = ({ order, customers, inventory, users, onSubmit, onCancel, currentUser, canViewAllDepartments, userDepartment, initialDepartment }) => {
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
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" />Customer Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Customer Name *</Label>
              <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} placeholder="Enter name" required />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} placeholder="01XXXXXXXXX" required />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input type="email" value={formData.customer_email} onChange={(e) => setFormData({...formData, customer_email: e.target.value})} placeholder="customer@email.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5" />Order Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="md:col-span-2">
                    <Label className="font-semibold">Select Product</Label>
                    <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
                        <SelectTrigger><SelectValue placeholder='Choose product...' /></SelectTrigger>
                        <SelectContent>
                            {departmentFilteredInventory.map(item => (
                                <SelectItem key={item.id} value={item.id}>{item.item_name} - ৳{item.selling_price?.toLocaleString()} (Stock: {item.current_stock})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Quantity</Label>
                    <Input type="number" min="1" value={itemQuantity} onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)} />
                </div>
                <div>
                    <Label>Discount (৳)</Label>
                    <Input type="number" min="0" value={itemDiscount} onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex items-end">
                    <Button type="button" onClick={handleAddItem} className="w-full"><Plus className="w-4 h-4 mr-2" /> Add</Button>
                </div>
            </div>

            {formData.order_items.length > 0 ? (
                <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Discount</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-center">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {formData.order_items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.item_name}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">৳{item.unit_price.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-red-600">-৳{item.discount.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-semibold">৳{item.subtotal.toLocaleString()}</TableCell>
                                <TableCell className="text-center"><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}><XCircle className="w-4 h-4 text-red-500" /></Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-8 text-muted-foreground"><ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No items added yet. Start adding products above.</p></div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5" />Shipping Address</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Full Address *</Label>
            <Textarea value={formData.shipping_address.address_line} onChange={(e) => setFormData({ ...formData, shipping_address: {...formData.shipping_address, address_line: e.target.value} })} placeholder="House/Flat no, Road, Area" rows={2} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>City *</Label><Input value={formData.shipping_address.city} onChange={(e) => setFormData({ ...formData, shipping_address: {...formData.shipping_address, city: e.target.value} })} placeholder="e.g. Dhaka" required /></div>
            <div><Label>District *</Label><Input value={formData.shipping_address.district} onChange={(e) => setFormData({ ...formData, shipping_address: {...formData.shipping_address, district: e.target.value} })} placeholder="e.g. Dhaka" required /></div>
            <div><Label>Postal Code</Label><Input value={formData.shipping_address.postal_code} onChange={(e) => setFormData({ ...formData, shipping_address: {...formData.shipping_address, postal_code: e.target.value} })} placeholder="e.g. 1205" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" />Payment & Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Payment Method *</Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery (COD)</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select value={formData.payment_status} onValueChange={(value) => setFormData({...formData, payment_status: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-pink-50 p-6 rounded-xl space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-violet-600">৳{calculations.total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700"><CheckCircle className="w-4 h-4 mr-2" />{order ? 'Update Order' : 'Create Order'}</Button>
      </div>
    </form>
  );
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

  const { data: currentUser } = useCachedQuery(
    ['currentUser'], () => User.me(), { cacheTTL: 5 * 60 * 1000, staleTime: 5 * 60 * 1000 }
  );
  const { data: orders = [], isLoading: ordersLoading } = useCachedQuery(
    ['orders'], () => Order.list('-order_date', 500), { cacheTTL: 2 * 60 * 1000, staleTime: 1 * 60 * 1000 }
  );
  const { data: customers = [] } = useCachedQuery(
    ['customers'], () => Customer.list(), { cacheTTL: 5 * 60 * 1000, staleTime: 5 * 60 * 1000 }
  );
  const { data: inventory = [] } = useCachedQuery(
    ['inventory'], () => Inventory.list(), { cacheTTL: 3 * 60 * 1000, staleTime: 2 * 60 * 1000 }
  );

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
        let customerId = orderData.customer_id;
        if (!customerId) {
            const existingCustomer = customers.find(c => c.customer_phone === orderData.customer_phone);
            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                const newCustomer = await Customer.create({ customer_name: orderData.customer_name, customer_phone: orderData.customer_phone, customer_email: orderData.customer_email });
                customerId = newCustomer.id;
            }
        }
        const order = await Order.create({ ...orderData, customer_id: customerId });
        for (const item of orderData.order_items) {
            const inventoryItem = inventory.find(i => i.id === item.inventory_id);
            if (inventoryItem) {
                const newStock = inventoryItem.current_stock - item.quantity;
                await Inventory.update(item.inventory_id, { current_stock: newStock });
            }
        }
        return order;
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['orders', 'customers', 'inventory']);
        toast.success('Sale order created successfully!');
        setIsOrderFormOpen(false);
    },
    onError: (error) => { toast.error('Failed to create order: ' + error.message); },
  });

  const handleOrderSubmit = (orderData) => {
    createOrderMutation.mutate(orderData);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const searchMatch = searchQuery === '' || order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || order.customer_phone.includes(searchQuery);
      const statusMatch = statusFilter === 'all' || order.order_status === statusFilter;
      const paymentMatch = paymentFilter === 'all' || order.payment_status === paymentFilter;
      return searchMatch && statusMatch && paymentMatch;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const pendingOrders = filteredOrders.filter(o => o.order_status === 'pending').length;
    return { totalOrders, totalRevenue, pendingOrders };
  }, [filteredOrders]);

  return (
    <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Sales</h1>
            <Button onClick={() => setIsOrderFormOpen(true)}><Plus className="w-4 h-4 mr-2"/>Create Sale</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardHeader><CardTitle>Total Sales</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.totalOrders}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">৳{stats.totalRevenue.toLocaleString()}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Pending Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.pendingOrders}</p></CardContent></Card>
        </div>
        <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
            <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Create Sale</DialogTitle></DialogHeader><OrderForm customers={customers} inventory={inventory} onSubmit={handleOrderSubmit} onCancel={() => setIsOrderFormOpen(false)} /></DialogContent>
        </Dialog>
    </div>
  );
}

export default withPermission(SalesPage, 'sales', 'can_view');
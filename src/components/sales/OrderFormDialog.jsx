import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ShoppingCart, MapPin, CreditCard, Plus, XCircle, CheckCircle, Package, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { Order } from '@/entities/Order';
import { Customer } from '@/entities/Customer';
import { Inventory } from '@/entities/Inventory';
import { base44 } from '@/api/base44Client';
import SearchableProductSelect from '../common/SearchableProductSelect';
import SearchableCustomerSelect from '../common/SearchableCustomerSelect';

export default function OrderFormDialog({ isOpen, onClose, order, customers, inventory, currentUser }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState(order || {
    customer_id: '', customer_name: '', customer_phone: '', customer_email: '',
    order_items: [],
    shipping_address: { address_line: '', city: '', district: '', postal_code: '' },
    payment_method: 'cod', payment_status: 'pending',
    department: 'prodhan_com_e_commerce',
    discount_amount: 0, coupon_discount: 0, shipping_cost: 60, customer_notes: ''
  });

  const [selectedItem, setSelectedItem] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);

  const availableInventory = useMemo(() => 
    inventory.filter(i => i.department === 'prodhan_com_e_commerce' && (i.current_stock || 0) > 0),
    [inventory]
  );

  useEffect(() => {
    if (formData.customer_id && customers.length) {
      const c = customers.find(x => x.id === formData.customer_id);
      if (c) {
        setFormData(p => ({
          ...p,
          customer_name: c.customer_name || p.customer_name,
          customer_phone: c.customer_phone || p.customer_phone,
          customer_email: c.customer_email || p.customer_email,
          shipping_address: c.shipping_addresses?.[0] || p.shipping_address
        }));
      }
    }
  }, [formData.customer_id, customers]);

  const totals = useMemo(() => {
    const subtotal = formData.order_items.reduce((s, i) => s + i.subtotal, 0);
    const discount = (formData.discount_amount || 0) + (formData.coupon_discount || 0);
    const shipping = formData.shipping_cost || 0;
    return { subtotal, discount, shipping, total: subtotal - discount + shipping };
  }, [formData]);

  const handleAddItem = () => {
    if (!selectedItem || itemQty <= 0) return toast.error('Select item and quantity');
    
    const inv = availableInventory.find(i => i.id === selectedItem);
    if (!inv) return toast.error('Item not available');
    if (inv.current_stock < itemQty) return toast.error(`Only ${inv.current_stock} in stock`);

    const subtotal = (inv.selling_price * itemQty) - (itemDiscount || 0);
    setFormData(p => ({
      ...p,
      order_items: [...p.order_items, {
        inventory_id: inv.id, item_name: inv.item_name,
        quantity: itemQty, unit_price: inv.selling_price,
        discount: itemDiscount || 0, subtotal,
        is_combo: inv.is_bundle || false
      }]
    }));
    
    setSelectedItem(''); setItemQty(1); setItemDiscount(0);
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      let customerId = data.customer_id;
      
      if (!customerId) {
        const existing = customers.find(c => c.customer_phone === data.customer_phone);
        if (existing) {
          customerId = existing.id;
          await Customer.update(customerId, {
            total_orders: (existing.total_orders || 0) + 1,
            total_spent: (existing.total_spent || 0) + data.total_amount
          });
        } else {
          const newCustomer = await Customer.create({
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            customer_type: 'retail',
            shipping_addresses: [data.shipping_address],
            total_orders: 1, total_spent: data.total_amount
          });
          customerId = newCustomer.id;
        }
      }

      const orderData = {
        ...data,
        customer_id: customerId,
        order_number: order?.order_number || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        order_date: order?.order_date || new Date().toISOString(),
        order_status: order?.order_status || 'pending',
        paid_amount: data.payment_status === 'paid' ? data.total_amount : 0
      };

      if (order) {
        return await Order.update(order.id, orderData);
      } else {
        const newOrder = await Order.create(orderData);
        
        // Update inventory
        for (const item of data.order_items) {
          const inv = inventory.find(i => i.id === item.inventory_id);
          if (inv) {
            await Inventory.update(item.inventory_id, { current_stock: inv.current_stock - item.quantity });
            await base44.entities.InventoryMovement.create({
              inventory_item_id: item.inventory_id,
              movement_type: 'out', quantity: -item.quantity,
              reference_type: 'sale', reference_number: newOrder.order_number,
              unit_cost: item.unit_price, total_value: -(item.quantity * item.unit_price),
              performed_by: currentUser?.id || 'system',
              movement_date: new Date().toISOString().split('T')[0],
              balance_after: inv.current_stock - item.quantity
            });
          }
        }
        return newOrder;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders-fast']);
      queryClient.invalidateQueries(['customers-fast']);
      queryClient.invalidateQueries(['inventory-fast']);
      toast.success(order ? 'Order updated' : 'Order created');
      onClose();
    },
    onError: (e) => toast.error('Failed: ' + e.message)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.order_items.length) return toast.error('Add at least one item');
    if (!formData.customer_name || !formData.customer_phone) return toast.error('Enter customer details');
    if (!formData.shipping_address.address_line || !formData.shipping_address.city) return toast.error('Enter shipping address');
    
    createMutation.mutate({ ...formData, subtotal: totals.subtotal, total_amount: totals.total });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/50">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-red-600" />
            {order ? 'Edit Order' : 'Create Sale Order'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(95vh-140px)] p-6 space-y-5">
          {/* Customer */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="py-4 bg-slate-50/50 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <SearchableCustomerSelect
                customers={customers}
                value={formData.customer_id}
                onValueChange={(v) => setFormData(p => ({...p, customer_id: v}))}
                placeholder="Search existing customer..."
              />
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Name *</Label><Input value={formData.customer_name} onChange={(e) => setFormData(p => ({...p, customer_name: e.target.value}))} required /></div>
                <div><Label>Phone *</Label><Input value={formData.customer_phone} onChange={(e) => setFormData(p => ({...p, customer_phone: e.target.value}))} required /></div>
                <div><Label>Email</Label><Input type="email" value={formData.customer_email} onChange={(e) => setFormData(p => ({...p, customer_email: e.target.value}))} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="py-4 bg-slate-50/50 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-red-600" /> Order Items
                <Badge variant="secondary" className="ml-auto">{availableInventory.length} available</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="col-span-2">
                  <Label>Product</Label>
                  <SearchableProductSelect inventory={availableInventory} value={selectedItem} onValueChange={setSelectedItem} placeholder="Search products..." />
                </div>
                <div><Label>Qty</Label><Input type="number" value={itemQty} onChange={(e) => setItemQty(parseInt(e.target.value) || 1)} min={1} /></div>
                <div><Label>Discount</Label><Input type="number" value={itemDiscount} onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)} /></div>
                <div className="flex items-end"><Button type="button" onClick={handleAddItem} className="w-full bg-red-600 hover:bg-red-700"><Plus className="w-4 h-4 mr-1" /> Add</Button></div>
              </div>

              {formData.order_items.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {formData.order_items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">৳{item.unit_price?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">৳{item.subtotal?.toLocaleString()}</TableCell>
                        <TableCell><Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({...p, order_items: p.order_items.filter((_,j) => j !== i)}))}><XCircle className="w-4 h-4 text-red-500" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-slate-400"><ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No items added</p></div>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="py-4 bg-slate-50/50 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-red-600" /> Shipping</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div><Label>Address *</Label><Textarea value={formData.shipping_address.address_line} onChange={(e) => setFormData(p => ({...p, shipping_address: {...p.shipping_address, address_line: e.target.value}}))} rows={2} required /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>City *</Label><Input value={formData.shipping_address.city} onChange={(e) => setFormData(p => ({...p, shipping_address: {...p.shipping_address, city: e.target.value}}))} required /></div>
                <div><Label>District</Label><Input value={formData.shipping_address.district} onChange={(e) => setFormData(p => ({...p, shipping_address: {...p.shipping_address, district: e.target.value}}))} /></div>
                <div><Label>Postal Code</Label><Input value={formData.shipping_address.postal_code} onChange={(e) => setFormData(p => ({...p, shipping_address: {...p.shipping_address, postal_code: e.target.value}}))} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Summary */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="py-4 bg-slate-50/50 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-red-600" /> Payment</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Method</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData(p => ({...p, payment_method: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">Cash on Delivery</SelectItem>
                      <SelectItem value="bkash">bKash</SelectItem>
                      <SelectItem value="nagad">Nagad</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.payment_status} onValueChange={(v) => setFormData(p => ({...p, payment_status: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Shipping Cost</Label><Input type="number" value={formData.shipping_cost} onChange={(e) => setFormData(p => ({...p, shipping_cost: parseFloat(e.target.value) || 0}))} /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Regular Discount</Label><Input type="number" value={formData.discount_amount} onChange={(e) => setFormData(p => ({...p, discount_amount: parseFloat(e.target.value) || 0}))} /></div>
                <div><Label>Coupon Discount</Label><Input type="number" value={formData.coupon_discount} onChange={(e) => setFormData(p => ({...p, coupon_discount: parseFloat(e.target.value) || 0}))} /></div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-5 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>৳{totals.subtotal.toLocaleString()}</span></div>
                {totals.discount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span className="text-red-600">-৳{totals.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-slate-500">Shipping</span><span>৳{totals.shipping.toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-red-600">৳{totals.total.toLocaleString()}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div><Label>Customer Notes</Label><Textarea value={formData.customer_notes} onChange={(e) => setFormData(p => ({...p, customer_notes: e.target.value}))} rows={2} placeholder="Special requests..." /></div>
        </form>

        {/* Actions */}
        <div className="border-t bg-white px-6 py-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-red-600 hover:bg-red-700 px-6">
            {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4 mr-2" /> {order ? 'Update' : 'Create'} Order</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
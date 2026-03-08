import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Plus, Users, ShoppingCart, MapPin, CreditCard, CheckCircle, XCircle, Package, Sparkles, Gift, Truck, Tag } from 'lucide-react';
import SearchableProductSelect from '../common/SearchableProductSelect';
import SearchableCustomerSelect from '../common/SearchableCustomerSelect';
import { toast } from 'sonner';
import { useDiscountCampaigns } from './useDiscountCampaigns';

export default function OrderForm({ order, customers, inventory, onSubmit, onCancel, currentUser, canViewAllDepartments, userDepartment, initialDepartment }) {
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

  // Discount campaign integration
  const { activeCampaigns, calculateDiscount } = useDiscountCampaigns();

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

  // Auto-apply discount campaigns
  const campaignResult = useMemo(() => {
    const subtotal = formData.order_items.reduce((sum, item) => sum + item.subtotal, 0);
    return calculateDiscount(formData.order_items, subtotal, formData.discount_code);
  }, [formData.order_items, formData.discount_code, calculateDiscount]);

  // Auto-apply free delivery from campaigns
  useEffect(() => {
    if (campaignResult.freeDelivery && formData.shipping_cost > 0 && !order) {
      setFormData(prev => ({ ...prev, shipping_cost: 0 }));
    }
  }, [campaignResult.freeDelivery]);

  const calculations = useMemo(() => {
    const subtotal = formData.order_items.reduce((sum, item) => sum + item.subtotal, 0);
    const regularDiscount = formData.discount_amount || 0;
    const campaignDiscount = campaignResult.discountAmount || 0;
    const couponDiscount = formData.coupon_discount || 0;
    const totalDiscount = regularDiscount + campaignDiscount + couponDiscount;
    const shippingCost = campaignResult.freeDelivery ? 0 : (formData.shipping_cost || 0);
    const total = Math.max(0, subtotal - totalDiscount + shippingCost);

    return { subtotal, regularDiscount, campaignDiscount, couponDiscount, totalDiscount, shippingCost, total };
  }, [formData.order_items, formData.discount_amount, formData.coupon_discount, formData.shipping_cost, campaignResult]);

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
      discount_amount: (formData.discount_amount || 0) + calculations.campaignDiscount,
      shipping_cost: calculations.shippingCost,
      total_amount: calculations.total,
      order_status: order?.order_status || 'pending',
      paid_amount: formData.payment_status === 'paid' ? calculations.total : 0,
      tags: [
        ...(formData.tags || []),
        ...campaignResult.appliedCampaigns.map(c => `campaign:${c.name}`)
      ]
    };

    // Increment campaign usage counters (fire and forget)
    if (campaignResult.appliedCampaigns.length > 0) {
      const { base44: b44 } = require('@/api/base44Client');
      campaignResult.appliedCampaigns.forEach(c => {
        b44.entities.DiscountCampaign.update(c.id, {}).catch(() => {});
      });
    }

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Coupon Code</Label>
              <Input
                value={formData.discount_code || ''}
                onChange={(e) => setFormData({...formData, discount_code: e.target.value.toUpperCase()})}
                placeholder="e.g., EID2026"
              />
              {activeCampaigns.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {activeCampaigns.length} offer(s) running now
                </p>
              )}
            </div>
            <div>
              <Label>Manual Discount (BDT)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.discount_amount}
                onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Extra Coupon Disc. (BDT)</Label>
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
                value={campaignResult.freeDelivery ? 0 : formData.shipping_cost}
                onChange={(e) => setFormData({...formData, shipping_cost: parseFloat(e.target.value) || 0})}
                disabled={campaignResult.freeDelivery}
              />
              {campaignResult.freeDelivery && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Free delivery applied!
                </p>
              )}
            </div>
          </div>

          {/* Active Campaigns Banner */}
          {campaignResult.appliedCampaigns.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Offers Applied!</span>
              </div>
              {campaignResult.appliedCampaigns.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Gift className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700">{c.name}</span>
                  {c.discount > 0 && <Badge className="bg-green-600 text-white">-৳{c.discount.toLocaleString()}</Badge>}
                  {c.freeDelivery && <Badge className="bg-purple-600 text-white gap-1"><Truck className="w-3 h-3" /> Free Delivery</Badge>}
                </div>
              ))}
            </div>
          )}

          {/* Active Campaigns Info (when not yet applied) */}
          {activeCampaigns.length > 0 && campaignResult.appliedCampaigns.length === 0 && formData.order_items.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <Tag className="w-4 h-4" />
                <span className="font-medium">
                  {activeCampaigns.length} offer(s) available — {activeCampaigns.map(c => c.campaign_name).join(', ')}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">Add more items or meet conditions to unlock offers.</p>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items Total:</span>
              <span className="font-medium">BDT {(calculations.subtotal || 0).toLocaleString()}</span>
            </div>
            {calculations.campaignDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700 font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> Campaign Discount:</span>
                <span className="font-medium text-green-600">-BDT {(calculations.campaignDiscount || 0).toLocaleString()}</span>
              </div>
            )}
            {calculations.regularDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Manual Discount:</span>
                <span className="font-medium text-red-600">-BDT {(calculations.regularDiscount || 0).toLocaleString()}</span>
              </div>
            )}
            {calculations.couponDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coupon Discount:</span>
                <span className="font-medium text-red-600">-BDT {(calculations.couponDiscount || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping:</span>
              {campaignResult.freeDelivery ? (
                <span className="font-medium text-green-600 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> FREE
                  <span className="line-through text-slate-400 ml-1">BDT 60</span>
                </span>
              ) : (
                <span className="font-medium">BDT {(calculations.shippingCost || 0).toLocaleString()}</span>
              )}
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
}
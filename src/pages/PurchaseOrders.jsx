import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Inventory } from '@/entities/Inventory';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Package, ShoppingCart, Building2, Truck, DollarSign,
  CheckCircle, Clock, AlertCircle, XCircle, Edit, Trash2, Eye,
  FileText, Download, Search, Filter, MoreVertical, CreditCard, Box
} from 'lucide-react';
import SearchableProductSelect from '../components/common/SearchableProductSelect';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { withPermission, usePermission } from '../components/common/PermissionGuard';

// Purchase Order Form Component
const PurchaseOrderForm = ({ order, suppliers, inventory, currentUser, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(order || {
    supplier_id: '',
    supplier_name: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    department: 'prodhan_com_e_commerce',
    order_items: [],
    subtotal: 0,
    tax_amount: 0,
    shipping_cost: 0,
    discount_amount: 0,
    total_amount: 0,
    payment_method: 'bank_transfer',
    payment_status: 'pending',
    order_status: 'draft',
    notes: ''
  });

  const [selectedItem, setSelectedItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemUnit, setItemUnit] = useState('pc');
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    item_name: '',
    category: '',
    purchase_price: 0,
    selling_price: 0,
    current_stock: 0,
    minimum_stock: 10
  });

  // Packaging/Bundling elements
  const [packagingItems, setPackagingItems] = useState(order?.packaging_items || []);
  const [newPackaging, setNewPackaging] = useState({ name: '', quantity: 1, unit_cost: 0, unit: 'pc' });

  const packagingOptions = [
    { name: 'Sticker', icon: '🏷️', units: ['pc', 'sheet', 'roll'] },
    { name: 'Packaging Box', icon: '📦', units: ['pc', 'bundle'] },
    { name: 'Jar/Container', icon: '🫙', units: ['pc', 'litre', 'ml'] },
    { name: 'Plastic Wrap', icon: '🎁', units: ['kg', 'roll', 'meter'] },
    { name: 'Bubble Wrap', icon: '🔵', units: ['kg', 'roll', 'meter'] },
    { name: 'Label', icon: '🪧', units: ['pc', 'sheet', 'roll'] },
    { name: 'Tape', icon: '📎', units: ['pc', 'roll'] },
    { name: 'Bag', icon: '👜', units: ['pc', 'kg', 'bundle'] },
    { name: 'Other', icon: '📋', units: ['pc', 'kg', 'litre', 'meter'] }
  ];

  const unitOptions = ['pc', 'kg', 'gm', 'litre', 'ml', 'roll', 'sheet', 'bundle', 'meter'];

  const addPackagingItem = () => {
    if (!newPackaging.name) {
      toast.error('Please select a packaging item');
      return;
    }
    setPackagingItems([...packagingItems, { ...newPackaging, id: Date.now() }]);
    setNewPackaging({ name: '', quantity: 1, unit_cost: 0, unit: 'pc' });
  };

  const getPackagingUnits = (name) => {
    const opt = packagingOptions.find(o => o.name === name);
    return opt?.units || ['pc', 'kg', 'litre'];
  };

  const removePackagingItem = (id) => {
    setPackagingItems(packagingItems.filter(item => item.id !== id));
  };

  const packagingTotal = packagingItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  // Always filter inventory for prodhan_com_e_commerce department
  const departmentFilteredInventory = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];
    return inventory.filter(item => item.department === 'prodhan_com_e_commerce');
  }, [inventory]);

  // Always filter suppliers for prodhan_com_e_commerce department
  const departmentFilteredSuppliers = useMemo(() => {
    if (!suppliers || suppliers.length === 0) return [];
    return suppliers.filter(s => 
      s.department === 'prodhan_com_e_commerce' || s.department === 'both' || !s.department
    );
  }, [suppliers]);

  const handleSupplierChange = (supplierId) => {
    const supplier = departmentFilteredSuppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplier_id: supplierId,
        supplier_name: supplier.supplier_name
      }));
    }
  };

  const handleAddItem = () => {
    if (!selectedItem || itemQuantity <= 0 || itemPrice <= 0) {
      toast.error('Please select item, quantity and price');
      return;
    }

    const inventoryItem = departmentFilteredInventory.find(i => i.id === selectedItem);
    if (!inventoryItem) {
      toast.error('Item not found');
      return;
    }

    const totalPrice = itemQuantity * itemPrice;
    const newItem = {
      inventory_id: inventoryItem.id,
      item_name: inventoryItem.item_name,
      quantity_ordered: itemQuantity,
      quantity_received: 0,
      unit_price: itemPrice,
      total_price: totalPrice,
      unit: itemUnit,
      is_new_product: false
    };

    const newItems = [...formData.order_items, newItem];
    const newSubtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);

    setFormData(prev => ({
      ...prev,
      order_items: newItems,
      subtotal: newSubtotal,
      total_amount: newSubtotal + (prev.tax_amount || 0) + (prev.shipping_cost || 0) - (prev.discount_amount || 0)
    }));

    setSelectedItem('');
    setItemQuantity(1);
    setItemPrice(0);
    setItemUnit('pc');
  };

  const handleAddNewProduct = async () => {
    if (!newProduct.item_name || !newProduct.category) {
      toast.error('Please fill product name and category');
      return;
    }

    try {
      const createdProduct = await Inventory.create({
        ...newProduct,
        department: formData.department,
        status: 'active'
      });

      const totalPrice = itemQuantity * newProduct.purchase_price;
      const newItem = {
        inventory_id: createdProduct.id,
        item_name: createdProduct.item_name,
        quantity_ordered: itemQuantity,
        quantity_received: 0,
        unit_price: newProduct.purchase_price,
        total_price: totalPrice,
        is_new_product: true
      };

      const newItems = [...formData.order_items, newItem];
      const newSubtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);

      setFormData(prev => ({
        ...prev,
        order_items: newItems,
        subtotal: newSubtotal,
        total_amount: newSubtotal + (prev.tax_amount || 0) + (prev.shipping_cost || 0) - (prev.discount_amount || 0)
      }));

      setShowNewProductForm(false);
      setNewProduct({
        item_name: '',
        category: '',
        purchase_price: 0,
        selling_price: 0,
        current_stock: 0,
        minimum_stock: 10
      });
      setItemQuantity(1);

      toast.success('New product created and added to order!');
    } catch (error) {
      toast.error('Failed to create product: ' + error.message);
    }
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.order_items.filter((_, i) => i !== index);
    const newSubtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);

    setFormData(prev => ({
      ...prev,
      order_items: newItems,
      subtotal: newSubtotal,
      total_amount: newSubtotal + (prev.tax_amount || 0) + (prev.shipping_cost || 0) - (prev.discount_amount || 0)
    }));
  };

  const updateTotals = (field, value) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => {
      const updated = { ...prev, [field]: numValue };
      updated.total_amount = updated.subtotal + updated.tax_amount + updated.shipping_cost - updated.discount_amount;
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    if (formData.order_items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const orderData = {
      ...formData,
      po_number: order?.po_number || `PO-${Date.now()}`,
      created_by_id: currentUser?.id,
      created_by_name: currentUser?.full_name,
      amount_due: formData.total_amount - (formData.amount_paid || 0),
      packaging_items: packagingItems,
      packaging_cost: packagingTotal
    };

    onSubmit(orderData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      {/* Supplier & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Purchase Order Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Department *</Label>
              <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white">🛒 Prodhan.com E-commerce</Badge>
                </div>
              </div>
            </div>
            <div>
              <Label>Supplier *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={handleSupplierChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {departmentFilteredSuppliers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No suppliers available for this department
                    </div>
                  ) : (
                    departmentFilteredSuppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.supplier_name} ({supplier.supplier_type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order Status</Label>
              <Select
                value={formData.order_status}
                onValueChange={(value) => setFormData({...formData, order_status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="shipped">Shipped by Supplier</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Order Date *</Label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Expected Delivery Date</Label>
              <Input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({...formData, payment_method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit">Credit (Due Later)</SelectItem>
                  <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Items
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewProductForm(true)}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add New Product
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Existing Item */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg border">
            <div className="md:col-span-2">
              <Label>Select Existing Product</Label>
              <SearchableProductSelect
                inventory={departmentFilteredInventory}
                value={selectedItem}
                onValueChange={(value) => {
                  setSelectedItem(value);
                  const item = departmentFilteredInventory.find(i => i.id === value);
                  if (item) {
                    setItemPrice(item.purchase_price || 0);
                    setItemUnit(item.weight_unit === 'kg' ? 'kg' : 'pc');
                  }
                }}
                placeholder="Search and select product..."
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={itemUnit} onValueChange={setItemUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map(u => (
                    <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit Price (BDT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={itemPrice}
                onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddItem} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Items List */}
          {formData.order_items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.order_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.item_name}
                        {item.is_new_product && (
                          <Badge className="bg-green-100 text-green-800 text-xs">New</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{(item.unit || 'pc').toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">BDT {item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">BDT {item.total_price.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No items added yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pricing & Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Subtotal</Label>
              <Input
                type="number"
                value={formData.subtotal}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label>Tax Amount (BDT)</Label>
              <Input
                type="number"
                min="0"
                value={formData.tax_amount}
                onChange={(e) => updateTotals('tax_amount', e.target.value)}
              />
            </div>
            <div>
              <Label>Shipping Cost (BDT)</Label>
              <Input
                type="number"
                min="0"
                value={formData.shipping_cost}
                onChange={(e) => updateTotals('shipping_cost', e.target.value)}
              />
            </div>
            <div>
              <Label>Discount (BDT)</Label>
              <Input
                type="number"
                min="0"
                value={formData.discount_amount}
                onChange={(e) => updateTotals('discount_amount', e.target.value)}
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-pink-50 p-6 rounded-xl">
            <div className="flex justify-between text-sm mb-2">
              <span>Subtotal:</span>
              <span>BDT {formData.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Tax:</span>
              <span>BDT {(formData.tax_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Shipping:</span>
              <span>BDT {(formData.shipping_cost || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Discount:</span>
              <span className="text-red-600">-BDT {(formData.discount_amount || 0).toLocaleString()}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-violet-600">BDT {formData.total_amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount Paid (BDT)</Label>
              <Input
                type="number"
                min="0"
                value={formData.amount_paid || 0}
                onChange={(e) => setFormData({...formData, amount_paid: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Packaging & Bundling Elements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Box className="w-5 h-5 text-amber-600" />
            Packaging & Bundling Elements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Record packaging materials like stickers, boxes, jars, labels etc. associated with this order.
          </p>
          
          {/* Add Packaging Item */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <Label>Packaging Item</Label>
              <Select
                value={newPackaging.name}
                onValueChange={(value) => setNewPackaging({...newPackaging, name: value, unit: packagingOptions.find(o => o.name === value)?.units[0] || 'pc'})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {packagingOptions.map(opt => (
                    <SelectItem key={opt.name} value={opt.name}>
                      {opt.icon} {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={newPackaging.quantity}
                onChange={(e) => setNewPackaging({...newPackaging, quantity: parseFloat(e.target.value) || 1})}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Select
                value={newPackaging.unit}
                onValueChange={(value) => setNewPackaging({...newPackaging, unit: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPackagingUnits(newPackaging.name).map(u => (
                    <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit Cost (BDT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newPackaging.unit_cost}
                onChange={(e) => setNewPackaging({...newPackaging, unit_cost: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={addPackagingItem} variant="outline" className="w-full border-amber-400 text-amber-700 hover:bg-amber-100">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Packaging Items List */}
          {packagingItems.length > 0 && (
            <div className="space-y-2">
              {packagingItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {packagingOptions.find(o => o.name === item.name)?.icon || '📦'}
                    </span>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {(item.unit || 'pc').toUpperCase()} × ৳{item.unit_cost} = ৳{(item.quantity * item.unit_cost).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePackagingItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="p-3 bg-amber-100 rounded-lg text-right">
                <span className="font-semibold">Packaging Total: ৳{packagingTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Additional notes for this purchase order..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          {order ? 'Update Order' : 'Create Purchase Order'}
        </Button>
      </div>

      {/* New Product Form Dialog */}
      <Dialog open={showNewProductForm} onOpenChange={setShowNewProductForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Product to Inventory
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={newProduct.item_name}
                onChange={(e) => setNewProduct({...newProduct, item_name: e.target.value})}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Input
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                placeholder="e.g., Books, Electronics, Stationery"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Price (BDT) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={newProduct.purchase_price}
                  onChange={(e) => setNewProduct({...newProduct, purchase_price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Selling Price (BDT) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={newProduct.selling_price}
                  onChange={(e) => setNewProduct({...newProduct, selling_price: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={newProduct.current_stock}
                  onChange={(e) => setNewProduct({...newProduct, current_stock: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Minimum Stock Level</Label>
                <Input
                  type="number"
                  min="0"
                  value={newProduct.minimum_stock}
                  onChange={(e) => setNewProduct({...newProduct, minimum_stock: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div>
              <Label>Order Quantity</Label>
              <Input
                type="number"
                min="1"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowNewProductForm(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAddNewProduct} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create & Add to Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
};

// Main Purchase Orders Page
function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // CRITICAL: Permission-based access control
  const { hasPermission: canCreate } = usePermission('purchase_orders', 'can_create');
  const { hasPermission: canEdit } = usePermission('purchase_orders', 'can_edit');
  const { hasPermission: canApprove } = usePermission('purchase_orders', 'can_approve');

  // Fetch data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
  });

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
    queryFn: () => Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 1000),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Create purchase order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const order = await base44.entities.PurchaseOrder.create(orderData);

      // Update supplier stats
      const supplier = suppliers.find(s => s.id === orderData.supplier_id);
      if (supplier) {
        await base44.entities.Supplier.update(supplier.id, {
          total_orders: (supplier.total_orders || 0) + 1,
          total_value: (supplier.total_value || 0) + orderData.total_amount,
          last_order_date: orderData.order_date,
          current_balance: (supplier.current_balance || 0) + (orderData.amount_due || 0)
        });
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      queryClient.invalidateQueries(['suppliers']);
      toast.success('Purchase order created successfully!');
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

  // Receive order mutation
  const receiveOrderMutation = useMutation({
    mutationFn: async (order) => {
      // Update inventory quantities
      for (const item of order.order_items) {
        const inventoryItem = inventory.find(i => i.id === item.inventory_id);
        if (inventoryItem) {
          const newStock = inventoryItem.current_stock + item.quantity_ordered;
          await Inventory.update(item.inventory_id, {
            current_stock: newStock,
            last_purchase_date: new Date().toISOString().split('T')[0],
            last_purchase_quantity: item.quantity_ordered
          });

          // Record inventory movement
          await base44.entities.InventoryMovement.create({
            inventory_item_id: item.inventory_id,
            movement_type: 'in',
            quantity: item.quantity_ordered,
            reference_type: 'purchase',
            reference_id: order.id,
            reference_number: order.po_number,
            unit_cost: item.unit_price,
            total_value: item.total_price,
            performed_by: currentUser?.id || 'system',
            notes: `Purchase from ${order.supplier_name}`,
            movement_date: new Date().toISOString().split('T')[0],
            balance_after: newStock
          });
        }
      }

      // Update order status
      await base44.entities.PurchaseOrder.update(order.id, {
        order_status: 'received',
        actual_delivery_date: new Date().toISOString().split('T')[0]
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      queryClient.invalidateQueries(['inventory']);
      toast.success('Order received and inventory updated!');
    },
    onError: (error) => {
      toast.error('Failed to receive order: ' + error.message);
    },
  });

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
    if (confirm('Mark this order as received? This will update inventory quantities.')) {
      receiveOrderMutation.mutate(order);
    }
  };

  // Create supplier lookup map for real-time data
  const supplierMap = useMemo(() => {
    const map = {};
    suppliers.forEach(supplier => {
      map[supplier.id] = supplier;
    });
    return map;
  }, [suppliers]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = [...purchaseOrders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => {
        const currentSupplier = supplierMap[o.supplier_id];
        const supplierName = currentSupplier?.supplier_name || o.supplier_name;
        return o.po_number?.toLowerCase().includes(query) ||
               supplierName?.toLowerCase().includes(query);
      });
    }

    if (startDate) {
      filtered = filtered.filter(o => o.order_date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(o => o.order_date <= endDate);
    }

    return filtered;
  }, [purchaseOrders, statusFilter, searchQuery, startDate, endDate, supplierMap]);

  // Stats
  const stats = useMemo(() => {
    return {
      totalOrders: filteredOrders.length,
      totalValue: filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      pendingOrders: filteredOrders.filter(o => ['draft', 'pending', 'confirmed'].includes(o.order_status)).length,
      receivedOrders: filteredOrders.filter(o => o.order_status === 'received').length
    };
  }, [filteredOrders]);

  const getStatusBadge = (status) => {
    const config = {
      draft: { label: 'Draft', class: 'bg-gray-100 text-gray-800' },
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'Shipped', class: 'bg-purple-100 text-purple-800' },
      partially_received: { label: 'Partial', class: 'bg-orange-100 text-orange-800' },
      received: { label: 'Received', class: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800' },
    };
    const { label, class: className } = config[status] || config.draft;
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
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Inventory</span>
        <span>/</span>
        <span className="text-slate-900 font-medium">Purchase Orders</span>
      </div>

      {/* Premium Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Package className="w-6 h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Purchase Management</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">সাপ্লায়ার ম্যানেজমেন্ট ও ইনভেন্টরি সংগ্রহ ট্র্যাকিং</p>
          </div>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingOrder(null);
              setIsFormOpen(true);
            }}
            className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-sm h-10 px-4 rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Button>
        )}
      </div>

      {/* Stats Grid - Premium Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-[#D32F2F]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#111827]">{stats.totalOrders}</p>
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Orders</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#D32F2F]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#111827]">৳{stats.totalValue.toLocaleString()}</p>
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Investment</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#D32F2F]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-600">{stats.pendingOrders}</p>
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Pending</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#D32F2F]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{stats.receivedOrders}</p>
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Received</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by PO number or supplier..."
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
              placeholder="Start Date"
              className="w-full"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="w-full"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-white border border-slate-200 shadow-sm">
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
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
                        <div>
                          <p className="font-medium">
                            {supplierMap[order.supplier_id]?.supplier_name || order.supplier_name}
                          </p>
                          {supplierMap[order.supplier_id]?.supplier_phone && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              📞 {supplierMap[order.supplier_id].supplier_phone}
                            </p>
                          )}
                          <Badge variant="outline" className="text-xs mt-1">
                            {order.department === 'boibari' ? '📚 Boibari' : '🛒 Prodhan'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          {order.order_items && order.order_items.length > 0 ? (
                            <div className="text-sm">
                              <p className="font-medium text-slate-800 truncate">
                                {order.order_items[0].item_name.substring(0, 25)}
                                {order.order_items[0].item_name.length > 25 ? '...' : ''}
                                <span className="text-violet-600 font-semibold ml-1">(×{order.order_items[0].quantity_ordered})</span>
                              </p>
                              {order.order_items.length > 1 && (
                                <p className="text-xs text-slate-500 mt-0.5">+{order.order_items.length - 1} more</p>
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
                        <Badge className={
                          order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.payment_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.order_status)}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4}>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(order)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Order
                              </DropdownMenuItem>
                            )}
                            {canApprove && order.order_status !== 'received' && order.order_status !== 'cancelled' && (
                              <DropdownMenuItem onClick={() => handleReceive(order)}>
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                Mark as Received
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
              onSubmit={handleOrderSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingOrder(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

export default withPermission(PurchaseOrdersPage, 'purchase_orders', 'can_view');
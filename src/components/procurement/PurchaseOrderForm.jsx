import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Package, Building2, Truck, CheckCircle, Trash2,
  Image, CreditCard, Settings
} from 'lucide-react';
import SearchableProductSelect from '../common/SearchableProductSelect';
import CustomExpenseInputs from './CustomExpenseInputs';
import CustomExpenseFieldsManager from './CustomExpenseFieldsManager';
import { toast } from 'sonner';

export default function PurchaseOrderForm({ order, suppliers, inventory, currentUser, isAdmin, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(order || {
    supplier_id: '',
    supplier_name: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    department: 'prodhan_com_e_commerce',
    purchase_category: '',
    purchase_type: 'product',
    order_items: [],
    custom_expenses: [],
    custom_expenses_total: 0,
    subtotal: 0,
    tax_amount: 0,
    shipping_cost: 0,
    discount_amount: 0,
    courier_expense: 0,
    total_amount: 0,
    payment_method: 'bank_transfer',
    payment_status: 'pending',
    order_status: 'draft',
    invoice_images: [],
    invoice_number: '',
    notes: ''
  });

  const [selectedItem, setSelectedItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemUnit, setItemUnit] = useState('pc');
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [showFieldsManager, setShowFieldsManager] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [newProduct, setNewProduct] = useState({ item_name: '', category: '', purchase_price: 0, selling_price: 0, current_stock: 0, minimum_stock: 10 });

  const unitOptions = ['pc', 'kg', 'gm', 'litre', 'ml', 'roll', 'sheet', 'bundle', 'meter', 'jar', 'box'];

  const { data: registeredCategories = [] } = useQuery({
    queryKey: ['product-categories-form'],
    queryFn: () => base44.entities.ProductCategory.filter({ department: 'prodhan_com_e_commerce', is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  // Also derive categories from inventory to include unregistered ones like "Fashion"
  const categories = useMemo(() => {
    const catMap = new Map();
    registeredCategories.forEach(c => catMap.set(c.name?.toLowerCase(), c.name));
    // Add from inventory prop
    if (inventory?.length) {
      inventory.forEach(item => {
        if (item.category?.trim() && !catMap.has(item.category.trim().toLowerCase())) {
          catMap.set(item.category.trim().toLowerCase(), item.category.trim());
        }
      });
    }
    return [...catMap.values()].sort();
  }, [registeredCategories, inventory]);

  const handleInvoiceUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingInvoice(true);
    try {
      const results = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file })));
      const newUrls = results.map(r => r.file_url);
      setFormData(prev => ({ ...prev, invoice_images: [...(prev.invoice_images || []), ...newUrls], invoice_image_url: prev.invoice_image_url || newUrls[0] }));
      toast.success(`${files.length} image(s) uploaded!`);
    } catch (error) { toast.error('Upload failed: ' + error.message); }
    finally { setIsUploadingInvoice(false); }
  };

  const handleRemoveInvoiceImage = (index) => {
    setFormData(prev => {
      const imgs = [...(prev.invoice_images || [])];
      imgs.splice(index, 1);
      return { ...prev, invoice_images: imgs, invoice_image_url: imgs[0] || '' };
    });
  };

  const departmentFilteredInventory = useMemo(() => {
    if (!inventory?.length) return [];
    let filtered = inventory.filter(item => item.department === 'prodhan_com_e_commerce');
    if (formData.purchase_category) {
      filtered = filtered.filter(item => item.category === formData.purchase_category);
    }
    return filtered;
  }, [inventory, formData.purchase_category]);

  const departmentFilteredSuppliers = useMemo(() => {
    if (!suppliers?.length) return [];
    return suppliers.filter(s => s.department === 'prodhan_com_e_commerce' || s.department === 'both' || !s.department);
  }, [suppliers]);

  const handleSupplierChange = (supplierId) => {
    const supplier = departmentFilteredSuppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData(prev => ({ ...prev, supplier_id: supplierId, supplier_name: supplier.supplier_name }));
    }
  };

  const recalcTotal = (data) => {
    const customTotal = (data.custom_expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const total = (data.subtotal || 0) + (data.tax_amount || 0) + (data.shipping_cost || 0) + (data.courier_expense || 0) + customTotal - (data.discount_amount || 0);
    return { ...data, custom_expenses_total: customTotal, total_amount: total };
  };

  const handleAddItem = () => {
    if (!selectedItem || itemQuantity <= 0 || itemPrice <= 0) { toast.error('Select item, quantity and price'); return; }
    const inventoryItem = departmentFilteredInventory.find(i => i.id === selectedItem);
    if (!inventoryItem) { toast.error('Item not found'); return; }
    const totalPrice = itemQuantity * itemPrice;
    const newItem = { inventory_id: inventoryItem.id, item_name: inventoryItem.item_name, quantity_ordered: itemQuantity, quantity_received: 0, unit_price: itemPrice, total_price: totalPrice, unit: itemUnit, is_new_product: false };
    const newItems = [...formData.order_items, newItem];
    const newSubtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => recalcTotal({ ...prev, order_items: newItems, subtotal: newSubtotal }));
    setSelectedItem(''); setItemQuantity(1); setItemPrice(0); setItemUnit('pc');
  };

  const handleAddNewProduct = async () => {
    if (!newProduct.item_name || !newProduct.category) { toast.error('Fill product name and category'); return; }
    try {
      const created = await base44.entities.Inventory.create({ ...newProduct, department: 'prodhan_com_e_commerce', status: 'active' });
      const totalPrice = itemQuantity * newProduct.purchase_price;
      const newItem = { inventory_id: created.id, item_name: created.item_name, quantity_ordered: itemQuantity, quantity_received: 0, unit_price: newProduct.purchase_price, total_price: totalPrice, unit: itemUnit, is_new_product: true };
      const newItems = [...formData.order_items, newItem];
      const newSubtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
      setFormData(prev => recalcTotal({ ...prev, order_items: newItems, subtotal: newSubtotal }));
      setShowNewProductForm(false);
      setNewProduct({ item_name: '', category: '', purchase_price: 0, selling_price: 0, current_stock: 0, minimum_stock: 10 });
      toast.success('Product created and added!');
    } catch (error) { toast.error('Failed: ' + error.message); }
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.order_items.filter((_, i) => i !== index);
    const newSubtotal = newItems.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => recalcTotal({ ...prev, order_items: newItems, subtotal: newSubtotal }));
  };

  const updateTotals = (field, value) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => recalcTotal({ ...prev, [field]: numValue }));
  };

  const handleCustomExpensesChange = (expenses) => {
    setFormData(prev => recalcTotal({ ...prev, custom_expenses: expenses }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.supplier_id) { toast.error('Select a supplier'); return; }
    if (formData.order_items.length === 0) { toast.error('Add at least one item'); return; }
    const orderData = {
      ...formData,
      po_number: order?.po_number || `PO-${Date.now()}`,
      created_by_id: currentUser?.id,
      created_by_name: currentUser?.display_name || currentUser?.full_name,
      amount_due: formData.total_amount - (formData.amount_paid || 0),
      order_status: order ? formData.order_status : 'pending_approval',
      approval_status: order ? formData.approval_status : 'pending'
    };
    onSubmit(orderData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      {/* Invoice Upload */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-blue-700"><Image className="w-5 h-5" />Invoice Upload</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Invoice Number</Label><Input value={formData.invoice_number} onChange={(e) => setFormData({...formData, invoice_number: e.target.value})} placeholder="Supplier invoice #" /></div>
            <div>
              <Label>Invoice Images *</Label>
              <Input type="file" accept="image/*" multiple onChange={handleInvoiceUpload} disabled={isUploadingInvoice} />
              {isUploadingInvoice && <span className="text-sm text-muted-foreground animate-pulse">Uploading...</span>}
            </div>
          </div>
          {formData.invoice_images?.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {formData.invoice_images.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img src={url} alt={`Invoice ${idx+1}`} className="h-24 w-auto rounded border cursor-pointer" onClick={() => window.open(url, '_blank')} />
                  <button type="button" onClick={() => handleRemoveInvoiceImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">×</button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PO Details with Category */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5" />Purchase Order Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={formData.purchase_category || ''} onValueChange={(v) => setFormData({...formData, purchase_category: v})}>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purchase Type</Label>
              <Select value={formData.purchase_type} onValueChange={(v) => setFormData({...formData, purchase_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Finished Product</SelectItem>
                  <SelectItem value="raw_material">Raw Material</SelectItem>
                  <SelectItem value="packaging">Packaging Material</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier *</Label>
              <Select value={formData.supplier_id} onValueChange={handleSupplierChange}>
                <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  {departmentFilteredSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Order Date *</Label><Input type="date" value={formData.order_date} onChange={(e) => setFormData({...formData, order_date: e.target.value})} required /></div>
            <div><Label>Expected Delivery</Label><Input type="date" value={formData.expected_delivery_date} onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2"><Package className="w-5 h-5" />Order Items {formData.purchase_category && <Badge variant="outline">{formData.purchase_category}</Badge>}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowNewProductForm(true)} className="gap-1"><Plus className="w-4 h-4" />New Product</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg border">
            <div className="md:col-span-2">
              <Label>Select Product</Label>
              <SearchableProductSelect
                inventory={departmentFilteredInventory}
                value={selectedItem}
                onValueChange={(value) => {
                  setSelectedItem(value);
                  const item = departmentFilteredInventory.find(i => i.id === value);
                  if (item) { setItemPrice(item.purchase_price || 0); setItemUnit(item.weight_unit === 'kg' ? 'kg' : 'pc'); }
                }}
                placeholder="Search product..."
              />
            </div>
            <div><Label>Quantity</Label><Input type="number" min="0.01" step="0.01" value={itemQuantity} onChange={(e) => setItemQuantity(parseFloat(e.target.value) || 1)} /></div>
            <div>
              <Label>Unit</Label>
              <Select value={itemUnit} onValueChange={setItemUnit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{unitOptions.map(u => <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Unit Price</Label><Input type="number" min="0" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)} /></div>
            <div className="flex items-end"><Button type="button" onClick={handleAddItem} className="w-full"><Plus className="w-4 h-4 mr-1" />Add</Button></div>
          </div>

          {formData.order_items.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-center">Unit</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-center w-16">×</TableHead></TableRow></TableHeader>
              <TableBody>
                {formData.order_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell><span>{item.item_name}</span>{item.is_new_product && <Badge className="ml-2 bg-green-100 text-green-800 text-xs">New</Badge>}</TableCell>
                    <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">{(item.unit||'pc').toUpperCase()}</Badge></TableCell>
                    <TableCell className="text-right">৳{item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">৳{item.total_price.toLocaleString()}</TableCell>
                    <TableCell className="text-center"><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No items added</p></div>
          )}
        </CardContent>
      </Card>

      {/* Custom Expense Fields (Category-specific) */}
      {formData.purchase_category && (
        <div className="space-y-3">
          <CustomExpenseInputs
            category={formData.purchase_category}
            expenses={formData.custom_expenses || []}
            onChange={handleCustomExpensesChange}
          />
          {isAdmin && (
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowFieldsManager(!showFieldsManager)} className="text-indigo-600 gap-1">
                <Settings className="w-3.5 h-3.5" />{showFieldsManager ? 'Hide' : 'Manage'} {formData.purchase_category} Fields
              </Button>
              {showFieldsManager && <CustomExpenseFieldsManager category={formData.purchase_category} />}
            </div>
          )}
        </div>
      )}

      {/* Pricing Summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" />Pricing & Payment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label>Subtotal</Label><Input type="number" value={formData.subtotal} disabled className="bg-gray-50" /></div>
            <div><Label>Tax (৳)</Label><Input type="number" min="0" value={formData.tax_amount} onChange={(e) => updateTotals('tax_amount', e.target.value)} /></div>
            <div><Label>Shipping (৳)</Label><Input type="number" min="0" value={formData.shipping_cost} onChange={(e) => updateTotals('shipping_cost', e.target.value)} /></div>
            <div><Label>Discount (৳)</Label><Input type="number" min="0" value={formData.discount_amount} onChange={(e) => updateTotals('discount_amount', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Label className="flex items-center gap-2 text-amber-700"><Truck className="w-4 h-4" />Courier / Comm. Expense</Label>
              <Input type="number" min="0" value={formData.courier_expense || 0} onChange={(e) => updateTotals('courier_expense', e.target.value)} className="mt-2" />
            </div>
          </div>

          {/* Grand Total */}
          <div className="bg-gradient-to-br from-violet-50 to-pink-50 p-6 rounded-xl space-y-2">
            <div className="flex justify-between text-sm"><span>Product Subtotal:</span><span>৳{formData.subtotal.toLocaleString()}</span></div>
            {(formData.custom_expenses_total || 0) > 0 && (
              <div className="flex justify-between text-sm"><span className="text-purple-700">Production Expenses:</span><span className="text-purple-700 font-medium">৳{formData.custom_expenses_total.toLocaleString()}</span></div>
            )}
            {(formData.tax_amount || 0) > 0 && <div className="flex justify-between text-sm"><span>Tax:</span><span>৳{formData.tax_amount.toLocaleString()}</span></div>}
            {(formData.shipping_cost || 0) > 0 && <div className="flex justify-between text-sm"><span>Shipping:</span><span>৳{formData.shipping_cost.toLocaleString()}</span></div>}
            {(formData.courier_expense || 0) > 0 && <div className="flex justify-between text-sm"><span>Courier:</span><span className="text-amber-600">৳{formData.courier_expense.toLocaleString()}</span></div>}
            {(formData.discount_amount || 0) > 0 && <div className="flex justify-between text-sm"><span>Discount:</span><span className="text-red-600">-৳{formData.discount_amount.toLocaleString()}</span></div>}
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold"><span>Grand Total:</span><span className="text-violet-600">৳{formData.total_amount.toLocaleString()}</span></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Payment Status</Label>
              <Select value={formData.payment_status} onValueChange={(v) => setFormData({...formData, payment_status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent></Select>
            </div>
            <div><Label>Amount Paid (৳)</Label><Input type="number" min="0" value={formData.amount_paid || 0} onChange={(e) => setFormData({...formData, amount_paid: parseFloat(e.target.value) || 0})} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
        <CardContent><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." rows={3} /></CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-violet-600 hover:bg-violet-700"><CheckCircle className="w-4 h-4 mr-2" />{order ? 'Update Order' : 'Submit for Approval'}</Button>
      </div>

      {/* New Product Dialog */}
      <Dialog open={showNewProductForm} onOpenChange={setShowNewProductForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" />Add New Product</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Product Name *</Label><Input value={newProduct.item_name} onChange={(e) => setNewProduct({...newProduct, item_name: e.target.value})} /></div>
            <div><Label>Category *</Label><Input value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} placeholder="e.g., Food, Fashion" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Purchase Price</Label><Input type="number" min="0" value={newProduct.purchase_price} onChange={(e) => setNewProduct({...newProduct, purchase_price: parseFloat(e.target.value) || 0})} /></div>
              <div><Label>Selling Price</Label><Input type="number" min="0" value={newProduct.selling_price} onChange={(e) => setNewProduct({...newProduct, selling_price: parseFloat(e.target.value) || 0})} /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowNewProductForm(false)}>Cancel</Button>
              <Button type="button" onClick={handleAddNewProduct} className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" />Create & Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
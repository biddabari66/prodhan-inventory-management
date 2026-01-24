import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  FileText, Download, Search, Filter, MoreVertical, CreditCard, Box,
  Upload, Image, ShieldCheck, ShieldX, User
} from 'lucide-react';
import SearchableProductSelect from '../components/common/SearchableProductSelect';
import PackagingExpenseForm from '../components/packaging/PackagingExpenseForm';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { withPermission, usePermission } from '../components/common/PermissionGuard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    invoice_image_url: '',
    invoice_number: '',
    notes: ''
  });

  const [selectedItem, setSelectedItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemUnit, setItemUnit] = useState('pc');
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [newProduct, setNewProduct] = useState({
    item_name: '',
    category: '',
    purchase_price: 0,
    selling_price: 0,
    current_stock: 0,
    minimum_stock: 10
  });

  const unitOptions = ['pc', 'kg', 'gm', 'litre', 'ml', 'roll', 'sheet', 'bundle', 'meter', 'jar', 'box'];

  // Handle invoice image upload
  const handleInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInvoice(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, invoice_image_url: file_url }));
      toast.success('Invoice image uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload invoice: ' + error.message);
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  // Filter inventory for prodhan_com_e_commerce department
  const departmentFilteredInventory = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];
    return inventory.filter(item => item.department === 'prodhan_com_e_commerce');
  }, [inventory]);

  // Filter suppliers for prodhan_com_e_commerce department
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
      const createdProduct = await base44.entities.Inventory.create({
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
        unit: itemUnit,
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
      order_status: order ? formData.order_status : 'pending_approval',
      approval_status: order ? formData.approval_status : 'pending'
    };

    onSubmit(orderData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      {/* Invoice Upload Section - NEW */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
            <Image className="w-5 h-5" />
            Invoice Image Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                placeholder="Enter supplier invoice number"
              />
            </div>
            <div>
              <Label>Invoice Image *</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleInvoiceUpload}
                  disabled={isUploadingInvoice}
                  className="flex-1"
                />
                {isUploadingInvoice && (
                  <span className="text-sm text-muted-foreground animate-pulse">Uploading...</span>
                )}
              </div>
            </div>
          </div>
          {formData.invoice_image_url && (
            <div className="mt-3 p-3 bg-white rounded-lg border">
              <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Invoice uploaded successfully
              </p>
              <img 
                src={formData.invoice_image_url} 
                alt="Invoice" 
                className="max-h-48 rounded border cursor-pointer hover:opacity-90"
                onClick={() => window.open(formData.invoice_image_url, '_blank')}
              />
            </div>
          )}
        </CardContent>
      </Card>

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
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <Badge className="bg-amber-500 text-white">⏳ Pending Admin Approval</Badge>
              </div>
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
          {order ? 'Update Order' : 'Submit for Approval'}
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
                placeholder="e.g., Food, Spices, Seeds"
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
  const [viewOrderDialog, setViewOrderDialog] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Permission-based access control
  const { hasPermission: canCreate } = usePermission('purchase_orders', 'can_create');
  const { hasPermission: canEdit } = usePermission('purchase_orders', 'can_edit');
  const { hasPermission: canApprove } = usePermission('purchase_orders', 'can_approve');

  // Fetch data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.job_role === 'admin' || currentUser?.role === 'admin';

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
    queryFn: () => base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 1000),
    staleTime: 5 * 60 * 1000,
  });

  // Create purchase order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const order = await base44.entities.PurchaseOrder.create(orderData);

      // Create notification for admin
      await base44.entities.Notification.create({
        user_id: 'admin',
        title: '🛒 New Purchase Order Pending Approval',
        message: `PO ${orderData.po_number} worth ৳${orderData.total_amount?.toLocaleString()} from ${orderData.supplier_name} submitted by ${orderData.created_by_name}`,
        category: 'inventory',
        priority: 'high',
        is_actionable: true,
        action_text: 'Review PO',
        action_url: `/PurchaseOrders?highlight=${order.id}`
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Purchase order submitted for approval!');
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

  // Approve order mutation
  const approveOrderMutation = useMutation({
    mutationFn: async (order) => {
      await base44.entities.PurchaseOrder.update(order.id, {
        order_status: 'approved',
        approval_status: 'approved',
        approved_by_id: currentUser?.id,
        approved_by_name: currentUser?.full_name,
        approval_date: new Date().toISOString()
      });

      // Notify creator
      if (order.created_by_id) {
        await base44.entities.Notification.create({
          user_id: order.created_by_id,
          title: '✅ Purchase Order Approved',
          message: `Your PO ${order.po_number} has been approved by ${currentUser?.full_name}`,
          category: 'inventory',
          priority: 'medium',
          action_text: 'View PO',
          action_url: `/PurchaseOrders?highlight=${order.id}`
        });
      }

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'update',
        entity_type: 'PurchaseOrder',
        entity_id: order.id,
        module: 'purchase_orders',
        description: `Approved PO ${order.po_number} worth ৳${order.total_amount?.toLocaleString()}`,
        new_values: { order_status: 'approved', approval_status: 'approved' },
        timestamp: new Date().toISOString()
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Purchase order approved!');
      setApprovalDialog(null);
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    },
  });

  // Reject order mutation
  const rejectOrderMutation = useMutation({
    mutationFn: async ({ order, reason }) => {
      await base44.entities.PurchaseOrder.update(order.id, {
        order_status: 'rejected',
        approval_status: 'rejected',
        rejection_reason: reason,
        approved_by_id: currentUser?.id,
        approved_by_name: currentUser?.full_name,
        approval_date: new Date().toISOString()
      });

      // Notify creator
      if (order.created_by_id) {
        await base44.entities.Notification.create({
          user_id: order.created_by_id,
          title: '❌ Purchase Order Rejected',
          message: `Your PO ${order.po_number} has been rejected. Reason: ${reason}`,
          category: 'inventory',
          priority: 'high',
          action_text: 'View Details',
          action_url: `/PurchaseOrders?highlight=${order.id}`
        });
      }

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'update',
        entity_type: 'PurchaseOrder',
        entity_id: order.id,
        module: 'purchase_orders',
        description: `Rejected PO ${order.po_number}. Reason: ${reason}`,
        new_values: { order_status: 'rejected', rejection_reason: reason },
        timestamp: new Date().toISOString()
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Purchase order rejected');
      setApprovalDialog(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error('Failed to reject: ' + error.message);
    },
  });

  // Receive order mutation
  const receiveOrderMutation = useMutation({
    mutationFn: async (order) => {
      // Update order status with receiver info
      await base44.entities.PurchaseOrder.update(order.id, {
        order_status: 'received',
        actual_delivery_date: new Date().toISOString().split('T')[0],
        received_by_id: currentUser?.id,
        received_by_name: currentUser?.full_name,
        received_date: new Date().toISOString()
      });

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: currentUser?.id,
        user_name: currentUser?.full_name,
        action: 'update',
        entity_type: 'PurchaseOrder',
        entity_id: order.id,
        module: 'purchase_orders',
        description: `Received PO ${order.po_number} from ${order.supplier_name}`,
        new_values: { order_status: 'received', received_by_name: currentUser?.full_name },
        timestamp: new Date().toISOString()
      });

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchaseOrders']);
      toast.success('Order marked as received! Now send to Production House.');
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
    if (confirm('Mark this order as received? You can then send it to Production House.')) {
      receiveOrderMutation.mutate(order);
    }
  };

  // Create supplier lookup map
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
      if (statusFilter === 'pending_approval') {
        filtered = filtered.filter(o => o.approval_status === 'pending' || o.order_status === 'pending_approval');
      } else {
        filtered = filtered.filter(o => o.order_status === statusFilter);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => {
        const currentSupplier = supplierMap[o.supplier_id];
        const supplierName = currentSupplier?.supplier_name || o.supplier_name;
        return o.po_number?.toLowerCase().includes(query) ||
               supplierName?.toLowerCase().includes(query) ||
               o.created_by_name?.toLowerCase().includes(query);
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
      pendingApproval: purchaseOrders.filter(o => o.approval_status === 'pending' || o.order_status === 'pending_approval').length,
      receivedOrders: filteredOrders.filter(o => o.order_status === 'received').length
    };
  }, [filteredOrders, purchaseOrders]);

  const getStatusBadge = (order) => {
    if (order.approval_status === 'rejected' || order.order_status === 'rejected') {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    }
    if (order.approval_status === 'pending' || order.order_status === 'pending_approval') {
      return <Badge className="bg-amber-100 text-amber-800">Pending Approval</Badge>;
    }
    const config = {
      draft: { label: 'Draft', class: 'bg-gray-100 text-gray-800' },
      approved: { label: 'Approved', class: 'bg-blue-100 text-blue-800' },
      confirmed: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'Shipped', class: 'bg-purple-100 text-purple-800' },
      received: { label: 'Received', class: 'bg-green-100 text-green-800' },
      in_production: { label: 'In Production', class: 'bg-indigo-100 text-indigo-800' },
      completed: { label: 'Completed', class: 'bg-emerald-100 text-emerald-800' },
      cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800' },
    };
    const { label, class: className } = config[order.order_status] || config.draft;
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

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Package className="w-6 h-6 text-[#D32F2F]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Purchase Management</h1>
              <p className="text-sm text-[#6B7280] mt-0.5">Create orders with invoice upload & admin approval</p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5 text-[#D32F2F]" />
              </div>
              <p className="text-3xl font-bold text-[#111827]">{stats.totalOrders}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Total Orders</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5 text-[#D32F2F]" />
              </div>
              <p className="text-3xl font-bold text-[#111827]">৳{stats.totalValue.toLocaleString()}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Total Value</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm rounded-xl border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingApproval}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Pending Approval</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.receivedOrders}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase">Received</p>
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
                    placeholder="Search PO, supplier, or creator..."
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
                className="w-full"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">⏳ Pending Approval</SelectItem>
                  <SelectItem value="approved">✅ Approved</SelectItem>
                  <SelectItem value="received">📦 Received</SelectItem>
                  <SelectItem value="in_production">🏭 In Production</SelectItem>
                  <SelectItem value="completed">✔️ Completed</SelectItem>
                  <SelectItem value="rejected">❌ Rejected</SelectItem>
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
                    <TableHead>Created By</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                          <p className="font-medium">
                            {supplierMap[order.supplier_id]?.supplier_name || order.supplier_name}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{order.created_by_name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.order_items?.length || 0} items</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ৳{order.total_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {order.invoice_image_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(order.invoice_image_url, '_blank')}
                              className="text-blue-600"
                            >
                              <Image className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">No invoice</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(order)}</TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewOrderDialog(order)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {canEdit && order.approval_status !== 'approved' && (
                                <DropdownMenuItem onClick={() => handleEdit(order)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (order.approval_status === 'pending' || order.order_status === 'pending_approval') && (
                                <>
                                  <DropdownMenuItem onClick={() => setApprovalDialog({ order, action: 'approve' })} className="text-green-600">
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setApprovalDialog({ order, action: 'reject' })} className="text-red-600">
                                    <ShieldX className="w-4 h-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canApprove && order.order_status === 'approved' && (
                                <DropdownMenuItem onClick={() => handleReceive(order)} className="text-green-600">
                                  <CheckCircle className="w-4 h-4 mr-2" />
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

        {/* View Order Dialog */}
        <Dialog open={!!viewOrderDialog} onOpenChange={() => setViewOrderDialog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                PO Details: {viewOrderDialog?.po_number}
              </DialogTitle>
            </DialogHeader>
            {viewOrderDialog && (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Supplier</p>
                    <p className="font-semibold">{viewOrderDialog.supplier_name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Order Date</p>
                    <p className="font-semibold">{format(new Date(viewOrderDialog.order_date), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Total Amount</p>
                    <p className="font-bold text-violet-600">৳{viewOrderDialog.total_amount?.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600">Created By</p>
                    <p className="font-semibold">{viewOrderDialog.created_by_name || 'N/A'}</p>
                  </div>
                  {viewOrderDialog.received_by_name && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600">Received By</p>
                      <p className="font-semibold">{viewOrderDialog.received_by_name}</p>
                    </div>
                  )}
                  {viewOrderDialog.approved_by_name && (
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xs text-emerald-600">Approved By</p>
                      <p className="font-semibold">{viewOrderDialog.approved_by_name}</p>
                    </div>
                  )}
                </div>

                {/* Invoice Image */}
                {viewOrderDialog.invoice_image_url && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Image className="w-4 h-4" /> Invoice Image
                      {viewOrderDialog.invoice_number && <span className="text-slate-500">#{viewOrderDialog.invoice_number}</span>}
                    </p>
                    <img 
                      src={viewOrderDialog.invoice_image_url} 
                      alt="Invoice" 
                      className="max-h-64 rounded border cursor-pointer hover:opacity-90"
                      onClick={() => window.open(viewOrderDialog.invoice_image_url, '_blank')}
                    />
                  </div>
                )}

                {/* Rejection reason */}
                {viewOrderDialog.rejection_reason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-700 mb-1">❌ Rejection Reason:</p>
                    <p className="text-red-600">{viewOrderDialog.rejection_reason}</p>
                  </div>
                )}

                {/* Items Table */}
                <div>
                  <h4 className="font-semibold mb-2">Order Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-center">Unit</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewOrderDialog.order_items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{(item.unit || 'pc').toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="text-right">৳{item.unit_price?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">৳{item.total_price?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {viewOrderDialog.notes && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm">{viewOrderDialog.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <AlertDialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {approvalDialog?.action === 'approve' ? '✅ Approve Purchase Order' : '❌ Reject Purchase Order'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {approvalDialog?.action === 'approve' ? (
                  <>
                    Are you sure you want to approve <strong>{approvalDialog?.order?.po_number}</strong> worth ৳{approvalDialog?.order?.total_amount?.toLocaleString()}?
                  </>
                ) : (
                  <div className="space-y-3">
                    <p>Please provide a reason for rejecting <strong>{approvalDialog?.order?.po_number}</strong>:</p>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter rejection reason..."
                      rows={3}
                    />
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRejectionReason('')}>Cancel</AlertDialogCancel>
              {approvalDialog?.action === 'approve' ? (
                <AlertDialogAction 
                  onClick={() => approveOrderMutation.mutate(approvalDialog.order)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </AlertDialogAction>
              ) : (
                <AlertDialogAction 
                  onClick={() => {
                    if (!rejectionReason.trim()) {
                      toast.error('Please provide a rejection reason');
                      return;
                    }
                    rejectOrderMutation.mutate({ order: approvalDialog.order, reason: rejectionReason });
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reject
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default withPermission(PurchaseOrdersPage, 'purchase_orders', 'can_view');
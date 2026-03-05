import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Box, Plus, Trash2, CheckCircle, Package, Image, Upload, Truck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SearchableProductSelect from '../common/SearchableProductSelect';
import { toast } from 'sonner';

const packagingTypes = [
  { name: 'Sticker', icon: '🏷️' },
  { name: 'Packaging Box', icon: '📦' },
  { name: 'Jar/Container', icon: '🫙' },
  { name: 'Plastic Wrap', icon: '🎁' },
  { name: 'Bubble Wrap', icon: '🔵' },
  { name: 'Label', icon: '🪧' },
  { name: 'Tape', icon: '📎' },
  { name: 'Bag', icon: '👜' },
  { name: 'Carton', icon: '📤' },
  { name: 'Foam', icon: '🧽' },
  { name: 'Pouch', icon: '🛍️' },
  { name: 'Shrink Wrap', icon: '🔄' },
  { name: 'Sealing Material', icon: '🔒' },
  { name: 'Packing Paper', icon: '📄' },
  { name: 'String/Rope', icon: '🧵' },
  { name: 'Rubber Band', icon: '⭕' },
  { name: 'Courier Bag', icon: '📬' },
  { name: 'Air Pillow', icon: '💨' },
  { name: 'Custom Printing', icon: '🖨️' },
  { name: 'Other', icon: '📋' }
];

// Expense types for non-product expenses
const expenseTypes = [
  { name: 'Shipping/Freight', icon: '🚚' },
  { name: 'Labor/Handling', icon: '👷' },
  { name: 'Equipment Rental', icon: '🔧' },
  { name: 'Storage', icon: '🏭' },
  { name: 'Utilities', icon: '💡' },
  { name: 'Transportation', icon: '🚗' },
  { name: 'Customs/Duties', icon: '🏛️' },
  { name: 'Insurance', icon: '🛡️' },
  { name: 'Miscellaneous', icon: '📝' }
];

const unitOptions = ['pc', 'kg', 'gm', 'litre', 'ml', 'roll', 'sheet', 'bundle', 'meter', 'box'];

export default function PackagingExpenseForm({ expense, inventory, currentUser, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(expense || {
    expense_date: new Date().toISOString().split('T')[0],
    department: 'prodhan_com_e_commerce',
    items: [],
    total_amount: 0,
    courier_expense: 0,
    invoice_images: [],
    invoice_number: '',
    notes: ''
  });

  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  // Item being added
  const [selectedProduct, setSelectedProduct] = useState('');
  const [packagingType, setPackagingType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pc');
  const [amount, setAmount] = useState(0);
  
  // Other expense (non-product related)
  const [isOtherExpense, setIsOtherExpense] = useState(false);
  const [otherExpenseType, setOtherExpenseType] = useState('');
  const [otherExpenseDescription, setOtherExpenseDescription] = useState('');

  // Handle multiple invoice image uploads
  const handleInvoiceUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingInvoice(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      
      setFormData(prev => ({ 
        ...prev, 
        invoice_images: [...(prev.invoice_images || []), ...newUrls]
      }));
      toast.success(`${files.length} invoice image(s) uploaded successfully!`);
    } catch (error) {
      toast.error('Failed to upload invoice: ' + error.message);
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const handleRemoveInvoiceImage = (index) => {
    setFormData(prev => {
      const newImages = [...(prev.invoice_images || [])];
      newImages.splice(index, 1);
      return { ...prev, invoice_images: newImages };
    });
  };

  // Filter inventory for department
  const departmentInventory = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];
    return inventory.filter(item => item.department === 'prodhan_com_e_commerce');
  }, [inventory]);

  const handleAddItem = () => {
    if (isOtherExpense) {
      // Handle non-product expense
      if (!otherExpenseType) {
        toast.error('Please select an expense type');
        return;
      }
      if (amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      const newItem = {
        id: Date.now(),
        inventory_id: null,
        product_name: otherExpenseDescription || otherExpenseType,
        packaging_type: otherExpenseType,
        quantity: 1,
        unit: 'service',
        amount: amount,
        is_other_expense: true
      };

      const newItems = [...formData.items, newItem];
      const itemsTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const newTotal = itemsTotal + (formData.courier_expense || 0);

      setFormData(prev => ({
        ...prev,
        items: newItems,
        total_amount: newTotal
      }));

      // Reset fields
      setOtherExpenseType('');
      setOtherExpenseDescription('');
      setAmount(0);
      return;
    }

    // Handle product packaging expense
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    if (!packagingType) {
      toast.error('Please select a packaging type');
      return;
    }
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const product = departmentInventory.find(i => i.id === selectedProduct);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    const newItem = {
      id: Date.now(),
      inventory_id: product.id,
      product_name: product.item_name,
      packaging_type: packagingType,
      quantity: quantity,
      unit: unit,
      amount: amount,
      is_other_expense: false
    };

    const newItems = [...formData.items, newItem];
    const itemsTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const newTotal = itemsTotal + (formData.courier_expense || 0);

    setFormData(prev => ({
      ...prev,
      items: newItems,
      total_amount: newTotal
    }));

    // Reset fields
    setSelectedProduct('');
    setPackagingType('');
    setQuantity(1);
    setUnit('pc');
    setAmount(0);
  };

  const handleRemoveItem = (itemId) => {
    const newItems = formData.items.filter(item => item.id !== itemId);
    const itemsTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const newTotal = itemsTotal + (formData.courier_expense || 0);

    setFormData(prev => ({
      ...prev,
      items: newItems,
      total_amount: newTotal
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error('Please add at least one packaging item or expense');
      return;
    }

    // Recalculate total to ensure accuracy
    const itemsTotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const finalTotal = itemsTotal + (formData.courier_expense || 0);

    const expenseData = {
      ...formData,
      total_amount: finalTotal,
      expense_number: expense?.expense_number || `PKG-${Date.now()}`,
      created_by_id: currentUser?.id,
      created_by_name: currentUser?.display_name || currentUser?.full_name,
      status: expense?.status || 'pending_approval',
      expense_type: 'packaging'
    };

    onSubmit(expenseData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      {/* Invoice Upload Section */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
            <Image className="w-5 h-5" />
            Invoice Image Upload (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={formData.invoice_number || ''}
                onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                placeholder="Enter supplier invoice number"
              />
            </div>
            <div>
              <Label>Invoice Images (Multiple)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleInvoiceUpload}
                  disabled={isUploadingInvoice}
                  className="flex-1"
                />
                {isUploadingInvoice && (
                  <span className="text-sm text-muted-foreground animate-pulse">Uploading...</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">You can select multiple images at once</p>
            </div>
          </div>
          {formData.invoice_images?.length > 0 && (
            <div className="mt-3 p-3 bg-white rounded-lg border">
              <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {formData.invoice_images.length} invoice image(s) uploaded
              </p>
              <div className="flex flex-wrap gap-3">
                {formData.invoice_images.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={url} 
                      alt={`Invoice ${idx + 1}`} 
                      className="h-32 w-auto rounded border cursor-pointer hover:opacity-90 object-cover"
                      onClick={() => window.open(url, '_blank')}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInvoiceImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <Badge className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px]">
                      #{idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Box className="w-5 h-5 text-amber-600" />
            Packaging Expense Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Expense Date *</Label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>Department</Label>
              <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <Badge className="bg-purple-600 text-white">🛒 Prodhan.com E-commerce</Badge>
              </div>
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <Badge className="bg-amber-500 text-white">⏳ Pending Admin Approval</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Packaging Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add Packaging Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select products and record their packaging expenses (stickers, boxes, jars, labels, etc.)
          </p>

          {/* Toggle between Product Expense, General Packaging and Other Expense */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              type="button"
              variant={!isOtherExpense && !isDistributedExpense ? "default" : "outline"}
              onClick={() => { setIsOtherExpense(false); setIsDistributedExpense(false); }}
              className={!isOtherExpense && !isDistributedExpense ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              <Package className="w-4 h-4 mr-2" />
              Product Packaging
            </Button>
            <Button
              type="button"
              variant={isDistributedExpense ? "default" : "outline"}
              onClick={() => { setIsOtherExpense(false); setIsDistributedExpense(true); }}
              className={isDistributedExpense ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Box className="w-4 h-4 mr-2" />
              General (All Products)
            </Button>
            <Button
              type="button"
              variant={isOtherExpense ? "default" : "outline"}
              onClick={() => { setIsOtherExpense(true); setIsDistributedExpense(false); }}
              className={isOtherExpense ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <Truck className="w-4 h-4 mr-2" />
              Other Expense
            </Button>
          </div>

          {/* Add Item Form */}
          <div className={`p-4 rounded-lg border space-y-4 ${isOtherExpense ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
            {!isOtherExpense ? (
              <>
                {/* Product Packaging Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Select Product *</Label>
                    <SearchableProductSelect
                      inventory={departmentInventory}
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                      placeholder="Search and select product..."
                    />
                  </div>
                  <div>
                    <Label>Packaging Type *</Label>
                    <Select value={packagingType} onValueChange={setPackagingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select packaging type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {packagingTypes.map(opt => (
                          <SelectItem key={opt.name} value={opt.name}>
                            {opt.icon} {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={unit} onValueChange={setUnit}>
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
                    <Label>Amount (BDT) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="Enter total cost"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      type="button" 
                      onClick={handleAddItem} 
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Other Expense Form (No Product Required) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Expense Type *</Label>
                    <Select value={otherExpenseType} onValueChange={setOtherExpenseType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select expense type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseTypes.map(opt => (
                          <SelectItem key={opt.name} value={opt.name}>
                            {opt.icon} {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Input
                      value={otherExpenseDescription}
                      onChange={(e) => setOtherExpenseDescription(e.target.value)}
                      placeholder="Brief description of expense..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Amount (BDT) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="Enter expense amount"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      type="button" 
                      onClick={handleAddItem} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Expense
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-blue-600">💡 Use this for expenses not tied to specific products (shipping, labor, etc.)</p>
              </>
            )}
          </div>

          {/* Items List */}
          {formData.items.length > 0 ? (
            <div className="space-y-2">
              {formData.items.map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-4 bg-white rounded-lg border ${item.is_other_expense ? 'border-blue-200' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {item.is_other_expense 
                          ? expenseTypes.find(t => t.name === item.packaging_type)?.icon || '📝'
                          : packagingTypes.find(t => t.name === item.packaging_type)?.icon || '📦'}
                      </span>
                      <span className="font-semibold">{item.product_name}</span>
                      <Badge variant="outline" className={`text-xs ${item.is_other_expense ? 'bg-blue-50 text-blue-700' : ''}`}>
                        {item.is_other_expense ? 'Other Expense' : item.packaging_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.is_other_expense ? item.packaging_type : `${item.quantity} ${item.unit.toUpperCase()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-amber-700">৳{item.amount.toLocaleString()}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Courier/Communication Expense */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="flex items-center gap-2 text-blue-700 mb-2">
                  <Truck className="w-4 h-4" />
                  Courier / Communication Expense (Optional)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.courier_expense || 0}
                  onChange={(e) => {
                    const courierVal = parseFloat(e.target.value) || 0;
                    const itemsTotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
                    setFormData(prev => ({
                      ...prev,
                      courier_expense: courierVal,
                      total_amount: itemsTotal + courierVal
                    }));
                  }}
                  placeholder="Enter courier/communication cost"
                  className="max-w-xs"
                />
                <p className="text-xs text-blue-600 mt-1">Add any courier charges, phone charges, or communication costs</p>
              </div>

              {/* Total */}
              <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Items Total:</span>
                    <span>৳{formData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}</span>
                  </div>
                  {(formData.courier_expense || 0) > 0 && (
                    <div className="flex justify-between text-sm text-blue-700">
                      <span>Courier/Comm:</span>
                      <span>৳{(formData.courier_expense || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Total Expense:</span>
                    <span className="font-bold text-2xl text-amber-700">৳{formData.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No packaging items added yet</p>
              <p className="text-sm">Select a product and add its packaging expenses above</p>
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
            placeholder="Additional notes about this packaging expense..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
          <CheckCircle className="w-4 h-4 mr-2" />
          {expense ? 'Update Expense' : 'Submit for Approval'}
        </Button>
      </div>
    </form>
  );
}
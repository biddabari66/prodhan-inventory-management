import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Box, Trash2, CheckCircle, Package, Image, Upload, X
} from 'lucide-react';
import SearchableProductSelect from '../common/SearchableProductSelect';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const packagingOptions = [
  { name: 'Sticker', icon: '🏷️', units: ['pc', 'sheet', 'roll'] },
  { name: 'Packaging Box', icon: '📦', units: ['pc', 'bundle'] },
  { name: 'Jar/Container', icon: '🫙', units: ['pc', 'litre', 'ml'] },
  { name: 'Plastic Wrap', icon: '🎁', units: ['kg', 'roll', 'meter'] },
  { name: 'Bubble Wrap', icon: '🔵', units: ['kg', 'roll', 'meter'] },
  { name: 'Label', icon: '🪧', units: ['pc', 'sheet', 'roll'] },
  { name: 'Tape', icon: '📎', units: ['pc', 'roll'] },
  { name: 'Bag', icon: '👜', units: ['pc', 'kg', 'bundle'] },
  { name: 'Pouch', icon: '📨', units: ['pc', 'bundle'] },
  { name: 'Carton', icon: '📤', units: ['pc', 'bundle'] },
  { name: 'Seal/Cap', icon: '🔘', units: ['pc', 'bundle'] },
  { name: 'Other', icon: '📋', units: ['pc', 'kg', 'litre', 'meter'] }
];

export default function PackagingExpenseForm({ expense, inventory, suppliers, currentUser, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(expense || {
    expense_date: new Date().toISOString().split('T')[0],
    department: 'prodhan_com_e_commerce',
    supplier_id: '',
    supplier_name: '',
    products: [],
    packaging_items: [],
    total_amount: 0,
    payment_method: 'cash',
    payment_status: 'pending',
    notes: '',
    receipt_url: ''
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [newPackaging, setNewPackaging] = useState({ name: '', quantity: 1, unit_cost: 0, unit: 'pc' });
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Filter inventory for prodhan_com_e_commerce
  const departmentInventory = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];
    return inventory.filter(item => item.department === 'prodhan_com_e_commerce');
  }, [inventory]);

  // Filter suppliers
  const departmentSuppliers = useMemo(() => {
    if (!suppliers || suppliers.length === 0) return [];
    return suppliers.filter(s => 
      s.department === 'prodhan_com_e_commerce' || s.department === 'both' || !s.department
    );
  }, [suppliers]);

  const getPackagingUnits = (name) => {
    const opt = packagingOptions.find(o => o.name === name);
    return opt?.units || ['pc', 'kg', 'litre'];
  };

  // Add product to list
  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    const item = departmentInventory.find(i => i.id === selectedProduct);
    if (!item) return;

    // Check if already added
    if (formData.products.some(p => p.inventory_id === selectedProduct)) {
      toast.error('Product already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { inventory_id: item.id, item_name: item.item_name }]
    }));
    setSelectedProduct('');
  };

  // Remove product
  const handleRemoveProduct = (inventoryId) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.inventory_id !== inventoryId)
    }));
  };

  // Add packaging item
  const handleAddPackaging = () => {
    if (!newPackaging.name) {
      toast.error('Please select a packaging item');
      return;
    }
    if (newPackaging.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (newPackaging.unit_cost <= 0) {
      toast.error('Please enter the total cost');
      return;
    }

    const totalCost = newPackaging.unit_cost; // unit_cost is actually total cost for this item
    const newItem = { 
      ...newPackaging, 
      id: Date.now(),
      total_cost: totalCost
    };

    const newItems = [...formData.packaging_items, newItem];
    const newTotal = newItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);

    setFormData(prev => ({
      ...prev,
      packaging_items: newItems,
      total_amount: newTotal
    }));

    setNewPackaging({ name: '', quantity: 1, unit_cost: 0, unit: 'pc' });
  };

  // Remove packaging item
  const handleRemovePackaging = (id) => {
    const newItems = formData.packaging_items.filter(item => item.id !== id);
    const newTotal = newItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);

    setFormData(prev => ({
      ...prev,
      packaging_items: newItems,
      total_amount: newTotal
    }));
  };

  // Handle receipt upload
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, receipt_url: file_url }));
      toast.success('Receipt uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload receipt: ' + error.message);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Handle supplier change
  const handleSupplierChange = (supplierId) => {
    const supplier = departmentSuppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplier_id: supplierId,
      supplier_name: supplier?.supplier_name || ''
    }));
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.packaging_items.length === 0) {
      toast.error('Please add at least one packaging item');
      return;
    }

    if (formData.products.length === 0) {
      toast.error('Please associate at least one product');
      return;
    }

    const expenseData = {
      ...formData,
      expense_number: expense?.expense_number || `PKG-${Date.now()}`,
      created_by_id: currentUser?.id,
      created_by_name: currentUser?.full_name,
      approval_status: expense ? formData.approval_status : 'pending'
    };

    onSubmit(expenseData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
      {/* Receipt Upload */}
      <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
            <Image className="w-5 h-5" />
            Receipt / Invoice Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="image/*"
              onChange={handleReceiptUpload}
              disabled={isUploadingReceipt}
              className="flex-1"
            />
            {isUploadingReceipt && (
              <span className="text-sm text-muted-foreground animate-pulse">Uploading...</span>
            )}
          </div>
          {formData.receipt_url && (
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-green-600 mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Receipt uploaded
              </p>
              <img 
                src={formData.receipt_url} 
                alt="Receipt" 
                className="max-h-32 rounded border cursor-pointer hover:opacity-90"
                onClick={() => window.open(formData.receipt_url, '_blank')}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Box className="w-5 h-5 text-amber-600" />
            Packaging Expense Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label>Supplier (Optional)</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={handleSupplierChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No Supplier</SelectItem>
                  {departmentSuppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                  <SelectItem value="credit">Credit (Due Later)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Associated Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Associated Products *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select the products this packaging expense is associated with (multiple products can be selected)
          </p>
          
          <div className="flex gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex-1">
              <Label>Select Product</Label>
              <SearchableProductSelect
                inventory={departmentInventory}
                value={selectedProduct}
                onValueChange={setSelectedProduct}
                placeholder="Search and select product..."
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddProduct} variant="outline" className="border-purple-400 text-purple-700 hover:bg-purple-100">
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </div>
          </div>

          {/* Selected Products List */}
          {formData.products.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.products.map((product) => (
                <Badge key={product.inventory_id} className="bg-purple-100 text-purple-800 px-3 py-1.5 flex items-center gap-2">
                  <Package className="w-3 h-3" />
                  {product.item_name}
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(product.inventory_id)}
                    className="hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No products selected yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Packaging Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Box className="w-5 h-5 text-amber-600" />
            Packaging Items & Costs *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add packaging materials (stickers, boxes, jars, labels, etc.) with their total costs
          </p>
          
          {/* Add Packaging Item Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <Label>Packaging Item</Label>
              <Select
                value={newPackaging.name}
                onValueChange={(value) => setNewPackaging({
                  ...newPackaging, 
                  name: value, 
                  unit: packagingOptions.find(o => o.name === value)?.units[0] || 'pc'
                })}
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
              <Label>Total Cost (BDT)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newPackaging.unit_cost}
                onChange={(e) => setNewPackaging({...newPackaging, unit_cost: parseFloat(e.target.value) || 0})}
                placeholder="Enter total cost"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddPackaging} variant="outline" className="w-full border-amber-400 text-amber-700 hover:bg-amber-100">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Packaging Items List */}
          {formData.packaging_items.length > 0 ? (
            <div className="space-y-2">
              {formData.packaging_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {packagingOptions.find(o => o.name === item.name)?.icon || '📦'}
                    </span>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {(item.unit || 'pc').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-700">৳{(item.total_cost || 0).toLocaleString()}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePackaging(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Total */}
              <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg text-right">
                <span className="text-lg font-bold text-amber-800">
                  Total Packaging Cost: ৳{formData.total_amount.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Box className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No packaging items added yet</p>
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
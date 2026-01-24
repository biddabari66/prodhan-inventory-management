import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Box, Plus, Trash2, CheckCircle, Package } from 'lucide-react';
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
  { name: 'Other', icon: '📋' }
];

const unitOptions = ['pc', 'kg', 'gm', 'litre', 'ml', 'roll', 'sheet', 'bundle', 'meter', 'box'];

export default function PackagingExpenseForm({ expense, inventory, currentUser, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(expense || {
    expense_date: new Date().toISOString().split('T')[0],
    department: 'prodhan_com_e_commerce',
    items: [],
    total_amount: 0,
    notes: ''
  });

  // Item being added
  const [selectedProduct, setSelectedProduct] = useState('');
  const [packagingType, setPackagingType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pc');
  const [amount, setAmount] = useState(0);

  // Filter inventory for department
  const departmentInventory = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];
    return inventory.filter(item => item.department === 'prodhan_com_e_commerce');
  }, [inventory]);

  const handleAddItem = () => {
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
      amount: amount
    };

    const newItems = [...formData.items, newItem];
    const newTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);

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
    const newTotal = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    setFormData(prev => ({
      ...prev,
      items: newItems,
      total_amount: newTotal
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error('Please add at least one packaging item');
      return;
    }

    const expenseData = {
      ...formData,
      expense_number: expense?.expense_number || `PKG-${Date.now()}`,
      created_by_id: currentUser?.id,
      created_by_name: currentUser?.full_name,
      status: expense ? formData.status : 'pending_approval'
    };

    onSubmit(expenseData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
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

          {/* Add Item Form */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-4">
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
          </div>

          {/* Items List */}
          {formData.items.length > 0 ? (
            <div className="space-y-2">
              {formData.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {packagingTypes.find(t => t.name === item.packaging_type)?.icon || '📦'}
                      </span>
                      <span className="font-semibold">{item.product_name}</span>
                      <Badge variant="outline" className="text-xs">{item.packaging_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit.toUpperCase()}
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
              
              {/* Total */}
              <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total Packaging Expense:</span>
                  <span className="font-bold text-2xl text-amber-700">৳{formData.total_amount.toLocaleString()}</span>
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
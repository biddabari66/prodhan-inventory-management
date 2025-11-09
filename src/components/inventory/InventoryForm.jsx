import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function InventoryForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'books',
    current_stock: '',
    minimum_stock: '',
    purchase_price: '',
    selling_price: '',
    supplier_name: '',
    status: 'active',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      current_stock: parseInt(formData.current_stock),
      minimum_stock: parseInt(formData.minimum_stock),
      purchase_price: parseFloat(formData.purchase_price),
      selling_price: parseFloat(formData.selling_price),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="item_name">Item Name</Label>
          <Input id="item_name" value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})} required />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="books">Books</SelectItem>
              <SelectItem value="stationery">Stationery</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="current_stock">Current Stock</Label>
          <Input id="current_stock" type="number" value={formData.current_stock} onChange={(e) => setFormData({...formData, current_stock: e.target.value})} required />
        </div>
        <div>
          <Label htmlFor="minimum_stock">Minimum Stock</Label>
          <Input id="minimum_stock" type="number" value={formData.minimum_stock} onChange={(e) => setFormData({...formData, minimum_stock: e.target.value})} required />
        </div>
        <div>
          <Label htmlFor="purchase_price">Purchase Price (৳)</Label>
          <Input id="purchase_price" type="number" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: e.target.value})} required />
        </div>
        <div>
          <Label htmlFor="selling_price">Selling Price (৳)</Label>
          <Input id="selling_price" type="number" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: e.target.value})} required />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Add Item</Button>
      </div>
    </form>
  );
}
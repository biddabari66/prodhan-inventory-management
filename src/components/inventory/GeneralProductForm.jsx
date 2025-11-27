import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Package, Check, X } from 'lucide-react';
import { Inventory } from '@/entities/Inventory';
import { toast } from 'sonner';
import { ProdhanCategorySelect } from './CategorySelect';
import SupplierSelect, { AlternateSuppliersManager } from './SupplierSelect';

/**
 * GENERAL PRODUCT FORM FOR PRODHAN.COM E-COMMERCE
 * Handles non-book products with e-commerce specific fields
 */
export default function GeneralProductForm({ product, onUpdate, onClose }) {
  const [formData, setFormData] = useState({
    item_name: product?.item_name || '',
    category: product?.category || 'electronics',
    current_stock: product?.current_stock || 0,
    minimum_stock: product?.minimum_stock || 10,
    reorder_point: product?.reorder_point || 0,
    safety_stock: product?.safety_stock || 5,
    purchase_price: product?.purchase_price || 0,
    selling_price: product?.selling_price || 0,
    supplier_id: product?.supplier_id || '',
    supplier_name: product?.supplier_name || '',
    supplier_contact: product?.supplier_contact || '',
    supplier_lead_time_days: product?.supplier_lead_time_days || 7,
    alternate_suppliers: product?.alternate_suppliers || [],
    barcode: product?.barcode || '',
    description: product?.description || '',
    warehouse_location: product?.warehouse_location || { zone: '', aisle: '', shelf: '', bin: '' },
    weight_kg: product?.weight_kg || 0,
    dimensions: product?.dimensions || { length_cm: 0, width_cm: 0, height_cm: 0 },
    web_visibility: product?.web_visibility !== undefined ? product.web_visibility : true,
    featured: product?.featured || false,
    tags: product?.tags || [],
    seo_keywords: product?.seo_keywords || [],
    department: 'prodhan_com_e_commerce',
    status: product?.status || 'active'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [seoInput, setSeoInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.item_name) {
      toast.error('Product name is required');
      return;
    }

    const cleanedData = {
      ...formData,
      current_stock: parseInt(formData.current_stock) || 0,
      minimum_stock: parseInt(formData.minimum_stock) || 0,
      reorder_point: parseInt(formData.reorder_point) || 0,
      safety_stock: parseInt(formData.safety_stock) || 0,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      supplier_lead_time_days: parseInt(formData.supplier_lead_time_days) || 7,
      weight_kg: parseFloat(formData.weight_kg) || 0,
      dimensions: {
        length_cm: parseFloat(formData.dimensions.length_cm) || 0,
        width_cm: parseFloat(formData.dimensions.width_cm) || 0,
        height_cm: parseFloat(formData.dimensions.height_cm) || 0
      },
      department: 'prodhan_com_e_commerce',
      category: formData.category
    };

    console.log('Submitting product data:', cleanedData);

    setIsSaving(true);
    try {
      if (product?.id) {
        await Inventory.update(product.id, cleanedData);
        toast.success('Product updated successfully');
      } else {
        await Inventory.create(cleanedData);
        toast.success('Product added successfully');
      }

      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate();
      }
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to save product: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({...formData, tags: [...formData.tags, tagInput.trim()]});
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({...formData, tags: formData.tags.filter(t => t !== tag)});
  };

  const addSeoKeyword = () => {
    if (seoInput.trim() && !formData.seo_keywords.includes(seoInput.trim())) {
      setFormData({...formData, seo_keywords: [...formData.seo_keywords, seoInput.trim()]});
      setSeoInput('');
    }
  };

  const removeSeoKeyword = (keyword) => {
    setFormData({...formData, seo_keywords: formData.seo_keywords.filter(k => k !== keyword)});
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          {product?.id ? 'Edit Product' : 'Add New Product'}
          <Badge className="bg-purple-100 text-purple-800">Prodhan.com</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item_name">Product Name *</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <ProdhanCategorySelect
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Manage categories in Category Settings
                </p>
              </div>

              <div>
                <Label htmlFor="barcode">Barcode/SKU</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  placeholder="Product barcode or SKU"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Product Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detailed product description"
                rows={3}
              />
            </div>
          </div>

          {/* Stock & Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Stock & Pricing</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="current_stock">Current Stock *</Label>
                <Input
                  id="current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="minimum_stock">Minimum Stock *</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value) || 0})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reorder_point">Reorder Point</Label>
                <Input
                  id="reorder_point"
                  type="number"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({...formData, reorder_point: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="safety_stock">Safety Stock</Label>
                <Input
                  id="safety_stock"
                  type="number"
                  value={formData.safety_stock}
                  onChange={(e) => setFormData({...formData, safety_stock: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="purchase_price">Purchase Price (৳) *</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="selling_price">Selling Price (৳) *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>

              <div className="col-span-2">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">
                    Profit Margin: ৳{(formData.selling_price - formData.purchase_price).toFixed(2)} 
                    ({formData.purchase_price > 0 ? (((formData.selling_price - formData.purchase_price) / formData.purchase_price) * 100).toFixed(1) : 0}%)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Supplier Information</h3>
            
            <div>
              <Label>Primary Supplier</Label>
              <SupplierSelect
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({...formData, supplier_id: value})}
                department="prodhan_com_e_commerce"
              />
            </div>

            <AlternateSuppliersManager
              suppliers={formData.alternate_suppliers}
              onChange={(suppliers) => setFormData({...formData, alternate_suppliers: suppliers})}
              department="prodhan_com_e_commerce"
            />
          </div>

          {/* Physical Properties */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Physical Properties & Location</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="weight_kg">Weight (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.01"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({...formData, weight_kg: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="length_cm">Length (cm)</Label>
                <Input
                  id="length_cm"
                  type="number"
                  step="0.1"
                  value={formData.dimensions.length_cm}
                  onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, length_cm: parseFloat(e.target.value) || 0}})}
                />
              </div>

              <div>
                <Label htmlFor="width_cm">Width (cm)</Label>
                <Input
                  id="width_cm"
                  type="number"
                  step="0.1"
                  value={formData.dimensions.width_cm}
                  onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, width_cm: parseFloat(e.target.value) || 0}})}
                />
              </div>

              <div>
                <Label htmlFor="height_cm">Height (cm)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  step="0.1"
                  value={formData.dimensions.height_cm}
                  onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, height_cm: parseFloat(e.target.value) || 0}})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="zone">Warehouse Zone</Label>
                <Input
                  id="zone"
                  value={formData.warehouse_location.zone}
                  onChange={(e) => setFormData({...formData, warehouse_location: {...formData.warehouse_location, zone: e.target.value}})}
                  placeholder="e.g., A"
                />
              </div>

              <div>
                <Label htmlFor="aisle">Aisle</Label>
                <Input
                  id="aisle"
                  value={formData.warehouse_location.aisle}
                  onChange={(e) => setFormData({...formData, warehouse_location: {...formData.warehouse_location, aisle: e.target.value}})}
                  placeholder="e.g., 12"
                />
              </div>

              <div>
                <Label htmlFor="shelf">Shelf</Label>
                <Input
                  id="shelf"
                  value={formData.warehouse_location.shelf}
                  onChange={(e) => setFormData({...formData, warehouse_location: {...formData.warehouse_location, shelf: e.target.value}})}
                  placeholder="e.g., 3"
                />
              </div>

              <div>
                <Label htmlFor="bin">Bin</Label>
                <Input
                  id="bin"
                  value={formData.warehouse_location.bin}
                  onChange={(e) => setFormData({...formData, warehouse_location: {...formData.warehouse_location, bin: e.target.value}})}
                  placeholder="e.g., B2"
                />
              </div>
            </div>
          </div>

          {/* E-commerce Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">E-commerce Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="web_visibility"
                  checked={formData.web_visibility}
                  onChange={(e) => setFormData({...formData, web_visibility: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="web_visibility">Visible on Website</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="featured">Featured Product</Label>
              </div>
            </div>

            <div>
              <Label>Product Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" onClick={addTag} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>SEO Keywords</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={seoInput}
                  onChange={(e) => setSeoInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSeoKeyword())}
                  placeholder="Add SEO keyword and press Enter"
                />
                <Button type="button" onClick={addSeoKeyword} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.seo_keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeSeoKeyword(keyword)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
              {isSaving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {product?.id ? 'Update Product' : 'Add Product'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
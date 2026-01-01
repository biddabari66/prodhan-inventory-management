import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Package, Check, X, Sparkles, Loader2, Link2, Wand2 } from 'lucide-react';
import { Inventory } from '@/entities/Inventory';
import { toast } from 'sonner';
import { ProdhanCategorySelect } from './CategorySelect';
import SupplierSelect, { AlternateSuppliersManager } from './SupplierSelect';
import { base44 } from '@/api/base44Client';

// Helper function to detect if text contains Bengali characters
const containsBengali = (text) => {
  if (!text) return false;
  const bengaliPattern = /[\u0980-\u09FF]/;
  return bengaliPattern.test(text);
};

/**
 * GENERAL PRODUCT FORM FOR PRODHAN.COM E-COMMERCE
 * Handles non-book products with e-commerce specific fields
 */
export default function GeneralProductForm({ product, onUpdate, onClose }) {
  const [formData, setFormData] = useState({
    item_name: product?.item_name || '',
    english_item_name: product?.english_item_name || '',
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Auto-translate Bengali name to English
  const translateToEnglish = useCallback(async (bengaliText) => {
    if (!bengaliText || !containsBengali(bengaliText)) return;
    
    setIsTranslating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate this Bengali product name to English. Only provide the English translation, nothing else. If it's already in English or a proper noun, keep it as is. Text: "${bengaliText}"`,
        response_json_schema: {
          type: "object",
          properties: {
            english_name: { type: "string" }
          }
        }
      });
      
      if (response?.english_name) {
        setFormData(prev => ({ ...prev, english_item_name: response.english_name }));
        toast.success('English name generated automatically');
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Debounced translation trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.item_name && containsBengali(formData.item_name) && !formData.english_item_name) {
        translateToEnglish(formData.item_name);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [formData.item_name, formData.english_item_name, translateToEnglish]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.item_name) {
      toast.error('Product name is required');
      return;
    }

    // Check for duplicate barcode (only for new products with barcode)
    if (!product?.id && formData.barcode) {
      try {
        const existingProducts = await Inventory.filter({ barcode: formData.barcode });
        if (existingProducts.length > 0) {
          toast.error(`A product with barcode "${formData.barcode}" already exists: ${existingProducts[0].item_name}`);
          return;
        }
      } catch (err) {
        console.warn('Could not check for duplicates:', err);
      }
    }

    // Check for duplicate product name in same department (only for new products)
    if (!product?.id) {
      try {
        const existingProducts = await Inventory.filter({ 
          item_name: formData.item_name, 
          department: 'prodhan_com_e_commerce' 
        });
        if (existingProducts.length > 0) {
          toast.error(`A product named "${formData.item_name}" already exists in this department`);
          return;
        }
      } catch (err) {
        console.warn('Could not check for duplicates:', err);
      }
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
      category: formData.category,
      // Use item_name as english_item_name if not Bengali and english_item_name is empty
      english_item_name: formData.english_item_name || (!containsBengali(formData.item_name) ? formData.item_name : '')
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

  // Extract product details from URL
  const extractFromUrl = async () => {
    if (!productUrl.trim()) {
      toast.error('Please enter a product page URL');
      return;
    }

    if (!productUrl.startsWith('http://') && !productUrl.startsWith('https://')) {
      toast.error('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setIsExtracting(true);
    const loadingToast = toast.loading('🔍 Analyzing product page...');
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this product page URL: ${productUrl}

Extract the following product information:
1. Product name (full product title)
2. Category (e.g., Electronics, Fashion, Books, Home & Kitchen, etc.)
3. Selling price (numeric value only, no currency symbols)
4. Product description (detailed description)
5. Weight in kg (if available)
6. Dimensions in cm (length, width, height if available)
7. Relevant tags/keywords (3-5 tags that describe the product)

Be thorough and extract as much information as possible from the page content, meta tags, and structured data.

Return ONLY valid JSON with no additional text.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            category: { type: "string" },
            selling_price: { type: "number" },
            description: { type: "string" },
            weight_kg: { type: "number" },
            dimensions: {
              type: "object",
              properties: {
                length_cm: { type: "number" },
                width_cm: { type: "number" },
                height_cm: { type: "number" }
              }
            },
            tags: { type: "array", items: { type: "string" } }
          },
          required: ["product_name"]
        }
      });

      toast.dismiss(loadingToast);

      if (response && response.product_name) {
        // Auto-fill form with extracted data
        const updates = {};
        
        if (response.product_name) {
          updates.item_name = response.product_name;
          // Auto-translate if needed
          if (!containsBengali(response.product_name)) {
            updates.english_item_name = response.product_name;
          }
        }
        
        if (response.category) {
          updates.category = response.category.toLowerCase().replace(/\s+/g, '_');
        }
        
        if (response.selling_price && response.selling_price > 0) {
          updates.selling_price = response.selling_price;
        }
        
        if (response.description) {
          updates.description = response.description;
        }
        
        if (response.weight_kg && response.weight_kg > 0) {
          updates.weight_kg = response.weight_kg;
        }
        
        if (response.dimensions) {
          const newDimensions = { ...formData.dimensions };
          if (response.dimensions.length_cm) newDimensions.length_cm = response.dimensions.length_cm;
          if (response.dimensions.width_cm) newDimensions.width_cm = response.dimensions.width_cm;
          if (response.dimensions.height_cm) newDimensions.height_cm = response.dimensions.height_cm;
          updates.dimensions = newDimensions;
        }
        
        if (response.tags && Array.isArray(response.tags) && response.tags.length > 0) {
          updates.tags = response.tags.slice(0, 10);
        }

        setFormData(prev => ({ ...prev, ...updates }));
        toast.success(`✨ Extracted: ${response.product_name}`);
        setProductUrl('');
      } else {
        toast.error('Could not extract product details. Try a different URL.');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Extraction error:', error);
      toast.error('Failed to extract: ' + (error.message || 'Unknown error'));
    } finally {
      setIsExtracting(false);
    }
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
          {/* AI URL Extractor */}
          <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border-2 border-violet-200">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-5 h-5 text-violet-600" />
              <h3 className="font-semibold text-violet-900">AI Product URL Extractor</h3>
              <Badge className="bg-violet-600 text-white">Smart</Badge>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Paste any product page URL and AI will automatically extract all details
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://example.com/product/wireless-mouse"
                  className="bg-white"
                  disabled={isExtracting}
                />
              </div>
              <Button
                type="button"
                onClick={extractFromUrl}
                disabled={isExtracting || !productUrl.trim()}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Extract Details
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item_name">Product Name *</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value, english_item_name: ''})}
                  placeholder="Enter product name (Bengali or English)"
                  required
                />
                {containsBengali(formData.item_name) && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Bengali detected - English name will be auto-generated
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="english_item_name" className="flex items-center gap-2">
                  English Name
                  {isTranslating && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                </Label>
                <Input
                  id="english_item_name"
                  value={formData.english_item_name}
                  onChange={(e) => setFormData({...formData, english_item_name: e.target.value})}
                  placeholder="English translation (auto-generated)"
                />
                <p className="text-xs text-slate-500 mt-1">Used in reports and exports</p>
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
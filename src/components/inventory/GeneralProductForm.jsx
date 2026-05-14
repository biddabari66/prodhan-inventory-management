import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Check, X, Sparkles, Loader2, Link2, Wand2, Palette, Plus, AlertCircle, Layers, Trash2 } from 'lucide-react';
import { Inventory } from '@/entities/Inventory';
import { ProductCategory } from '@/entities/ProductCategory';
import { toast } from 'sonner';
import { ProdhanCategorySelect } from './CategorySelect';
import SupplierSelect, { AlternateSuppliersManager } from './SupplierSelect';
import { base44 } from '@/api/base44Client';
import SearchableProductSelect from '../common/SearchableProductSelect';
import AdvancedVariantManager from './AdvancedVariantManager';
import { generateProductBarcode } from '../common/BarcodeGenerator';

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
    sku: product?.sku || '',                          // ← NEW: dedicated SKU field
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
    weight_unit: product?.weight_unit || 'kg',
    weight_value: product?.weight_value || 0,
    dimensions: product?.dimensions || { length_cm: 0, width_cm: 0, height_cm: 0 },
    web_visibility: product?.web_visibility !== undefined ? product.web_visibility : true,
    featured: product?.featured || false,
    tags: product?.tags || [],
    seo_keywords: product?.seo_keywords || [],
    department: 'prodhan_com_e_commerce',
    status: product?.status || 'active',
    color_variants: product?.color_variants || [],
    product_variants: product?.product_variants || [],
    product_source_url: product?.product_source_url || '',
    is_bundle: product?.is_bundle || false,
    bundle_items: product?.bundle_items || [],
    requires_refining: false,
    raw_quantity: 0,
    yield_percentage: 100,
    usable_quantity: 0,
    waste_quantity: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [seoInput, setSeoInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [colorName, setColorName] = useState('');
  const [colorQuantity, setColorQuantity] = useState(0);
  const [bundleProductId, setBundleProductId] = useState('');
  const [bundleQuantity, setBundleQuantity] = useState(1);
  const [allInventory, setAllInventory] = useState([]);

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

  // Load inventory for bundle selection
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const items = await Inventory.list();
        setAllInventory(items.filter(i => i.department === 'prodhan_com_e_commerce' && !i.is_bundle));
      } catch (error) {
        console.error('Failed to load inventory:', error);
      }
    };
    loadInventory();
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

  // Auto-calculate weight_kg from weight_value and weight_unit
  useEffect(() => {
    if (formData.weight_value > 0) {
      const weightInKg = formData.weight_unit === 'grams' 
        ? formData.weight_value / 1000 
        : formData.weight_value;
      setFormData(prev => ({ ...prev, weight_kg: weightInKg }));
    }
  }, [formData.weight_value, formData.weight_unit]);



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.item_name) {
      toast.error('Product name is required');
      return;
    }

    // Auto-generate barcode if empty for new products
    if (!product?.id && !formData.barcode) {
      formData.barcode = generateProductBarcode();
      toast.info(`Auto-generated UPC barcode: ${formData.barcode}`);
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

    // Check for duplicate SKU (only for new products with SKU)
    if (!product?.id && formData.sku) {
      try {
        const existingProducts = await Inventory.filter({ sku: formData.sku });
        if (existingProducts.length > 0) {
          toast.error(`A product with SKU "${formData.sku}" already exists: ${existingProducts[0].item_name}`);
          return;
        }
      } catch (err) {
        console.warn('Could not check for duplicate SKU:', err);
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
      english_item_name: formData.english_item_name || (!containsBengali(formData.item_name) ? formData.item_name : ''),
      sku: formData.sku || '',
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

  // Parse weight intelligently
  const parseWeight = (weightStr) => {
    if (!weightStr) return null;
    const str = weightStr.toLowerCase().trim();
    const kgMatch = str.match(/(\d+\.?\d*)\s*k?g/);
    const gramsMatch = str.match(/(\d+\.?\d*)\s*g(?!r)/);
    const gramsWordMatch = str.match(/(\d+\.?\d*)\s*grams?/);
    
    if (kgMatch) {
      return { value: parseFloat(kgMatch[1]), unit: 'kg' };
    } else if (gramsMatch || gramsWordMatch) {
      const value = parseFloat(gramsMatch?.[1] || gramsWordMatch?.[1]);
      return { value, unit: 'grams' };
    }
    return null;
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
2. Category (e.g., Electronics & Gadgets, Fashion & Apparel, Books & Media, Home & Kitchen, Sports & Outdoors, etc.)
3. SKU/Product ID/Model Number (look for SKU, Product ID, Model Number, or Item Number)
4. Selling price (numeric value only, no currency symbols - if multiple prices, use the main selling price)
5. Product description (detailed description)
6. Weight as a string (e.g., "500g", "1kg", "1.5kg", "1000g") - extract exactly as shown
7. Dimensions in cm (length, width, height if available)
8. Available color variants/options (e.g., ["Red", "Blue", "Black"])
9. Product images (URLs if available)
10. Relevant tags/keywords (3-5 tags that describe the product)

Be thorough and extract as much information as possible from the page content, meta tags, product specifications, and structured data.

Return ONLY valid JSON with no additional text.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            category: { type: "string" },
            sku: { type: "string" },
            selling_price: { type: "number" },
            description: { type: "string" },
            weight: { type: "string" },
            dimensions: {
              type: "object",
              properties: {
                length_cm: { type: "number" },
                width_cm: { type: "number" },
                height_cm: { type: "number" }
              }
            },
            colors: { type: "array", items: { type: "string" } },
            images: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } }
          },
          required: ["product_name"]
        }
      });

      toast.dismiss(loadingToast);

      if (response && response.product_name) {
        const updates = { product_source_url: productUrl };
        
        if (response.product_name) {
          updates.item_name = response.product_name;
          if (!containsBengali(response.product_name)) {
            updates.english_item_name = response.product_name;
          }
        }
        
        if (response.category) {
          const categoryName = response.category;
          const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
          
          try {
            const existingCategories = await ProductCategory.filter({ name: categoryName, department: 'prodhan_com_e_commerce' });
            
            if (existingCategories.length === 0) {
              await ProductCategory.create({
                name: categoryName,
                slug: categorySlug,
                department: 'prodhan_com_e_commerce',
                type: 'product',
                description: `Auto-generated category for ${categoryName}`,
                color: '#8B5CF6',
                sort_order: 999,
                is_active: true
              });
              toast.success(`✨ Created new category: ${categoryName}`);
            }
            updates.category = categoryName;
          } catch (error) {
            console.error('Category creation error:', error);
            updates.category = categoryName;
          }
        }
        
        // Populate both SKU field AND barcode from extracted SKU
        if (response.sku) {
          updates.sku = response.sku;
          // Only fill barcode if it looks like a numeric UPC (12 digits)
          if (/^\d{12}$/.test(response.sku)) {
            updates.barcode = response.sku;
          }
        }
        
        if (response.selling_price && response.selling_price > 0) {
          updates.selling_price = response.selling_price;
        }
        
        if (response.description) {
          updates.description = response.description;
        }
        
        if (response.weight) {
          const parsedWeight = parseWeight(response.weight);
          if (parsedWeight) {
            updates.weight_value = parsedWeight.value;
            updates.weight_unit = parsedWeight.unit;
            updates.weight_kg = parsedWeight.unit === 'grams' ? parsedWeight.value / 1000 : parsedWeight.value;
          }
        }
        
        if (response.dimensions) {
          const newDimensions = { ...formData.dimensions };
          if (response.dimensions.length_cm) newDimensions.length_cm = response.dimensions.length_cm;
          if (response.dimensions.width_cm) newDimensions.width_cm = response.dimensions.width_cm;
          if (response.dimensions.height_cm) newDimensions.height_cm = response.dimensions.height_cm;
          updates.dimensions = newDimensions;
        }

        if (response.colors && Array.isArray(response.colors) && response.colors.length > 0) {
          const qtyPerColor = Math.floor(formData.current_stock / response.colors.length);
          updates.color_variants = response.colors.map(color => ({
            color: color,
            quantity: qtyPerColor
          }));
          toast.info(`🎨 Detected ${response.colors.length} color variants`);
        }
        
        if (response.tags && Array.isArray(response.tags) && response.tags.length > 0) {
          updates.tags = response.tags.slice(0, 10);
        }

        setFormData(prev => ({ ...prev, ...updates }));
        toast.success(`✨ Extracted: ${response.product_name}${response.sku ? ` (SKU: ${response.sku})` : ''}`);
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

              {/* ── SKU field (NEW — dedicated, separate from barcode) ── */}
              <div>
                <Label htmlFor="sku" className="flex items-center gap-1.5">
                  SKU
                  <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 px-1.5 py-0 font-medium">
                    Internal Code
                  </Badge>
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value.trim()})}
                  placeholder="e.g. PRD-SHIRT-BLK-L"
                  className="font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Your internal stock-keeping code (letters, numbers, hyphens)
                </p>
              </div>

              <div>
                <Label htmlFor="barcode">Barcode (UPC-A)</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    placeholder="12-digit UPC barcode"
                    className="flex-1 font-mono"
                    maxLength={12}
                  />
                  {!product?.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => {
                        const code = generateProductBarcode();
                        setFormData({...formData, barcode: code});
                        toast.success(`UPC barcode generated: ${code}`);
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" /> Auto
                    </Button>
                  )}
                </div>
                {formData.barcode && formData.barcode.length === 12 && /^\d{12}$/.test(formData.barcode) && (
                  <p className="text-xs text-green-600 mt-1">✓ Valid 12-digit UPC-A barcode</p>
                )}
                {formData.barcode && (formData.barcode.length !== 12 || !/^\d{12}$/.test(formData.barcode)) && (
                  <p className="text-xs text-amber-600 mt-1">⚠ UPC-A requires exactly 12 digits</p>
                )}
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
                <Label htmlFor="current_stock">
                  Current Stock *
                  {formData.color_variants?.length > 0 && formData.color_variants.reduce((sum, v) => sum + (v.quantity || 0), 0) > 0 && (
                    <span className="text-xs text-blue-500 ml-2">
                      (Variants total: {formData.color_variants.reduce((sum, v) => sum + (v.quantity || 0), 0)})
                    </span>
                  )}
                </Label>
                <Input
                  id="current_stock"
                  type="number"
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="minimum_stock">Minimum Stock *</Label>
                <Input
                  id="minimum_stock"
                  type="text"
                  inputMode="numeric"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({...formData, minimum_stock: parseInt(e.target.value) || 0})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reorder_point">Reorder Point</Label>
                <Input
                  id="reorder_point"
                  type="text"
                  inputMode="numeric"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({...formData, reorder_point: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="safety_stock">Safety Stock</Label>
                <Input
                  id="safety_stock"
                  type="text"
                  inputMode="numeric"
                  value={formData.safety_stock}
                  onChange={(e) => setFormData({...formData, safety_stock: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="purchase_price">Purchase Price (৳) *</Label>
                <Input
                  id="purchase_price"
                  type="text"
                  inputMode="decimal"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="selling_price">Selling Price (৳) *</Label>
                <Input
                  id="selling_price"
                  type="text"
                  inputMode="decimal"
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

          {/* ADVANCED VARIANT MANAGER */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />
              Product Variants (Advanced)
            </h3>
            
            <AdvancedVariantManager
              variants={formData.product_variants || []}
              onChange={(variants) => {
                setFormData(prev => ({ ...prev, product_variants: variants }));
              }}
              basePrice={formData.selling_price}
              baseWeight={formData.weight_kg}
              baseSKU={formData.sku || formData.barcode}
            />
            {formData.product_variants?.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const totalQty = formData.product_variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
                    setFormData(prev => ({ ...prev, current_stock: totalQty }));
                    toast.success(`Stock updated to ${totalQty} (sum of variants)`);
                  }}
                >
                  Sync Stock from Variants ({formData.product_variants.reduce((sum, v) => sum + (v.quantity || 0), 0)})
                </Button>
              </div>
            )}
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
                <Label htmlFor="weight_value">Weight</Label>
                <Input
                  id="weight_value"
                  type="text"
                  inputMode="decimal"
                  value={formData.weight_value}
                  onChange={(e) => setFormData({...formData, weight_value: parseFloat(e.target.value) || 0})}
                  placeholder="e.g., 500 or 1.5"
                />
              </div>

              <div>
                <Label htmlFor="weight_unit">Weight Unit</Label>
                <Select 
                  value={formData.weight_unit} 
                  onValueChange={(value) => setFormData({...formData, weight_unit: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="grams">Grams (g)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Converted:</strong> {formData.weight_value > 0 
                      ? `${formData.weight_value}${formData.weight_unit === 'grams' ? 'g' : 'kg'} = ${formData.weight_kg.toFixed(3)}kg`
                      : 'Enter weight above'}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="length_cm">Length (cm)</Label>
                <Input
                  id="length_cm"
                  type="text"
                  inputMode="decimal"
                  value={formData.dimensions.length_cm}
                  onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, length_cm: parseFloat(e.target.value) || 0}})}
                />
              </div>

              <div>
                <Label htmlFor="width_cm">Width (cm)</Label>
                <Input
                  id="width_cm"
                  type="text"
                  inputMode="decimal"
                  value={formData.dimensions.width_cm}
                  onChange={(e) => setFormData({...formData, dimensions: {...formData.dimensions, width_cm: parseFloat(e.target.value) || 0}})}
                />
              </div>

              <div>
                <Label htmlFor="height_cm">Height (cm)</Label>
                <Input
                  id="height_cm"
                  type="text"
                  inputMode="decimal"
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

          {/* Combo/Bundle Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600" />
              Combo/Bundle Product
            </h3>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  id="is_bundle"
                  checked={formData.is_bundle}
                  onCheckedChange={(checked) => setFormData({...formData, is_bundle: checked, bundle_items: checked ? formData.bundle_items : []})}
                />
                <Label htmlFor="is_bundle" className="font-semibold cursor-pointer">
                  This is a combo product
                </Label>
              </div>
              <p className="text-xs text-orange-800">
                When a combo is sold, all component products are automatically deducted from stock. Example: "Tea Set" contains 1× Tea + 1× Honey + 1× Box.
              </p>
            </div>

            {formData.is_bundle && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                  <div className="md:col-span-1">
                    <Label className="text-xs font-semibold">Select Product</Label>
                    <SearchableProductSelect
                      inventory={allInventory.filter(i => i.id !== product?.id)}
                      value={bundleProductId}
                      onValueChange={setBundleProductId}
                      placeholder="Search products..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Quantity</Label>
                    <Input
                      type="number"
                      value={bundleQuantity}
                      onChange={(e) => setBundleQuantity(parseInt(e.target.value) || 1)}
                      placeholder="1"
                      min="1"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!bundleProductId) {
                          toast.error('Select a product');
                          return;
                        }
                        
                        const alreadyAdded = formData.bundle_items?.find(b => b.inventory_id === bundleProductId);
                        if (alreadyAdded) {
                          toast.error('This product is already in the bundle');
                          return;
                        }

                        const selectedProduct = allInventory.find(i => i.id === bundleProductId);
                        setFormData({
                          ...formData,
                          bundle_items: [...(formData.bundle_items || []), { 
                            inventory_id: bundleProductId,
                            quantity: bundleQuantity
                          }]
                        });
                        setBundleProductId('');
                        setBundleQuantity(1);
                        toast.success(`Added ${selectedProduct?.item_name} (${bundleQuantity}×)`);
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Component
                    </Button>
                  </div>
                </div>

                {formData.bundle_items?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Bundle Components ({formData.bundle_items.length})</Label>
                    <div className="space-y-2">
                      {formData.bundle_items.map((item, index) => {
                        const bundleProduct = allInventory.find(i => i.id === item.inventory_id);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-slate-200">
                            <div className="flex items-center gap-3">
                              <Badge className="bg-orange-100 text-orange-800">{item.quantity}×</Badge>
                              <div>
                                <p className="font-semibold text-sm">{bundleProduct?.item_name || 'Unknown Product'}</p>
                                <p className="text-xs text-slate-500">Stock: {bundleProduct?.current_stock || 0}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  bundle_items: formData.bundle_items.filter((_, i) => i !== index)
                                });
                              }}
                              className="hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
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
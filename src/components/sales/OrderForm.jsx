import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Package, User, MapPin, CreditCard, Layers, CheckCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import SearchableCustomerSelect from '../common/SearchableCustomerSelect';

// ─ Variant helpers ─────────────────────────────────────────────────────
function getVariants(inventoryItem) {
  if (!inventoryItem) return null;
  const arr = inventoryItem.variants || inventoryItem.variant_list || inventoryItem.product_variants || inventoryItem.sizes || inventoryItem.options || null;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr;
}

function buildVariantLabel(v) {
  const parts = [v.size, v.color, v.colour, v.quality, v.material, v.flavor, v.flavour, v.weight, v.style].filter(val => val && String(val).trim() !== '');
  if (parts.length > 0) return parts.map(p => String(p).trim()).join(' / ');
  return v.variant_name || v.name || v.title || v.sku || 'Variant';
}

function getVariantStock(v) {
  const val = v.quantity ?? v.stock ?? v.current_stock ?? v.qty ?? v.in_stock ?? 0;
  return typeof val === 'number' ? val : parseInt(val, 10) || 0;
}

// ─ Variant Picker ──────────────────────────────────────────────────────
function VariantPicker({ inventoryItem, selectedVariantId, onSelect }) {
  const variants = getVariants(inventoryItem);
  if (!variants) return null;

  const selectedVariant = variants.find(v => v.id === selectedVariantId || (selectedVariantId === variants.indexOf(v) && !v.id));

  return (
    <div className="mt-2 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
      <div className="flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
          Select Variant <span className="text-red-500 ml-0.5">*</span>
        </span>
        {!selectedVariantId && selectedVariantId !== 0 && (
          <Badge className="bg-red-100 text-red-700 border border-red-200 rounded-full px-2 text-[10px]">Required</Badge>
        )}
        {selectedVariant && (
          <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full px-2 text-[10px] gap-1 inline-flex items-center">
            <CheckCircle className="w-2.5 h-2.5" />{buildVariantLabel(selectedVariant)}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {variants.map((v, idx) => {
          const label = buildVariantLabel(v);
          const stock = getVariantStock(v);
          const isOut = stock === 0;
          const variantKey = v.id || idx;
          const isSelected = selectedVariantId === variantKey;
          const price = v.price ?? v.selling_price ?? null;

          return (
            <button
              key={idx}
              type="button"
              disabled={isOut}
              onClick={() => onSelect(variantKey, v)}
              title={isOut ? 'Out of stock' : `Stock: ${stock}${price ? `  |  ৳${price}` : ''}`}
              className={`inline-flex flex-col items-center px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all duration-150 select-none ${
                isOut ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                : isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'
              }`}
            >
              <span>{label}</span>
              <span className={`text-[10px] font-normal mt-0.5 ${isSelected ? 'text-indigo-100' : isOut ? 'text-slate-300' : 'text-slate-500'}`}>
                {isOut ? 'Out' : `${stock} left`}
              </span>
              {price && (
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-emerald-600'}`}>
                  ৳{price.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedVariant && (
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-indigo-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">{buildVariantLabel(selectedVariant)}</span>
          </div>
          <span className="text-slate-300 text-xs">|</span>
          <span className="text-xs text-slate-600">
            Stock: <strong className={getVariantStock(selectedVariant) < 5 ? 'text-amber-600' : 'text-slate-800'}>{getVariantStock(selectedVariant)}</strong>
          </span>
          {selectedVariant.sku && (
            <>
              <span className="text-slate-300 text-xs">|</span>
              <span className="text-xs text-slate-500 font-mono">{selectedVariant.sku}</span>
            </>
          )}
          {(selectedVariant.price ?? selectedVariant.selling_price) && (
            <>
              <span className="text-slate-300 text-xs">|</span>
              <span className="text-xs font-bold text-emerald-600">৳{(selectedVariant.price ?? selectedVariant.selling_price).toLocaleString()}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─ Order Item Row ──────────────────────────────────────────────────────
function OrderItemRow({ item, index, inventory, inventoryMap, onUpdate, onRemove }) {
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(!item.inventory_id);

  const inventoryItem = useMemo(() => {
    if (!item.inventory_id) return null;
    return inventoryMap?.get(item.inventory_id) || inventory.find(i => i.id === item.inventory_id) || null;
  }, [item.inventory_id, inventoryMap, inventory]);

  const variants = getVariants(inventoryItem);
  const hasVariants = !!variants;

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return inventory.slice(0, 30);
    const q = productSearch.toLowerCase();
    return inventory.filter(p => p.item_name?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q) || p.isbn?.toLowerCase().includes(q)).slice(0, 30);
  }, [productSearch, inventory]);

  const handleProductSelect = (product) => {
    onUpdate(index, {
      ...item,
      inventory_id: product.id,
      item_name: product.item_name,
      unit_price: product.selling_price || 0,
      quantity: item.quantity || 1,
      discount: 0,
      subtotal: (product.selling_price || 0) * (item.quantity || 1),
      variant_id: null,
      variant_label: null,
    });
    setShowProductSearch(false);
    setProductSearch('');
  };

  const handleVariantSelect = (variantId, variantObj) => {
    const label = buildVariantLabel(variantObj);
    const varPrice = variantObj.price ?? variantObj.selling_price ?? null;
    const unitPrice = varPrice !== null ? varPrice : (inventoryItem?.selling_price || item.unit_price || 0);
    const newSubtotal = unitPrice * (item.quantity || 1) - (item.discount || 0);

    onUpdate(index, {
      ...item,
      variant_id: variantId,
      variant_label: label,
      unit_price: unitPrice,
      subtotal: Math.max(0, newSubtotal),
    });
  };

  const handleQtyChange = (qty) => {
    const q = Math.max(1, parseInt(qty) || 1);
    onUpdate(index, { ...item, quantity: q, subtotal: Math.max(0, (item.unit_price || 0) * q - (item.discount || 0)) });
  };

  const handlePriceChange = (price) => {
    const p = parseFloat(price) || 0;
    onUpdate(index, { ...item, unit_price: p, subtotal: Math.max(0, p * (item.quantity || 1) - (item.discount || 0)) });
  };

  const handleDiscountChange = (discount) => {
    const d = parseFloat(discount) || 0;
    onUpdate(index, { ...item, discount: d, subtotal: Math.max(0, (item.unit_price || 0) * (item.quantity || 1) - d) });
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Item #{index + 1}</span>
        <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showProductSearch || !item.inventory_id ? (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-600">Product</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search product name, SKU, ISBN..." className="pl-9 h-9 text-sm" autoFocus />
          </div>
          {filteredProducts.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto shadow-lg">
              {filteredProducts.map(product => {
                const pvariants = getVariants(product);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductSelect(product)}
                    className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                          {product.item_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {product.barcode && `SKU: ${product.barcode}`}
                          {product.current_stock !== undefined && ` · Stock: ${pvariants ? pvariants.reduce((s, v) => s + getVariantStock(v), 0) : product.current_stock}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {pvariants && (
                          <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full px-2 text-[10px] gap-1 inline-flex items-center">
                            <Layers className="w-2.5 h-2.5" />{pvariants.length} variants
                          </Badge>
                        )}
                        <span className="text-sm font-bold text-emerald-600">৳{product.selling_price?.toLocaleString()}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-600">Product</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm font-semibold text-slate-800" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                {item.item_name}
              </p>
              {item.variant_label && (
                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-[10px] font-semibold mt-0.5">
                  <Layers className="w-2.5 h-2.5" />{item.variant_label}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => { setShowProductSearch(true); onUpdate(index, { ...item, inventory_id: null, item_name: '', variant_id: null, variant_label: null }); }}
              className="h-9 px-3 text-xs text-slate-600 flex-shrink-0">
              Change
            </Button>
          </div>
        </div>
      )}

      {inventoryItem && hasVariants && (
        <VariantPicker inventoryItem={inventoryItem} selectedVariantId={item.variant_id} onSelect={handleVariantSelect} />
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-600">Quantity</Label>
          <Input type="number" min="1" value={item.quantity || 1} onChange={e => handleQtyChange(e.target.value)} className="h-9 text-sm text-center font-bold" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-600">Unit Price (৳)</Label>
          <Input type="number" min="0" value={item.unit_price || 0} onChange={e => handlePriceChange(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-600">Discount (৳)</Label>
          <Input type="number" min="0" value={item.discount || 0} onChange={e => handleDiscountChange(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          {item.quantity || 1} × ৳{(item.unit_price || 0).toLocaleString()}
          {(item.discount || 0) > 0 && ` − ৳${(item.discount).toLocaleString()}`}
        </span>
        <span className="text-sm font-bold text-slate-900">৳{(item.subtotal || 0).toLocaleString()}</span>
      </div>
    </div>
  );
}

// ─ Main Form ───────────────────────────────────────────────────────────
export default function OrderForm({ order, customers = [], inventory = [], inventoryMap, onSubmit, onCancel, currentUser, canViewAllDepartments, userDepartment, initialDepartment }) {
  const localInventoryMap = useMemo(() => {
    if (inventoryMap) return inventoryMap;
    const map = new Map();
    inventory.forEach(i => map.set(i.id, i));
    return map;
  }, [inventoryMap, inventory]);

  const emptyItem = () => ({ inventory_id: null, item_name: '', quantity: 1, unit_price: 0, discount: 0, subtotal: 0, variant_id: null, variant_label: null });

  const [formData, setFormData] = useState({
    customer_id: order?.customer_id || null,
    customer_name: order?.customer_name || '',
    customer_phone: order?.customer_phone || '',
    customer_email: order?.customer_email || '',
    order_date: order?.order_date || new Date().toISOString().split('T')[0],
    order_status: order?.order_status || 'pending',
    payment_status: order?.payment_status || 'pending',
    payment_method: order?.payment_method || 'cash_on_delivery',
    shipping_cost: order?.shipping_cost ?? 60,
    discount_amount: order?.discount_amount ?? 0,
    coupon_discount: order?.coupon_discount ?? 0,
    customer_notes: order?.customer_notes || '',
    department: order?.department || initialDepartment || 'prodhan_com_e_commerce',
    shipping_address: order?.shipping_address || { address_line: '', city: '', district: '', postal_code: '', phone: '' },
    order_items: order?.order_items?.length ? order.order_items : [emptyItem()],
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order?.id) {
      setFormData({
        customer_id: order.customer_id || null,
        customer_name: order.customer_name || '',
        customer_phone: order.customer_phone || '',
        customer_email: order.customer_email || '',
        order_date: order.order_date || new Date().toISOString().split('T')[0],
        order_status: order.order_status || 'pending',
        payment_status: order.payment_status || 'pending',
        payment_method: order.payment_method || 'cash_on_delivery',
        shipping_cost: order.shipping_cost ?? 60,
        discount_amount: order.discount_amount ?? 0,
        coupon_discount: order.coupon_discount ?? 0,
        customer_notes: order.customer_notes || '',
        department: order.department || 'prodhan_com_e_commerce',
        shipping_address: order.shipping_address || { address_line: '', city: '', district: '', postal_code: '', phone: '' },
        order_items: order.order_items?.length ? order.order_items : [emptyItem()],
      });
    }
  }, [order?.id]);

  const subtotal = useMemo(() => formData.order_items.reduce((sum, item) => sum + (item.subtotal || 0), 0), [formData.order_items]);
  const totalAmount = useMemo(() => subtotal + (formData.shipping_cost || 0) - (formData.discount_amount || 0) - (formData.coupon_discount || 0), [subtotal, formData.shipping_cost, formData.discount_amount, formData.coupon_discount]);

  const updateItem = useCallback((index, updatedItem) => {
    setFormData(prev => {
      const newItems = [...prev.order_items];
      newItems[index] = updatedItem;
      return { ...prev, order_items: newItems };
    });
  }, []);

  const removeItem = useCallback((index) => {
    setFormData(prev => ({ ...prev, order_items: prev.order_items.filter((_, i) => i !== index) }));
  }, []);

  const addItem = () => {
    setFormData(prev => ({ ...prev, order_items: [...prev.order_items, emptyItem()] }));
  };

  const validate = () => {
    if (!formData.customer_name?.trim()) { 
      toast.error('Customer name is required'); 
      return false; 
    }
    if (!formData.customer_phone?.trim()) { 
      toast.error('Customer phone is required'); 
      return false; 
    }
    if (!formData.order_items || formData.order_items.length === 0) { 
      toast.error('Add at least one item'); 
      return false; 
    }

    for (let i = 0; i < formData.order_items.length; i++) {
      const item = formData.order_items[i];
      if (!item.inventory_id) { 
        toast.error(`Please select a product for item #${i + 1}`); 
        return false; 
      }
      
      const invItem = localInventoryMap.get(item.inventory_id);
      if (!invItem) {
        toast.error(`Product not found for item #${i + 1}`);
        return false;
      }

      const variants = getVariants(invItem);
      if (variants && variants.length > 0) {
        if (item.variant_id === null || item.variant_id === undefined) {
          toast.error(`Please select a variant for: ${item.item_name || 'Unknown Product'}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        subtotal: subtotal,
        total_amount: totalAmount,
        order_number: order?.order_number,
      });
    } catch (err) {
      toast.error('Failed to save order: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const setAddress = (field, value) => setFormData(prev => ({ ...prev, shipping_address: { ...prev.shipping_address, [field]: value } }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center"><User className="w-4 h-4 text-red-600" /></div>
          <h3 className="font-bold text-slate-800">Customer Information</h3>
        </div>

        {customers.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Select Existing Customer</Label>
            <SearchableCustomerSelect
              customers={customers}
              value={formData.customer_id}
              onSelect={(customer) => {
                if (customer) {
                  setFormData(prev => ({
                    ...prev,
                    customer_id: customer.id,
                    customer_name: customer.customer_name || '',
                    customer_phone: customer.customer_phone || '',
                    customer_email: customer.customer_email || '',
                    shipping_address: customer.shipping_addresses?.[0] || prev.shipping_address,
                  }));
                }
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Name <span className="text-red-500">*</span></Label>
            <Input value={formData.customer_name} onChange={e => setField('customer_name', e.target.value)} placeholder="Customer name" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Phone <span className="text-red-500">*</span></Label>
            <Input value={formData.customer_phone} onChange={e => setField('customer_phone', e.target.value)} placeholder="01XXXXXXXXX" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Email</Label>
            <Input value={formData.customer_email} onChange={e => setField('customer_email', e.target.value)} placeholder="optional" className="h-9" />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><MapPin className="w-4 h-4 text-blue-600" /></div>
          <h3 className="font-bold text-slate-800">Shipping Address</h3>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-600">Address</Label>
          <Input value={formData.shipping_address.address_line} onChange={e => setAddress('address_line', e.target.value)} placeholder="House, Road, Area..." className="h-9" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">City</Label>
            <Input value={formData.shipping_address.city} onChange={e => setAddress('city', e.target.value)} placeholder="Dhaka" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">District</Label>
            <Input value={formData.shipping_address.district} onChange={e => setAddress('district', e.target.value)} placeholder="Dhaka" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Postal Code</Label>
            <Input value={formData.shipping_address.postal_code} onChange={e => setAddress('postal_code', e.target.value)} placeholder="1000" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Phone</Label>
            <Input value={formData.shipping_address.phone || ''} onChange={e => setAddress('phone', e.target.value)} placeholder="01X..." className="h-9" />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center"><Package className="w-4 h-4 text-purple-600" /></div>
            <h3 className="font-bold text-slate-800">Order Items</h3>
            <Badge className="bg-slate-100 text-slate-700 rounded-full px-2 text-xs">{formData.order_items.length}</Badge>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <Plus className="w-3.5 h-3.5" />Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {formData.order_items.map((item, index) => (
            <OrderItemRow
              key={index}
              item={item}
              index={index}
              inventory={inventory}
              inventoryMap={localInventoryMap}
              onUpdate={updateItem}
              onRemove={removeItem}
            />
          ))}
        </div>

        {formData.order_items.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">No items added yet</p>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2 gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />Add First Item
            </Button>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><CreditCard className="w-4 h-4 text-amber-600" /></div>
          <h3 className="font-bold text-slate-800">Order Details</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Order Date</Label>
            <Input type="date" value={formData.order_date?.split('T')[0] || ''} onChange={e => setField('order_date', e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Order Status</Label>
            <Select value={formData.order_status} onValueChange={v => setField('order_status', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="packed">Packed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Payment Status</Label>
            <Select value={formData.payment_status} onValueChange={v => setField('payment_status', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Payment Method</Label>
            <Select value={formData.payment_method} onValueChange={v => setField('payment_method', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Shipping (৳)</Label>
            <Input type="number" min="0" value={formData.shipping_cost} onChange={e => setField('shipping_cost', parseFloat(e.target.value) || 0)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Discount (৳)</Label>
            <Input type="number" min="0" value={formData.discount_amount} onChange={e => setField('discount_amount', parseFloat(e.target.value) || 0)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Coupon Discount (৳)</Label>
            <Input type="number" min="0" value={formData.coupon_discount} onChange={e => setField('coupon_discount', parseFloat(e.target.value) || 0)} className="h-9" />
          </div>
        </div>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span><span className="font-semibold">৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Shipping</span><span>+ ৳{(formData.shipping_cost || 0).toLocaleString()}</span>
            </div>
            {(formData.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount</span><span>− ৳{formData.discount_amount.toLocaleString()}</span>
              </div>
            )}
            {(formData.coupon_discount || 0) > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Coupon</span><span>− ৳{formData.coupon_discount.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Total</span>
              <span className="text-lg text-emerald-700">৳{totalAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold text-slate-600">Customer Notes</Label>
        <Textarea value={formData.customer_notes} onChange={e => setField('customer_notes', e.target.value)} placeholder="Any special instructions..." rows={2} className="resize-none text-sm" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold shadow-lg shadow-red-500/25">
          {submitting ? 'Saving...' : order?.id ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
}
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, XCircle, AlertCircle, Package, Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SearchableProductSelect from '@/components/common/SearchableProductSelect';

export default function DamageForm({ inventory, onSubmit, onCancel, initialData }) {
  const [formData, setFormData] = useState(initialData || {
    inventory_item_id: '',
    quantity: 1,
    reason: '',
    order_number: '',
    order_date: '',
    customer_name: '',
    customer_phone: '',
    supplier_name: '',
    damage_source: 'warehouse', // warehouse, supplier, courier, customer_return
    financial_impact: 0,
    notes: '',
    incident_date: new Date().toISOString().split('T')[0]
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isManualFinancialImpact, setIsManualFinancialImpact] = useState(false);
  const [productItems, setProductItems] = useState([]);
  const [showOrderSearch, setShowOrderSearch] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderSearchResults, setOrderSearchResults] = useState([]);
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState(null);

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders-for-damage-lookup'],
    queryFn: () => erp.entities.Order.list('-order_date', 5000),
    staleTime: 5 * 60 * 1000
  });

  const handleOrderSearch = async (query) => {
    if (!query || query.length < 2) { setOrderSearchResults([]); return; }
    setIsSearchingOrder(true);
    try {
      const q = query.toLowerCase();
      const results = allOrders.filter(o =>
        (o.order_number || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').includes(query) ||
        (o.customer_name || '').toLowerCase().includes(q)
      ).slice(0, 10);
      setOrderSearchResults(results);
    } finally { setIsSearchingOrder(false); }
  };

  const handleSelectOrder = (order) => {
    setMatchedOrder(order);
    setFormData(prev => ({
      ...prev,
      order_number: order.order_number || '',
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      order_date: order.order_date || ''
    }));
    setOrderSearchQuery(order.order_number || '');
    setOrderSearchResults([]);

    // Auto-populate products from order
    if (order.order_items?.length > 0) {
      const autoItems = [];
      for (const oi of order.order_items) {
        const invItem = inventory.find(i => i.id === oi.inventory_id || i.item_name === oi.item_name);
        if (invItem) {
          const qty = oi.quantity || 1;
          autoItems.push({
            id: `${Date.now()}-${invItem.id}`,
            inventory_item_id: invItem.id,
            product_name: invItem.item_name,
            quantity: qty,
            financial_impact: (invItem.purchase_price || 0) * qty,
            unit_price: invItem.purchase_price || 0
          });
        }
      }
      if (autoItems.length > 0) {
        setProductItems(autoItems);
        toast.success(`Order ${order.order_number} linked — ${autoItems.length} product(s) auto-added to damage list`);
      } else {
        toast.success(`Order ${order.order_number} linked — add products manually`);
      }
    } else {
      toast.success(`Order ${order.order_number} linked`);
    }
  };

  // Auto-calculate financial impact based on purchase price
  useEffect(() => {
    if (selectedProduct && !isManualFinancialImpact) {
      const impact = (selectedProduct.purchase_price || 0) * formData.quantity;
      setFormData(prev => ({ ...prev, financial_impact: impact }));
    }
  }, [selectedProduct, formData.quantity, isManualFinancialImpact]);

  // Load initial data for editing
  useEffect(() => {
    if (initialData && inventory.length > 0) {
      const item = inventory.find(i => i.id === initialData.inventory_item_id);
      if (item) {
        setSelectedProduct(item);
        if (initialData.id) {
          setProductItems([{
            id: initialData.id,
            inventory_item_id: initialData.inventory_item_id,
            product_name: item.item_name,
            quantity: initialData.quantity,
            financial_impact: initialData.financial_impact,
            unit_price: item.purchase_price || 0
          }]);
        }
        // If there's order info, show the section
        if (initialData.order_number) {
          setShowOrderSearch(true);
          setOrderSearchQuery(initialData.order_number);
        }
      }
    }
  }, [initialData, inventory]);

  const handleProductChange = (value) => {
    const item = inventory.find(i => i.id === value);
    setSelectedProduct(item);
    setFormData(prev => ({
      ...prev, inventory_item_id: value,
      financial_impact: item ? (item.purchase_price || 0) * parseInt(prev.quantity) : 0
    }));
    setIsManualFinancialImpact(false);
  };

  const handleAddProduct = () => {
    if (!formData.inventory_item_id || !formData.quantity || formData.quantity <= 0) {
      toast.error('Please select a product and enter valid quantity'); return;
    }
    const product = inventory.find(i => i.id === formData.inventory_item_id);
    if (!product) { toast.error('Product not found'); return; }

    setProductItems(prev => [...prev, {
      id: Date.now().toString(),
      inventory_item_id: formData.inventory_item_id,
      product_name: product.item_name,
      quantity: formData.quantity,
      financial_impact: formData.financial_impact,
      unit_price: product.purchase_price || 0
    }]);
    setFormData(prev => ({ ...prev, inventory_item_id: '', quantity: 1, financial_impact: 0 }));
    setSelectedProduct(null);
    toast.success('Product added to damage list');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (productItems.length === 0) { toast.error('Please add at least one product'); return; }
    if (!formData.reason) { toast.error('Please provide a reason'); return; }

    // Map to downstream-compatible format with full damaged breakdown
    const mappedItems = productItems.map(item => ({
      ...item,
      return_type: 'damage',
      condition_breakdown: {
        good: { quantity: 0, action: 'write_off' },
        fair: { quantity: 0, action: 'write_off' },
        damaged: { quantity: item.quantity, action: 'write_off' }
      },
      restocking_fee: 0
    }));

    onSubmit({
      items: mappedItems,
      type: 'damage',
      return_type: 'damage',
      reason: formData.reason,
      order_number: formData.order_number,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      supplier_name: formData.supplier_name,
      order_date: formData.order_date,
      notes: formData.notes,
      incident_date: formData.incident_date
    });
  };

  const DAMAGE_SOURCE_LABELS = {
    warehouse: { label: 'Warehouse / Storage', color: 'border-orange-400 bg-orange-50' },
    supplier: { label: 'Received from Supplier', color: 'border-purple-400 bg-purple-50' },
    courier: { label: 'Courier / Transit', color: 'border-blue-400 bg-blue-50' },
    customer_return: { label: 'Customer Return (Damaged)', color: 'border-red-400 bg-red-50' },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Damage Banner */}
      <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-2 border-red-300">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="font-bold text-red-800">Damage / Defective Product Entry</span>
        </div>
        <p className="text-xs text-red-600">All damaged items are written off from stock. Use this for warehouse damage, supplier defects, courier damage, or returned damaged goods.</p>
      </div>

      {/* Damage Source */}
      <div>
        <Label className="font-semibold mb-2 block">Damage Source *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(DAMAGE_SOURCE_LABELS).map(([key, config]) => (
            <button key={key} type="button" onClick={() => {
              setFormData({ ...formData, damage_source: key });
              if (key === 'customer_return' || key === 'courier') setShowOrderSearch(true);
            }}
              className={`p-3 rounded-lg border-2 transition-all text-left ${formData.damage_source === key ? `${config.color} shadow-md font-semibold` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <p className="text-xs font-medium">{config.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Optional: Link to Order */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button type="button" onClick={() => setShowOrderSearch(!showOrderSearch)}
          className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Link to Order (Optional)</span>
            {matchedOrder && <Badge className="bg-green-100 text-green-800 text-xs">{matchedOrder.order_number}</Badge>}
          </div>
          {showOrderSearch ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showOrderSearch && (
          <div className="p-3 space-y-3 border-t border-slate-200">
            <div className="relative">
              <Input placeholder="Search by Order ID, Phone, or Customer Name..." value={orderSearchQuery}
                onChange={(e) => { setOrderSearchQuery(e.target.value); handleOrderSearch(e.target.value); }}
                className="pr-10" />
              {isSearchingOrder && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
            </div>
            {orderSearchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-lg bg-white shadow-lg">
                {orderSearchResults.map((order) => (
                  <button key={order.id} type="button" onClick={() => handleSelectOrder(order)}
                    className="w-full p-3 text-left hover:bg-slate-50 border-b last:border-b-0 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{order.order_number}</p>
                        <p className="text-xs text-slate-600">{order.customer_name} • {order.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">{order.order_status}</Badge>
                        <p className="text-xs text-slate-500 mt-1">৳{(order.total_amount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {matchedOrder && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-slate-500">Order #</p><p className="font-medium">{matchedOrder.order_number}</p></div>
                  <div><p className="text-slate-500">Customer</p><p className="font-medium">{matchedOrder.customer_name}</p></div>
                  <div><p className="text-slate-500">Phone</p><p className="font-medium">{matchedOrder.customer_phone}</p></div>
                  <div><p className="text-slate-500">Status</p><p className="font-medium">{matchedOrder.order_status}</p></div>
                </div>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => { setMatchedOrder(null); setOrderSearchQuery('');
                    setFormData(prev => ({ ...prev, order_number: '', customer_name: '', customer_phone: '', order_date: '' })); }}
                  className="mt-2 text-red-600 hover:bg-red-50 text-xs">
                  <XCircle className="w-3 h-3 mr-1" /> Unlink Order
                </Button>
              </div>
            )}
            {/* Manual entry if no order */}
            {!matchedOrder && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <Label className="text-xs">Order # (manual)</Label>
                  <Input value={formData.order_number} onChange={(e) => setFormData({ ...formData, order_number: e.target.value })} placeholder="e.g. ORD-12345" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Customer Name</Label>
                  <Input value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} placeholder="Optional" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Customer Phone</Label>
                  <Input value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} placeholder="Optional" className="h-9" />
                </div>
                {formData.damage_source === 'supplier' && (
                  <div>
                    <Label className="text-xs">Supplier Name</Label>
                    <Input value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} placeholder="Supplier" className="h-9" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Added Products List */}
      {productItems.length > 0 && (
        <Card className="bg-red-50 border-2 border-red-300">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-red-600" /> Damaged Products ({productItems.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {productItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} • Loss: ৳{(item.financial_impact || 0).toLocaleString()}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setProductItems(productItems.filter(i => i.id !== item.id))} className="text-red-600 hover:bg-red-50">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="p-2 bg-red-100 rounded-lg text-center">
                <p className="text-sm font-semibold text-red-800">
                  Total Loss: ৳{productItems.reduce((sum, i) => sum + (parseFloat(i.financial_impact) || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product + Quantity + Reason */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="font-semibold">Select Product *</Label>
          <SearchableProductSelect inventory={inventory} value={formData.inventory_item_id} onValueChange={handleProductChange}
            placeholder="Search by name, ISBN, SKU..." showStock={true} showPrice={true} />
          {selectedProduct && (
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-slate-50 rounded-lg space-y-0.5">
              <p>Current Stock: {selectedProduct.current_stock}</p>
              <p>Purchase Price: ৳{selectedProduct.purchase_price?.toLocaleString()}</p>
            </div>
          )}
        </div>
        <div>
          <Label>Quantity Damaged *</Label>
          <Input type="number" min="1" value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))} required />
        </div>

        <div>
          <Label className="font-semibold">Damage Reason *</Label>
          <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
            <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="received_damaged">Received Damaged from Supplier</SelectItem>
              <SelectItem value="warehouse_damage">Damaged in Warehouse</SelectItem>
              <SelectItem value="transit_damage">Damaged in Transit</SelectItem>
              <SelectItem value="water_damage">Water Damage</SelectItem>
              <SelectItem value="fire_damage">Fire/Heat Damage</SelectItem>
              <SelectItem value="expired">Expired Product</SelectItem>
              <SelectItem value="manufacturing_defect">Manufacturing Defect</SelectItem>
              <SelectItem value="handling_damage">Mishandling Damage</SelectItem>
              <SelectItem value="theft">Theft/Missing</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Action</Label>
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">Write-off (Deducted from inventory)</span>
          </div>
        </div>

        <div>
          <Label>Incident Date *</Label>
          <Input type="date" value={formData.incident_date} onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })} required />
        </div>

        <div className="relative">
          <Label className="flex items-center justify-between">
            <span>Loss Value (৳)</span>
            {isManualFinancialImpact && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsManualFinancialImpact(false)} className="h-6 text-xs gap-1 text-blue-600">
                <Calculator className="w-3 h-3" /> Auto-Calculate
              </Button>
            )}
          </Label>
          <Input type="number" step="0.01" value={formData.financial_impact}
            onChange={(e) => { setFormData(prev => ({ ...prev, financial_impact: e.target.value })); setIsManualFinancialImpact(true); }} />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={handleAddProduct} variant="outline" className="border-2 border-red-400 text-red-700 hover:bg-red-50">
          Add to Damage List
        </Button>
      </div>

      <div>
        <Label>Detailed Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Describe the damage, location found, corrective actions taken..." rows={3} />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={productItems.length === 0}>
          Submit {productItems.length} Damaged Item{productItems.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </form>
  );
}
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, CheckCircle, XCircle, AlertCircle, Package, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SearchableProductSelect from '@/components/common/SearchableProductSelect';

export default function ReturnForm({ inventory, onSubmit, onCancel, initialData }) {
  const [formData, setFormData] = useState(initialData || {
    inventory_item_id: '',
    return_type: 'sales_return',
    quantity: 1,
    condition_breakdown: {
      good: { quantity: 0, action: 'restock' },
      fair: { quantity: 0, action: 'return_to_supplier' },
    },
    reason: '',
    order_number: '',
    order_date: '',
    customer_name: '',
    customer_phone: '',
    supplier_name: '',
    financial_impact: 0,
    restocking_fee: 0,
    notes: '',
    incident_date: new Date().toISOString().split('T')[0]
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productItems, setProductItems] = useState([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState(null);
  const [orderSearchResults, setOrderSearchResults] = useState([]);

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders-for-return-lookup'],
    queryFn: () => base44.entities.Order.list('-order_date', 5000),
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
            return_type: formData.return_type,
            condition_breakdown: {
              good: { quantity: qty, action: 'restock' },
              fair: { quantity: 0, action: 'return_to_supplier' },
            },
            financial_impact: (invItem.selling_price || 0) * qty,
            restocking_fee: 0,
            unit_price: invItem.selling_price || 0
          });
        }
      }
      if (autoItems.length > 0) {
        setProductItems(autoItems);
        // Also select the first product in the form for convenience
        const firstItem = autoItems[0];
        const invItem = inventory.find(i => i.id === firstItem.inventory_item_id);
        if (invItem) {
          setSelectedProduct(invItem);
          setFormData(prev => ({
            ...prev,
            inventory_item_id: firstItem.inventory_item_id,
            quantity: firstItem.quantity,
            condition_breakdown: firstItem.condition_breakdown,
            financial_impact: firstItem.financial_impact,
          }));
        }
        toast.success(`Order ${order.order_number} loaded — ${autoItems.length} product(s) auto-added`);
      } else {
        toast.success(`Order ${order.order_number} loaded — customer details auto-filled`);
      }
    } else {
      toast.success(`Order ${order.order_number} loaded — customer details auto-filled`);
    }
  };

  // Auto-sync condition breakdown total with quantity
  useEffect(() => {
    if (formData.return_type === 'sales_return') {
      const total = formData.condition_breakdown.good.quantity + formData.condition_breakdown.fair.quantity;
      if (total !== formData.quantity && total === 0 && formData.quantity > 0) {
        setFormData(prev => ({
          ...prev,
          condition_breakdown: {
            good: { quantity: formData.quantity, action: 'restock' },
            fair: { quantity: 0, action: 'return_to_supplier' },
          }
        }));
      }
    }
  }, [formData.quantity, formData.return_type]);

  // No auto-calculation — financial impact is always manually entered by user

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
            return_type: initialData.return_type,
            condition_breakdown: initialData.condition_breakdown,
            financial_impact: initialData.financial_impact,
            restocking_fee: initialData.restocking_fee,
            unit_price: item.selling_price || 0
          }]);
        }
      }
    }
  }, [initialData, inventory]);

  const handleProductChange = (value) => {
    const item = inventory.find(i => i.id === value);
    setSelectedProduct(item);
    setFormData(prev => ({
      ...prev,
      inventory_item_id: value
    }));
  };

  const handleAddProduct = () => {
    if (!formData.inventory_item_id || !formData.quantity || formData.quantity <= 0) {
      toast.error('Please select a product and enter valid quantity');
      return;
    }
    const product = inventory.find(i => i.id === formData.inventory_item_id);
    if (!product) { toast.error('Product not found'); return; }

    const newItem = {
      id: Date.now().toString(),
      inventory_item_id: formData.inventory_item_id,
      product_name: product.item_name,
      quantity: formData.quantity,
      return_type: formData.return_type,
      condition_breakdown: { ...formData.condition_breakdown },
      financial_impact: formData.financial_impact,
      restocking_fee: formData.restocking_fee,
      unit_price: product.selling_price || 0
    };
    setProductItems([...productItems, newItem]);
    setFormData(prev => ({
      ...prev, inventory_item_id: '', quantity: 1,
      condition_breakdown: { good: { quantity: 0, action: 'restock' }, fair: { quantity: 0, action: 'return_to_supplier' } },
      financial_impact: 0, restocking_fee: 0
    }));
    setSelectedProduct(null);
    toast.success('Product added to return list');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.return_type === 'sales_return' && !formData.order_number) {
      toast.error('Order ID is required for sales returns'); return;
    }
    if (productItems.length === 0) { toast.error('Please add at least one product'); return; }
    if (!formData.reason) { toast.error('Please provide a reason'); return; }

    // Map condition_breakdown to include a zero damaged entry for downstream compatibility
    const mappedItems = productItems.map(item => ({
      ...item,
      condition_breakdown: {
        good: item.condition_breakdown.good,
        fair: item.condition_breakdown.fair,
        damaged: { quantity: 0, action: 'write_off' }
      }
    }));

    onSubmit({
      items: mappedItems,
      type: 'return',
      return_type: formData.return_type,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Return Type Selection */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
        <Label className="text-sm font-semibold mb-3 block">Return Type *</Label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setFormData({ ...formData, return_type: 'sales_return' })}
            className={`p-3 rounded-lg border-2 transition-all ${formData.return_type === 'sales_return' ? 'border-blue-500 bg-blue-100 shadow-md' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
            <p className="font-semibold text-sm">Sales Return</p>
            <p className="text-xs text-muted-foreground">Customer returned product</p>
          </button>
          <button type="button" onClick={() => setFormData({ ...formData, return_type: 'purchase_return' })}
            className={`p-3 rounded-lg border-2 transition-all ${formData.return_type === 'purchase_return' ? 'border-purple-500 bg-purple-100 shadow-md' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
            <p className="font-semibold text-sm">Purchase Return</p>
            <p className="text-xs text-muted-foreground">Returned to supplier</p>
          </button>
        </div>
      </div>

      {/* Order Search — Sales Returns */}
      {formData.return_type === 'sales_return' && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" /> Search Order ID (Required) *
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input placeholder="Search by Order ID, Phone, or Customer Name..." value={orderSearchQuery}
                onChange={(e) => { setOrderSearchQuery(e.target.value); handleOrderSearch(e.target.value); }}
                className="pr-10 border-amber-300" />
              {isSearchingOrder && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-amber-600" />}
            </div>
            {orderSearchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-amber-200 rounded-lg bg-white shadow-lg">
                {orderSearchResults.map((order) => (
                  <button key={order.id} type="button" onClick={() => handleSelectOrder(order)}
                    className="w-full p-3 text-left hover:bg-amber-50 border-b border-amber-100 last:border-b-0 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-amber-900">{order.order_number}</p>
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
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-800">Order Found</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-slate-500">Order #</p><p className="font-medium">{matchedOrder.order_number}</p></div>
                  <div><p className="text-slate-500">Customer</p><p className="font-medium">{matchedOrder.customer_name}</p></div>
                  <div><p className="text-slate-500">Phone</p><p className="font-medium">{matchedOrder.customer_phone}</p></div>
                  <div><p className="text-slate-500">Amount</p><p className="font-medium">৳{(matchedOrder.total_amount || 0).toLocaleString()}</p></div>
                </div>
                {matchedOrder.order_items?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-slate-500 mb-1">Order Items (auto-added):</p>
                    <div className="flex flex-wrap gap-1">
                      {matchedOrder.order_items.map((oi, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {oi.item_name || 'Product'} ×{oi.quantity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => { setMatchedOrder(null); setOrderSearchQuery(''); setProductItems([]);
                    setFormData(prev => ({ ...prev, order_number: '', customer_name: '', customer_phone: '', order_date: '' })); }}
                  className="mt-2 text-red-600 hover:bg-red-50 text-xs">
                  <XCircle className="w-3 h-3 mr-1" /> Clear Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Added Products List */}
      {productItems.length > 0 && (
        <Card className="bg-violet-50 border-2 border-violet-300">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Products to Return ({productItems.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {productItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-violet-200">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} • Unit: ৳{(item.unit_price || 0).toLocaleString()} • Impact: ৳{(item.financial_impact || 0).toLocaleString()}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setProductItems(productItems.filter(i => i.id !== item.id))} className="text-red-600 hover:bg-red-50">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="font-semibold">Select Product *</Label>
          <SearchableProductSelect inventory={inventory} value={formData.inventory_item_id} onValueChange={handleProductChange}
            placeholder="Search by name, ISBN, SKU..." showStock={true} showPrice={true} />
          {selectedProduct && (
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-slate-50 rounded-lg space-y-0.5">
              <p>Purchase Price: ৳{selectedProduct.purchase_price?.toLocaleString()}</p>
              <p>Selling Price: ৳{selectedProduct.selling_price?.toLocaleString()}</p>
            </div>
          )}
        </div>
        <div>
          <Label>Total Quantity *</Label>
          <Input type="number" min="1" value={formData.quantity}
            onChange={(e) => {
              const qty = parseInt(e.target.value) || 0;
              setFormData(prev => ({ ...prev, quantity: qty,
                condition_breakdown: { good: { quantity: qty, action: 'restock' }, fair: { quantity: 0, action: 'return_to_supplier' } }
              }));
            }} required />
        </div>

        {formData.return_type === 'sales_return' && (
          <>
            <div>
              <Label>Order Number * (Required)</Label>
              <Input value={formData.order_number} onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                placeholder="ORD-XXXX" required className="border-amber-300" />
            </div>
            <div>
              <Label>Customer Name</Label>
              <Input value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Auto-filled from order" readOnly={!!matchedOrder} className={matchedOrder ? 'bg-slate-50' : ''} />
            </div>
            <div>
              <Label>Customer Phone</Label>
              <Input value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="Auto-filled from order" readOnly={!!matchedOrder} className={matchedOrder ? 'bg-slate-50' : ''} />
            </div>
          </>
        )}

        {formData.return_type === 'purchase_return' && (
          <div className="md:col-span-2">
            <Label>Supplier Name *</Label>
            <Input value={formData.supplier_name || selectedProduct?.supplier_name || ''}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} placeholder="Supplier name" required />
          </div>
        )}

        <div>
          <Label className="font-semibold">Reason *</Label>
          <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
            <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="defective">Defective Product</SelectItem>
              <SelectItem value="wrong_item">Wrong Item Delivered</SelectItem>
              <SelectItem value="quality_issue">Quality Issue</SelectItem>
              <SelectItem value="late_delivery">Late Delivery</SelectItem>
              <SelectItem value="customer_changed_mind">Customer Changed Mind</SelectItem>
              <SelectItem value="size_color_issue">Size/Color Issue</SelectItem>
              <SelectItem value="not_as_described">Not As Described</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Condition Breakdown — Good & Fair only (NO Damaged) */}
        {formData.return_type === 'sales_return' && (
          <div className="md:col-span-2">
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  📦 Product Condition & Action Breakdown
                  <Badge variant="outline" className={
                    (formData.condition_breakdown.good.quantity + formData.condition_breakdown.fair.quantity) === formData.quantity
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }>
                    Total: {formData.condition_breakdown.good.quantity + formData.condition_breakdown.fair.quantity} / {formData.quantity}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Good */}
                  <div className="space-y-3 p-4 bg-white rounded-xl border-2 border-green-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-green-700 font-semibold">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Good Condition
                      </Label>
                      <Badge className="bg-green-100 text-green-800 text-xs">100% value</Badge>
                    </div>
                    <Input type="number" min="0" max={formData.quantity}
                      value={formData.condition_breakdown.good.quantity}
                      onChange={(e) => setFormData({ ...formData, condition_breakdown: { ...formData.condition_breakdown, good: { ...formData.condition_breakdown.good, quantity: parseInt(e.target.value) || 0 } } })}
                      className="border-green-400 text-center font-bold text-lg h-12" />
                    <Select value={formData.condition_breakdown.good.action}
                      onValueChange={(value) => setFormData({ ...formData, condition_breakdown: { ...formData.condition_breakdown, good: { ...formData.condition_breakdown.good, action: value } } })}>
                      <SelectTrigger className="border-green-300 bg-green-50 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restock"><span className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-600" /> Restock</span></SelectItem>
                        <SelectItem value="return_to_supplier"><span className="flex items-center gap-2"><AlertCircle className="w-3 h-3 text-orange-600" /> Return to Supplier</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Fair */}
                  <div className="space-y-3 p-4 bg-white rounded-xl border-2 border-orange-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-orange-700 font-semibold">
                        <AlertCircle className="w-4 h-4 text-orange-600" /> Fair (Minor Issues)
                      </Label>
                      <Badge className="bg-orange-100 text-orange-800 text-xs">70% value</Badge>
                    </div>
                    <Input type="number" min="0" max={formData.quantity}
                      value={formData.condition_breakdown.fair.quantity}
                      onChange={(e) => setFormData({ ...formData, condition_breakdown: { ...formData.condition_breakdown, fair: { ...formData.condition_breakdown.fair, quantity: parseInt(e.target.value) || 0 } } })}
                      className="border-orange-400 text-center font-bold text-lg h-12" />
                    <Select value={formData.condition_breakdown.fair.action}
                      onValueChange={(value) => setFormData({ ...formData, condition_breakdown: { ...formData.condition_breakdown, fair: { ...formData.condition_breakdown.fair, action: value } } })}>
                      <SelectTrigger className="border-orange-300 bg-orange-50 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restock">Restock (Repair)</SelectItem>
                        <SelectItem value="return_to_supplier">Return to Supplier</SelectItem>
                        <SelectItem value="write_off">Write-off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Purchase Return: simple action selector */}
        {formData.return_type === 'purchase_return' && (
          <div>
            <Label className="flex items-center gap-2">Action</Label>
            <Select value={formData.condition_breakdown.good.action} onValueChange={(value) => setFormData({
              ...formData,
              condition_breakdown: {
                good: { ...formData.condition_breakdown.good, action: value },
                fair: { ...formData.condition_breakdown.fair, action: value },
              }
            })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">Restock (Add back to inventory)</SelectItem>
                <SelectItem value="return_to_supplier">Return to Supplier</SelectItem>
                <SelectItem value="write_off">Write-off (Total Loss)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Incident Date *</Label>
          <Input type="date" value={formData.incident_date} onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })} required />
        </div>

        <div className="relative">
          <Label className="flex items-center justify-between">
            <span>Financial Impact (৳) *</span>
            <span className="text-xs text-muted-foreground">Enter manually</span>
          </Label>
          <Input type="number" step="0.01" value={formData.financial_impact}
            onChange={(e) => setFormData(prev => ({ ...prev, financial_impact: parseFloat(e.target.value) || 0 }))
            } placeholder="Enter financial impact amount" />
        </div>

        {(formData.condition_breakdown.good.action === 'restock' || formData.condition_breakdown.fair.action === 'restock') && (
          <div>
            <Label>Restocking Fee (৳)</Label>
            <Input type="number" step="0.01" value={formData.restocking_fee}
              onChange={(e) => setFormData({ ...formData, restocking_fee: e.target.value })} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={handleAddProduct} variant="outline" className="border-2 border-violet-500 text-violet-700 hover:bg-violet-50">
          Add Product to List
        </Button>
      </div>

      <div>
        <Label>Detailed Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add any additional notes about this return..." rows={3} />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-blue-600" disabled={productItems.length === 0}>
          Submit {productItems.length} Product{productItems.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </form>
  );
}
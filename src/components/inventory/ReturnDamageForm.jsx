import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, Info, CheckCircle, XCircle, AlertCircle, Package, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SearchableProductSelect from '@/components/common/SearchableProductSelect';

export default function ReturnDamageForm({ inventory, onSubmit, onCancel, type = 'return', initialData }) {
  const [formData, setFormData] = useState(initialData || {
    inventory_item_id: '',
    return_type: 'sales_return',
    quantity: 1,
    condition_breakdown: {
      good: { quantity: 0, action: 'restock' },
      fair: { quantity: 0, action: 'return_to_supplier' },
      damaged: { quantity: 0, action: 'write_off' }
    },
    reason: '',
    order_number: '',
    order_date: '',
    customer_name: '',
    customer_phone: '',
    supplier_name: '',
    condition: type === 'return' ? 'good' : 'damaged',
    financial_impact: 0,
    restocking_fee: 0,
    notes: '',
    incident_date: new Date().toISOString().split('T')[0]
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isManualFinancialImpact, setIsManualFinancialImpact] = useState(false);
  const [productItems, setProductItems] = useState([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [matchedOrder, setMatchedOrder] = useState(null);
  const [orderSearchResults, setOrderSearchResults] = useState([]);

  // Fetch orders for lookup
  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders-for-return-lookup'],
    queryFn: () => base44.entities.Order.list('-order_date', 5000),
    staleTime: 5 * 60 * 1000
  });

  // Search orders by order number
  const handleOrderSearch = async (query) => {
    if (!query || query.length < 2) {
      setOrderSearchResults([]);
      return;
    }
    
    setIsSearchingOrder(true);
    try {
      const searchLower = query.toLowerCase();
      const results = allOrders.filter(o => 
        (o.order_number || '').toLowerCase().includes(searchLower) ||
        (o.customer_phone || '').includes(query) ||
        (o.customer_name || '').toLowerCase().includes(searchLower)
      ).slice(0, 10);
      
      setOrderSearchResults(results);
    } finally {
      setIsSearchingOrder(false);
    }
  };

  // Select an order and auto-fill customer details
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
    toast.success(`Order ${order.order_number} loaded - customer details auto-filled`);
  };

  // Auto-sync condition breakdown with total quantity
  useEffect(() => {
    if (formData.return_type === 'sales_return') {
      const total = formData.condition_breakdown.good.quantity + 
                   formData.condition_breakdown.fair.quantity + 
                   formData.condition_breakdown.damaged.quantity;
      
      if (total !== formData.quantity && total === 0 && formData.quantity > 0) {
        setFormData(prev => ({
          ...prev,
          condition_breakdown: {
            good: { quantity: formData.quantity, action: 'restock' },
            fair: { quantity: 0, action: 'return_to_supplier' },
            damaged: { quantity: 0, action: 'write_off' }
          }
        }));
      }
    }
  }, [formData.quantity, formData.return_type]);

  // Auto-calculate financial impact with condition breakdown
  useEffect(() => {
    if (selectedProduct && !isManualFinancialImpact) {
      let calculatedImpact = 0;

      if (formData.return_type === 'sales_return') {
        const { good, fair, damaged } = formData.condition_breakdown;
        
        const goodValue = good.action === 'restock' ? good.quantity * selectedProduct.selling_price : 
                         good.action === 'return_to_supplier' ? good.quantity * selectedProduct.purchase_price * 0.8 : 0;
        const fairValue = fair.action === 'restock' ? fair.quantity * selectedProduct.selling_price * 0.7 :
                         fair.action === 'return_to_supplier' ? fair.quantity * selectedProduct.purchase_price * 0.5 : 0;
        const damagedValue = damaged.action === 'write_off' ? 0 : 
                            damaged.action === 'return_to_supplier' ? damaged.quantity * selectedProduct.purchase_price * 0.2 : 0;
        
        calculatedImpact = goodValue + fairValue + damagedValue - (formData.restocking_fee || 0);
      } else {
        calculatedImpact = selectedProduct.purchase_price * formData.quantity - (formData.restocking_fee || 0);
      }

      setFormData(prev => ({
        ...prev,
        financial_impact: calculatedImpact
      }));
    }
  }, [selectedProduct, formData.condition_breakdown, formData.quantity, formData.return_type, formData.restocking_fee, isManualFinancialImpact]);

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
    
    const priceToUse = formData.return_type === 'purchase_return' 
      ? item?.purchase_price 
      : item?.selling_price;
    const calculatedImpact = item ? priceToUse * parseInt(formData.quantity) : 0;
    
    setFormData(prev => ({
      ...prev,
      inventory_item_id: value,
      financial_impact: calculatedImpact
    }));
    setIsManualFinancialImpact(false);
  };

  const handleFinancialImpactChange = (value) => {
    setFormData(prev => ({ ...prev, financial_impact: value }));
    setIsManualFinancialImpact(true);
  };

  const resetToAutoCalculate = () => {
    setIsManualFinancialImpact(false);
    toast.success('Financial impact will auto-calculate');
  };

  const handleAddProduct = () => {
    if (!formData.inventory_item_id || !formData.quantity || formData.quantity <= 0) {
      toast.error('Please select a product and enter valid quantity');
      return;
    }

    const product = inventory.find(i => i.id === formData.inventory_item_id);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      inventory_item_id: formData.inventory_item_id,
      product_name: product.item_name,
      quantity: formData.quantity,
      return_type: formData.return_type,
      condition_breakdown: {...formData.condition_breakdown},
      financial_impact: formData.financial_impact,
      restocking_fee: formData.restocking_fee,
      unit_price: product.selling_price || 0
    };

    setProductItems([...productItems, newItem]);
    
    setFormData({
      ...formData,
      inventory_item_id: '',
      quantity: 1,
      condition_breakdown: {
        good: { quantity: 0, action: 'restock' },
        fair: { quantity: 0, action: 'return_to_supplier' },
        damaged: { quantity: 0, action: 'write_off' }
      },
      financial_impact: 0,
      restocking_fee: 0
    });
    setSelectedProduct(null);
    toast.success('Product added to return list');
  };

  const handleRemoveProduct = (itemId) => {
    setProductItems(productItems.filter(i => i.id !== itemId));
    toast.success('Product removed');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate Order ID is required
    if (type === 'return' && formData.return_type === 'sales_return' && !formData.order_number) {
      toast.error('Order ID is required for sales returns');
      return;
    }

    if (productItems.length === 0) {
      toast.error('Please add at least one product to return/damage');
      return;
    }

    if (!formData.reason) {
      toast.error('Please provide a reason');
      return;
    }

    onSubmit({
      items: productItems,
      type,
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
      {type === 'return' && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
          <Label className="text-sm font-semibold mb-3 block">Return Type *</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({...formData, return_type: 'sales_return'})}
              className={`p-3 rounded-lg border-2 transition-all ${
                formData.return_type === 'sales_return'
                  ? 'border-blue-500 bg-blue-100 shadow-md'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <p className="font-semibold text-sm">Sales Return</p>
              <p className="text-xs text-muted-foreground">Customer returned product</p>
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, return_type: 'purchase_return'})}
              className={`p-3 rounded-lg border-2 transition-all ${
                formData.return_type === 'purchase_return'
                  ? 'border-purple-500 bg-purple-100 shadow-md'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <p className="font-semibold text-sm">Purchase Return</p>
              <p className="text-xs text-muted-foreground">Returned to supplier</p>
            </button>
          </div>
        </div>
      )}

      {/* Order ID Search - REQUIRED for sales returns */}
      {type === 'return' && formData.return_type === 'sales_return' && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" />
              Search Order ID (Required) *
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Search by Order ID, Phone, or Customer Name..."
                value={orderSearchQuery}
                onChange={(e) => {
                  setOrderSearchQuery(e.target.value);
                  handleOrderSearch(e.target.value);
                }}
                className="pr-10 border-amber-300"
              />
              {isSearchingOrder && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-amber-600" />
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {orderSearchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-amber-200 rounded-lg bg-white shadow-lg">
                {orderSearchResults.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => handleSelectOrder(order)}
                    className="w-full p-3 text-left hover:bg-amber-50 border-b border-amber-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-amber-900">{order.order_number}</p>
                        <p className="text-xs text-slate-600">{order.customer_name} • {order.customer_phone}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {order.order_status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">৳{(order.total_amount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Order Info */}
            {matchedOrder && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-800">Order Found</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Order #</p>
                    <p className="font-medium">{matchedOrder.order_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Customer</p>
                    <p className="font-medium">{matchedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p className="font-medium">{matchedOrder.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Amount</p>
                    <p className="font-medium">৳{(matchedOrder.total_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
                {matchedOrder.order_items && matchedOrder.order_items.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-slate-500 mb-1">Order Items:</p>
                    <div className="flex flex-wrap gap-1">
                      {matchedOrder.order_items.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {item.product_name || 'Product'} x{item.quantity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Added Products List */}
      {productItems.length > 0 && (
        <Card className="bg-violet-50 border-2 border-violet-300">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products to {type === 'return' ? 'Return' : 'Mark as Damaged'} ({productItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {productItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-violet-200">
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity} • Unit: ৳{(item.unit_price || 0).toLocaleString()} • Impact: ৳{(item.financial_impact || 0).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveProduct(item.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Select Product *</Label>
          <SearchableProductSelect
            inventory={inventory}
            value={formData.inventory_item_id}
            onValueChange={handleProductChange}
            placeholder="Search by name, ISBN, SKU..."
            showStock={true}
            showPrice={true}
          />
          {selectedProduct && (
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-slate-50 rounded-lg space-y-0.5">
              <p>Purchase Price: ৳{selectedProduct.purchase_price?.toLocaleString()}</p>
              <p>Selling Price: ৳{selectedProduct.selling_price?.toLocaleString()}</p>
            </div>
          )}
        </div>

        <div>
          <Label>Total Quantity *</Label>
          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => {
              const qty = parseInt(e.target.value) || 0;
              setFormData(prev => ({
                ...prev,
                quantity: qty,
                condition_breakdown: {
                  good: { quantity: qty, action: 'restock' },
                  fair: { quantity: 0, action: 'return_to_supplier' },
                  damaged: { quantity: 0, action: 'write_off' }
                }
              }));
            }}
            required
          />
        </div>

        {type === 'return' && formData.return_type === 'sales_return' && (
          <>
            <div>
              <Label>Order Number * (Required)</Label>
              <Input
                value={formData.order_number}
                onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                placeholder="ORD-XXXX"
                required
                className="border-amber-300"
              />
            </div>

            <div>
              <Label>Customer Name</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                placeholder="Auto-filled from order"
                readOnly={!!matchedOrder}
                className={matchedOrder ? 'bg-slate-50' : ''}
              />
            </div>

            <div>
              <Label>Customer Phone</Label>
              <Input
                value={formData.customer_phone}
                onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                placeholder="Auto-filled from order"
                readOnly={!!matchedOrder}
                className={matchedOrder ? 'bg-slate-50' : ''}
              />
            </div>
          </>
        )}

        {type === 'return' && formData.return_type === 'purchase_return' && (
          <div className="md:col-span-2">
            <Label>Supplier Name *</Label>
            <Input
              value={formData.supplier_name || selectedProduct?.supplier_name || ''}
              onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
              placeholder="Supplier name"
              required
            />
          </div>
        )}

        <div>
          <Label>Reason *</Label>
          <Select value={formData.reason} onValueChange={(value) => setFormData({...formData, reason: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason..." />
            </SelectTrigger>
            <SelectContent>
              {type === 'return' ? (
                <>
                  <SelectItem value="defective">Defective Product</SelectItem>
                  <SelectItem value="wrong_item">Wrong Item Delivered</SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  <SelectItem value="late_delivery">Late Delivery</SelectItem>
                  <SelectItem value="customer_changed_mind">Customer Changed Mind</SelectItem>
                  <SelectItem value="size_color_issue">Size/Color Issue</SelectItem>
                  <SelectItem value="not_as_described">Not As Described</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </>
              ) : (
                <>
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
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Condition Breakdown for Sales Returns */}
        {formData.return_type === 'sales_return' && type === 'return' && (
          <div className="md:col-span-2">
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  📦 Product Condition & Action Breakdown
                  <Badge variant="outline" className={
                    (formData.condition_breakdown.good.quantity + formData.condition_breakdown.fair.quantity + formData.condition_breakdown.damaged.quantity) === formData.quantity
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }>
                    Total: {formData.condition_breakdown.good.quantity + formData.condition_breakdown.fair.quantity + formData.condition_breakdown.damaged.quantity} / {formData.quantity}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Good Product */}
                  <div className="space-y-3 p-4 bg-white rounded-xl border-2 border-green-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-green-700 font-semibold">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Good Product
                      </Label>
                      <Badge className="bg-green-100 text-green-800 text-xs">100% value</Badge>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={formData.quantity}
                      value={formData.condition_breakdown.good.quantity}
                      onChange={(e) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          good: { ...formData.condition_breakdown.good, quantity: parseInt(e.target.value) || 0 }
                        }
                      })}
                      className="border-green-400 text-center font-bold text-lg h-12"
                    />
                    <Select 
                      value={formData.condition_breakdown.good.action} 
                      onValueChange={(value) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          good: { ...formData.condition_breakdown.good, action: value }
                        }
                      })}
                    >
                      <SelectTrigger className="border-green-300 bg-green-50 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restock">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600" /> Restock
                          </span>
                        </SelectItem>
                        <SelectItem value="return_to_supplier">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-orange-600" /> Return to Supplier
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fair Product */}
                  <div className="space-y-3 p-4 bg-white rounded-xl border-2 border-orange-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-orange-700 font-semibold">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        Fair (Minor Issues)
                      </Label>
                      <Badge className="bg-orange-100 text-orange-800 text-xs">70% value</Badge>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={formData.quantity}
                      value={formData.condition_breakdown.fair.quantity}
                      onChange={(e) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          fair: { ...formData.condition_breakdown.fair, quantity: parseInt(e.target.value) || 0 }
                        }
                      })}
                      className="border-orange-400 text-center font-bold text-lg h-12"
                    />
                    <Select 
                      value={formData.condition_breakdown.fair.action} 
                      onValueChange={(value) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          fair: { ...formData.condition_breakdown.fair, action: value }
                        }
                      })}
                    >
                      <SelectTrigger className="border-orange-300 bg-orange-50 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restock">Restock (Repair)</SelectItem>
                        <SelectItem value="return_to_supplier">Return to Supplier</SelectItem>
                        <SelectItem value="write_off">Write-off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Damaged Product */}
                  <div className="space-y-3 p-4 bg-white rounded-xl border-2 border-red-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-red-700 font-semibold">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Damaged Product
                      </Label>
                      <Badge className="bg-red-100 text-red-800 text-xs">Write-off</Badge>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={formData.quantity}
                      value={formData.condition_breakdown.damaged.quantity}
                      onChange={(e) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          damaged: { ...formData.condition_breakdown.damaged, quantity: parseInt(e.target.value) || 0 }
                        }
                      })}
                      className="border-red-400 text-center font-bold text-lg h-12"
                    />
                    <Select 
                      value={formData.condition_breakdown.damaged.action} 
                      onValueChange={(value) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          damaged: { ...formData.condition_breakdown.damaged, action: value }
                        }
                      })}
                    >
                      <SelectTrigger className="border-red-300 bg-red-50 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="write_off">Write-off (Loss)</SelectItem>
                        <SelectItem value="return_to_supplier">Return to Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Only show single Action field for non-sales returns or damage reports */}
        {(formData.return_type !== 'sales_return' || type !== 'return') && (
          <div>
            <Label className="flex items-center gap-2">Action</Label>
            <Select value={formData.condition_breakdown.good.action} onValueChange={(value) => setFormData({
              ...formData,
              condition_breakdown: {
                good: { ...formData.condition_breakdown.good, action: value },
                fair: { ...formData.condition_breakdown.fair, action: value },
                damaged: { ...formData.condition_breakdown.damaged, action: value }
              }
            })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
          <Input
            type="date"
            value={formData.incident_date}
            onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
            required
          />
        </div>

        <div className="relative">
          <Label className="flex items-center justify-between">
            <span>Financial Impact (৳)</span>
            {isManualFinancialImpact && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetToAutoCalculate}
                className="h-6 text-xs gap-1 text-blue-600 hover:text-blue-700"
              >
                <Calculator className="w-3 h-3" />
                Auto-Calculate
              </Button>
            )}
          </Label>
          <Input
            type="number"
            step="0.01"
            value={formData.financial_impact}
            onChange={(e) => handleFinancialImpactChange(e.target.value)}
          />
        </div>

        {type === 'return' && (formData.condition_breakdown.good.action === 'restock' || formData.condition_breakdown.fair.action === 'restock') && (
          <div>
            <Label>Restocking Fee (৳)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.restocking_fee}
              onChange={(e) => setFormData({...formData, restocking_fee: e.target.value})}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          onClick={handleAddProduct}
          variant="outline"
          className="border-2 border-violet-500 text-violet-700 hover:bg-violet-50"
        >
          Add Product to List
        </Button>
      </div>

      <div>
        <Label>Detailed Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Add any additional notes about this return/damage..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className={type === 'return' ? 'bg-blue-600' : 'bg-red-600'} disabled={productItems.length === 0}>
          Submit {productItems.length} Product{productItems.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </form>
  );
}
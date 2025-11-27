import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, Info, CheckCircle, XCircle, AlertCircle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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
    customer_name: '',
    supplier_name: '',
    condition: type === 'return' ? 'good' : 'damaged',
    financial_impact: 0,
    restocking_fee: 0,
    notes: '',
    incident_date: new Date().toISOString().split('T')[0]
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isManualFinancialImpact, setIsManualFinancialImpact] = useState(false);

  // Auto-sync condition breakdown with total quantity
  useEffect(() => {
    if (formData.return_type === 'sales_return') {
      const total = formData.condition_breakdown.good.quantity + 
                   formData.condition_breakdown.fair.quantity + 
                   formData.condition_breakdown.damaged.quantity;
      
      if (total !== formData.quantity && total === 0 && formData.quantity > 0) {
        // Initialize with all good condition
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
        
        // Calculate based on action for each condition
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
      }
    }
  }, [initialData, inventory]);

  const handleProductChange = (value) => {
    const item = inventory.find(i => i.id === value);
    setSelectedProduct(item);
    
    // Auto-calculate initial financial impact
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
    setIsManualFinancialImpact(true); // User is manually editing
  };

  const resetToAutoCalculate = () => {
    setIsManualFinancialImpact(false);
    toast.success('Financial impact will auto-calculate');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.inventory_item_id || !formData.quantity || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.return_type === 'sales_return') {
      const total = formData.condition_breakdown.good.quantity + 
                   formData.condition_breakdown.fair.quantity + 
                   formData.condition_breakdown.damaged.quantity;
      
      if (total !== formData.quantity) {
        toast.error(`Condition breakdown (${total}) must equal total quantity (${formData.quantity})`);
        return;
      }
    }

    onSubmit({
      ...formData,
      type,
      quantity: parseInt(formData.quantity),
      condition_breakdown: formData.return_type === 'sales_return' ? formData.condition_breakdown : null,
      financial_impact: parseFloat(formData.financial_impact),
      restocking_fee: parseFloat(formData.restocking_fee || 0)
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Select Product *</Label>
          <Select
            value={formData.inventory_item_id}
            onValueChange={handleProductChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose product..." />
            </SelectTrigger>
            <SelectContent>
              {inventory.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.item_name} (Stock: {item.current_stock})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProduct && (
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
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
              <Label>Order Number (Optional)</Label>
              <Input
                value={formData.order_number}
                onChange={(e) => setFormData({...formData, order_number: e.target.value})}
                placeholder="ORD-XXXX"
              />
            </div>

            <div>
              <Label>Customer Name (Optional)</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                placeholder="Customer name"
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
                    {selectedProduct && formData.condition_breakdown.good.quantity > 0 && (
                      <p className="text-xs font-semibold text-green-800 text-center">
                        ৳{(formData.condition_breakdown.good.quantity * selectedProduct.selling_price).toLocaleString()}
                      </p>
                    )}
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
                        <SelectItem value="restock">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600" /> Restock (Repair)
                          </span>
                        </SelectItem>
                        <SelectItem value="return_to_supplier">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-orange-600" /> Return to Supplier
                          </span>
                        </SelectItem>
                        <SelectItem value="write_off">
                          <span className="flex items-center gap-2">
                            <XCircle className="w-3 h-3 text-red-600" /> Write-off
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedProduct && formData.condition_breakdown.fair.quantity > 0 && (
                      <p className="text-xs font-semibold text-orange-800 text-center">
                        ৳{(formData.condition_breakdown.fair.quantity * selectedProduct.selling_price * 0.7).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Damaged Product */}
                  <div className="space-y-3 p-4 bg-white rounded-xl border-2 border-red-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-red-700 font-semibold">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Damaged Product
                      </Label>
                      <Badge className="bg-red-100 text-red-800 text-xs">30% value</Badge>
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
                        <SelectItem value="write_off">
                          <span className="flex items-center gap-2">
                            <XCircle className="w-3 h-3 text-red-600" /> Write-off (Loss)
                          </span>
                        </SelectItem>
                        <SelectItem value="return_to_supplier">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-orange-600" /> Return to Supplier
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedProduct && formData.condition_breakdown.damaged.quantity > 0 && (
                      <p className="text-xs font-semibold text-red-800 text-center">
                        ৳{(formData.condition_breakdown.damaged.quantity * selectedProduct.selling_price * 0.3).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {selectedProduct && (
                  <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border-2 border-violet-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-violet-600 font-medium">Total Items</p>
                        <p className="text-2xl font-bold text-violet-900">{formData.quantity}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-violet-600 font-medium">Actions Summary</p>
                        <div className="flex justify-center gap-2 mt-1 flex-wrap">
                          {formData.condition_breakdown.good.quantity > 0 && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              {formData.condition_breakdown.good.quantity} {formData.condition_breakdown.good.action === 'restock' ? 'Restock' : 'Return'}
                            </Badge>
                          )}
                          {formData.condition_breakdown.fair.quantity > 0 && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              {formData.condition_breakdown.fair.quantity} {formData.condition_breakdown.fair.action === 'restock' ? 'Repair' : formData.condition_breakdown.fair.action === 'return_to_supplier' ? 'Return' : 'Write-off'}
                            </Badge>
                          )}
                          {formData.condition_breakdown.damaged.quantity > 0 && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              {formData.condition_breakdown.damaged.quantity} {formData.condition_breakdown.damaged.action === 'write_off' ? 'Write-off' : 'Return'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-violet-600 font-medium">Est. Recovery Value</p>
                        <p className="text-2xl font-bold text-violet-900">
                          ৳{(
                            formData.condition_breakdown.good.quantity * selectedProduct.selling_price +
                            formData.condition_breakdown.fair.quantity * selectedProduct.selling_price * 0.7 +
                            formData.condition_breakdown.damaged.quantity * selectedProduct.selling_price * 0.3
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                <SelectItem value="restock">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Restock (Add back to inventory)
                  </div>
                </SelectItem>
                <SelectItem value="return_to_supplier">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    Return to Supplier
                  </div>
                </SelectItem>
                <SelectItem value="write_off">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Write-off (Total Loss)
                  </div>
                </SelectItem>
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
          {!isManualFinancialImpact && selectedProduct && (
            <div className="flex items-center gap-1 mt-1">
              <Info className="w-3 h-3 text-blue-500" />
              <p className="text-xs text-blue-600">
                {formData.return_type === 'sales_return' 
                  ? 'Auto-calculated from condition breakdown' 
                  : `Auto-calculated: ৳${selectedProduct.purchase_price} × ${formData.quantity}`}
              </p>
            </div>
          )}
          {isManualFinancialImpact && (
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                Manual Entry
              </Badge>
            </div>
          )}
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

      <div>
        <Label>Detailed Notes *</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Provide detailed information about the incident..."
          rows={3}
          required
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className={type === 'return' ? 'bg-blue-600' : 'bg-red-600'}>
          Record {type === 'return' ? 'Return' : 'Damage'}
        </Button>
      </div>
    </form>
  );
}
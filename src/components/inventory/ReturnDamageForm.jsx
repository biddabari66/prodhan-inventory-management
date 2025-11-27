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
      good: 0,
      fair: 0,
      damaged: 0
    },
    reason: '',
    order_number: '',
    customer_name: '',
    supplier_name: '',
    condition: type === 'return' ? 'good' : 'damaged',
    action: 'restock',
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
      const total = formData.condition_breakdown.good + 
                   formData.condition_breakdown.fair + 
                   formData.condition_breakdown.damaged;
      
      if (total !== formData.quantity && total === 0 && formData.quantity > 0) {
        // Initialize with all good condition
        setFormData(prev => ({
          ...prev,
          condition_breakdown: {
            good: formData.quantity,
            fair: 0,
            damaged: 0
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
        const goodValue = formData.condition_breakdown.good * selectedProduct.selling_price;
        const fairValue = formData.condition_breakdown.fair * selectedProduct.selling_price * 0.7;
        const damagedValue = formData.condition_breakdown.damaged * selectedProduct.selling_price * 0.3;
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

  // Auto-determine action based on product condition breakdown
  useEffect(() => {
    if (formData.return_type === 'sales_return') {
      const { good, fair, damaged } = formData.condition_breakdown;
      const total = good + fair + damaged;
      
      if (total === 0) return;

      let suggestedAction = 'restock';
      
      // If ALL products are good → Restock
      if (good === total && fair === 0 && damaged === 0) {
        suggestedAction = 'restock';
      }
      // If ALL products are damaged → Write-off
      else if (damaged === total && good === 0 && fair === 0) {
        suggestedAction = 'write_off';
      }
      // If has fair/minor issues (majority or significant) → Return to supplier
      else if (fair > 0 && fair >= good) {
        suggestedAction = 'return_to_supplier';
      }
      // If majority is damaged → Write-off
      else if (damaged > good && damaged > fair) {
        suggestedAction = 'write_off';
      }
      // If majority is good → Restock
      else if (good > fair && good > damaged) {
        suggestedAction = 'restock';
      }
      // Mixed with fair items → Return to supplier for inspection
      else if (fair > 0) {
        suggestedAction = 'return_to_supplier';
      }

      setFormData(prev => ({
        ...prev,
        action: suggestedAction
      }));
    }
  }, [formData.condition_breakdown, formData.return_type]);

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
      const total = formData.condition_breakdown.good + 
                   formData.condition_breakdown.fair + 
                   formData.condition_breakdown.damaged;
      
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
                  good: qty,
                  fair: 0,
                  damaged: 0
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
                  📦 Product Condition Breakdown
                  <Badge variant="outline">
                    Total: {formData.condition_breakdown.good + formData.condition_breakdown.fair + formData.condition_breakdown.damaged} / {formData.quantity}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 p-3 bg-white rounded-lg border-2 border-green-300">
                    <Label className="flex items-center gap-2 text-green-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Good Product
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max={formData.quantity}
                      value={formData.condition_breakdown.good}
                      onChange={(e) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          good: parseInt(e.target.value) || 0
                        }
                      })}
                      className="border-green-400 text-center font-bold"
                    />
                    <p className="text-xs text-green-700">100% recovery value</p>
                    {selectedProduct && formData.condition_breakdown.good > 0 && (
                      <p className="text-xs font-semibold text-green-800">
                        ৳{(formData.condition_breakdown.good * selectedProduct.selling_price).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 p-3 bg-white rounded-lg border-2 border-orange-300">
                    <Label className="flex items-center gap-2 text-orange-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Fair (Minor Issues)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max={formData.quantity}
                      value={formData.condition_breakdown.fair}
                      onChange={(e) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          fair: parseInt(e.target.value) || 0
                        }
                      })}
                      className="border-orange-400 text-center font-bold"
                    />
                    <p className="text-xs text-orange-700">70% recovery value</p>
                    {selectedProduct && formData.condition_breakdown.fair > 0 && (
                      <p className="text-xs font-semibold text-orange-800">
                        ৳{(formData.condition_breakdown.fair * selectedProduct.selling_price * 0.7).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 p-3 bg-white rounded-lg border-2 border-red-300">
                    <Label className="flex items-center gap-2 text-red-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Damaged Product
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max={formData.quantity}
                      value={formData.condition_breakdown.damaged}
                      onChange={(e) => setFormData({
                        ...formData,
                        condition_breakdown: {
                          ...formData.condition_breakdown,
                          damaged: parseInt(e.target.value) || 0
                        }
                      })}
                      className="border-red-400 text-center font-bold"
                    />
                    <p className="text-xs text-red-700">30% recovery value</p>
                    {selectedProduct && formData.condition_breakdown.damaged > 0 && (
                      <p className="text-xs font-semibold text-red-800">
                        ৳{(formData.condition_breakdown.damaged * selectedProduct.selling_price * 0.3).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {selectedProduct && (
                  <div className="p-3 bg-white rounded-lg border-2 border-violet-300">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-violet-800">Total Estimated Recovery:</p>
                      <p className="text-xl font-bold text-violet-900">
                        ৳{(
                          formData.condition_breakdown.good * selectedProduct.selling_price +
                          formData.condition_breakdown.fair * selectedProduct.selling_price * 0.7 +
                          formData.condition_breakdown.damaged * selectedProduct.selling_price * 0.3
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <Label>Action</Label>
          <Select value={formData.action} onValueChange={(value) => setFormData({...formData, action: value})}>
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

        {type === 'return' && formData.action === 'restock' && (
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
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ReturnDamageForm({ inventory, onSubmit, onCancel, type = 'return', initialData }) {
  const [formData, setFormData] = useState(initialData || {
    inventory_item_id: '',
    return_type: 'sales_return', // purchase_return or sales_return
    quantity: 1,
    good_condition_qty: 0,
    damaged_qty: 0,
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
  const [usePartialReturn, setUsePartialReturn] = useState(false);

  // Auto-sync partial quantities with total
  useEffect(() => {
    if (usePartialReturn) {
      const good = parseInt(formData.good_condition_qty) || 0;
      const damaged = parseInt(formData.damaged_qty) || 0;
      const total = good + damaged;
      if (total !== parseInt(formData.quantity)) {
        setFormData(prev => ({
          ...prev,
          quantity: total
        }));
      }
    }
  }, [formData.good_condition_qty, formData.damaged_qty, usePartialReturn]);

  // Auto-calculate financial impact when product or quantity changes
  useEffect(() => {
    if (selectedProduct && formData.quantity && !isManualFinancialImpact) {
      const priceToUse = formData.return_type === 'purchase_return' 
        ? selectedProduct.purchase_price 
        : selectedProduct.selling_price;
      const calculatedImpact = priceToUse * parseInt(formData.quantity);
      setFormData(prev => ({
        ...prev,
        financial_impact: calculatedImpact
      }));
    }
  }, [selectedProduct, formData.quantity, formData.return_type, isManualFinancialImpact]);

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
    if (selectedProduct && formData.quantity) {
      const priceToUse = formData.return_type === 'purchase_return' 
        ? selectedProduct.purchase_price 
        : selectedProduct.selling_price;
      const calculatedImpact = priceToUse * parseInt(formData.quantity);
      setFormData(prev => ({
        ...prev,
        financial_impact: calculatedImpact
      }));
      setIsManualFinancialImpact(false);
      toast.success('Financial impact auto-calculated');
    }
  };

  const handlePartialReturnToggle = () => {
    setUsePartialReturn(!usePartialReturn);
    if (!usePartialReturn) {
      // Initialize partial quantities
      setFormData(prev => ({
        ...prev,
        good_condition_qty: prev.quantity,
        damaged_qty: 0
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.inventory_item_id || !formData.quantity || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    if (usePartialReturn) {
      const good = parseInt(formData.good_condition_qty) || 0;
      const damaged = parseInt(formData.damaged_qty) || 0;
      if (good + damaged !== parseInt(formData.quantity)) {
        toast.error('Good condition + Damaged quantities must equal Total quantity');
        return;
      }
    }

    onSubmit({
      ...formData,
      type,
      quantity: parseInt(formData.quantity),
      good_condition_qty: parseInt(formData.good_condition_qty) || 0,
      damaged_qty: parseInt(formData.damaged_qty) || 0,
      financial_impact: parseFloat(formData.financial_impact),
      restocking_fee: parseFloat(formData.restocking_fee),
      use_partial_return: usePartialReturn
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
          <Label className="flex items-center justify-between">
            <span>Total Quantity *</span>
            {type === 'return' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePartialReturnToggle}
                className={`h-6 text-xs ${usePartialReturn ? 'text-green-600' : 'text-gray-500'}`}
              >
                {usePartialReturn ? '✓ Partial Return' : 'Enable Partial'}
              </Button>
            )}
          </Label>
          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({...prev, quantity: value}));
              if (usePartialReturn) {
                setFormData(prev => ({
                  ...prev,
                  good_condition_qty: value,
                  damaged_qty: 0
                }));
              }
            }}
            disabled={usePartialReturn}
            required
          />
        </div>

        {usePartialReturn && type === 'return' && (
          <>
            <div className="md:col-span-2 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <Label className="text-sm font-semibold mb-3 block text-amber-800">
                Partial Return Breakdown
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Good Condition (Restock)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.good_condition_qty}
                    onChange={(e) => setFormData({...formData, good_condition_qty: e.target.value})}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs">Damaged (Write-off)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.damaged_qty}
                    onChange={(e) => setFormData({...formData, damaged_qty: e.target.value})}
                    className="bg-white"
                  />
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-2">
                Total: {parseInt(formData.good_condition_qty || 0) + parseInt(formData.damaged_qty || 0)} / {formData.quantity}
              </p>
            </div>
          </>
        )}

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

        <div>
          <Label>Condition</Label>
          <Select value={formData.condition} onValueChange={(value) => setFormData({...formData, condition: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good (Resellable)</SelectItem>
              <SelectItem value="fair">Fair (Minor Issues)</SelectItem>
              <SelectItem value="damaged">Damaged (Not Resellable)</SelectItem>
              <SelectItem value="destroyed">Destroyed (Write-off)</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                Auto-calculated: ৳{formData.return_type === 'purchase_return' ? selectedProduct.purchase_price : selectedProduct.selling_price} × {formData.quantity} = ৳{formData.financial_impact.toLocaleString()}
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
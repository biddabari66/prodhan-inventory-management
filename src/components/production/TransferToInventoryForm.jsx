import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Package, Plus, X, AlertCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';

// Common jar/packet presets in grams
const PACKAGING_PRESETS = [
  { label: '50g Jar', grams: 50 },
  { label: '100g Jar', grams: 100 },
  { label: '150g Jar', grams: 150 },
  { label: '200g Jar', grams: 200 },
  { label: '250g Jar', grams: 250 },
  { label: '300g Jar', grams: 300 },
  { label: '500g Jar', grams: 500 },
  { label: '1kg Jar', grams: 1000 },
  { label: '100g Packet', grams: 100 },
  { label: '250g Packet', grams: 250 },
  { label: '500g Packet', grams: 500 },
  { label: '1kg Pack', grams: 1000 },
  { label: '2kg Pack', grams: 2000 },
  { label: '5kg Pack', grams: 5000 },
];

export default function TransferToInventoryForm({ batch, inventory, currentUser, onTransfer, onCancel }) {
  const [selectedItem, setSelectedItem] = useState('');
  const [packagingMode, setPackagingMode] = useState('preset'); // 'preset' | 'custom' | 'bulk'
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customGrams, setCustomGrams] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [jarCount, setJarCount] = useState('');
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [bulkUnit, setBulkUnit] = useState('kg');
  const [notes, setNotes] = useState('');

  const selectedBatchItem = batch.items?.find(i => i.inventory_id === selectedItem || i.item_name === selectedItem);
  const maxQuantityRaw = selectedBatchItem?.quantity_remaining || 0;
  const rawUnit = selectedBatchItem?.unit || 'kg';

  // Convert remaining raw material to grams for calculation
  const remainingGrams = useMemo(() => {
    if (!selectedBatchItem) return 0;
    const qty = selectedBatchItem.quantity_remaining || 0;
    const unit = (selectedBatchItem.unit || 'kg').toLowerCase();
    if (unit === 'kg') return qty * 1000;
    if (unit === 'gm' || unit === 'g' || unit === 'grams' || unit === 'gram') return qty;
    if (unit === 'litre' || unit === 'liter' || unit === 'l') return qty * 1000; // 1L ≈ 1000ml
    if (unit === 'ml') return qty;
    return qty * 1000; // default treat as kg
  }, [selectedBatchItem]);

  // Find matching inventory products (finished goods) for this raw material
  const matchingProducts = useMemo(() => {
    if (!selectedBatchItem) return [];
    const rawName = (selectedBatchItem.item_name || '').toLowerCase();
    return inventory.filter(inv => {
      const invName = (inv.item_name || '').toLowerCase();
      // Match products that contain the raw material name
      return invName.includes(rawName) || rawName.includes(invName);
    }).map(inv => {
      const weightKg = inv.weight_kg || 0;
      const weightVal = inv.weight_value || 0;
      const weightUnit = (inv.weight_unit || 'kg').toLowerCase();
      let grams = 0;
      if (weightVal > 0) {
        grams = weightUnit === 'grams' || weightUnit === 'gm' || weightUnit === 'g' ? weightVal : weightVal * 1000;
      } else if (weightKg > 0) {
        grams = weightKg * 1000;
      }
      return { ...inv, grams };
    }).filter(inv => inv.grams > 0);
  }, [selectedBatchItem, inventory]);

  // Current packaging size in grams
  const currentPackagingGrams = useMemo(() => {
    if (packagingMode === 'preset' && selectedPreset) {
      const preset = PACKAGING_PRESETS.find(p => p.label === selectedPreset);
      return preset?.grams || 0;
    }
    if (packagingMode === 'custom' && customGrams) {
      return parseFloat(customGrams) || 0;
    }
    return 0;
  }, [packagingMode, selectedPreset, customGrams]);

  // Max jars possible
  const maxJars = useMemo(() => {
    if (currentPackagingGrams <= 0 || remainingGrams <= 0) return 0;
    return Math.floor(remainingGrams / currentPackagingGrams);
  }, [remainingGrams, currentPackagingGrams]);

  // Total raw material used
  const totalRawUsed = useMemo(() => {
    if (packagingMode === 'bulk') {
      const qty = parseFloat(bulkQuantity) || 0;
      const unit = bulkUnit.toLowerCase();
      if (unit === 'kg') return qty;
      if (unit === 'gm' || unit === 'g') return qty / 1000;
      return qty;
    }
    const count = parseInt(jarCount) || 0;
    const totalGrams = count * currentPackagingGrams;
    return totalGrams / 1000; // convert to kg
  }, [packagingMode, jarCount, currentPackagingGrams, bulkQuantity, bulkUnit]);

  // Quantity to deduct from raw material (in raw material's unit)
  const rawDeduction = useMemo(() => {
    if (packagingMode === 'bulk') {
      const qty = parseFloat(bulkQuantity) || 0;
      const unit = bulkUnit.toLowerCase();
      const rawUnitLower = rawUnit.toLowerCase();
      // Convert to raw unit
      if (rawUnitLower === 'kg') {
        if (unit === 'gm' || unit === 'g') return qty / 1000;
        return qty;
      }
      if (rawUnitLower === 'gm' || rawUnitLower === 'g') {
        if (unit === 'kg') return qty * 1000;
        return qty;
      }
      return qty;
    }
    const count = parseInt(jarCount) || 0;
    const totalGrams = count * currentPackagingGrams;
    const rawUnitLower = rawUnit.toLowerCase();
    if (rawUnitLower === 'kg') return totalGrams / 1000;
    if (rawUnitLower === 'gm' || rawUnitLower === 'g') return totalGrams;
    return totalGrams / 1000;
  }, [packagingMode, jarCount, currentPackagingGrams, bulkQuantity, bulkUnit, rawUnit]);

  const handleTransfer = () => {
    if (!selectedItem) {
      toast.error('Please select a raw material');
      return;
    }

    if (packagingMode === 'bulk') {
      const qty = parseFloat(bulkQuantity);
      if (!qty || qty <= 0) {
        toast.error('Please enter transfer quantity');
        return;
      }
      if (rawDeduction > maxQuantityRaw) {
        toast.error(`Cannot transfer more than ${maxQuantityRaw} ${rawUnit}`);
        return;
      }
      onTransfer({
        itemName: selectedBatchItem?.item_name,
        inventoryId: selectedBatchItem?.inventory_id,
        quantity: rawDeduction,
        unit: rawUnit,
        productType: `Bulk: ${qty} ${bulkUnit}`,
        notes,
        transferredById: currentUser?.id,
        transferredByName: currentUser?.full_name
      });
      return;
    }

    // Jar/packet mode
    const count = parseInt(jarCount);
    if (!count || count <= 0) {
      toast.error('Please enter number of jars/packets');
      return;
    }
    if (count > maxJars) {
      toast.error(`Maximum ${maxJars} units possible from available material`);
      return;
    }
    if (rawDeduction > maxQuantityRaw) {
      toast.error(`Not enough raw material. Need ${rawDeduction.toFixed(3)} ${rawUnit}, have ${maxQuantityRaw} ${rawUnit}`);
      return;
    }

    const packagingLabel = packagingMode === 'preset'
      ? selectedPreset
      : (customLabel || `${customGrams}g`);

    onTransfer({
      itemName: selectedBatchItem?.item_name,
      inventoryId: selectedBatchItem?.inventory_id,
      quantity: rawDeduction,
      unit: rawUnit,
      productType: `${count} × ${packagingLabel}`,
      notes: `Packaged: ${count} × ${packagingLabel} (${rawDeduction.toFixed(3)} ${rawUnit} used). ${notes}`,
      transferredById: currentUser?.id,
      transferredByName: currentUser?.full_name,
      // Extra metadata for display
      _jarCount: count,
      _packagingLabel: packagingLabel,
      _gramsPerUnit: currentPackagingGrams,
    });
  };

  const formatGrams = (g) => {
    if (g >= 1000) return `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1)}kg`;
    return `${g}g`;
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
        <h3 className="font-semibold text-indigo-900 mb-1">Transfer Raw Material to Main Inventory</h3>
        <p className="text-sm text-indigo-700">Convert raw material into finished jars/packets and send to inventory</p>
      </div>

      {/* Select Raw Material */}
      <div>
        <Label>Select Raw Material *</Label>
        <Select value={selectedItem} onValueChange={(val) => {
          setSelectedItem(val);
          setJarCount('');
          setSelectedPreset('');
          setBulkQuantity('');
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select item to transfer..." />
          </SelectTrigger>
          <SelectContent>
            {batch.items?.filter(i => (i.quantity_remaining || 0) > 0).map((item, idx) => (
              <SelectItem key={idx} value={item.inventory_id || item.item_name}>
                {item.item_name} — Remaining: {item.quantity_remaining || 0} {item.unit || 'kg'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBatchItem && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-green-800">
                Available: {maxQuantityRaw} {rawUnit}
              </p>
              <p className="text-xs text-green-600">
                ≈ {remainingGrams.toLocaleString()}g total
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800 font-mono">
              {maxQuantityRaw} {rawUnit}
            </Badge>
          </div>
        </div>
      )}

      {selectedBatchItem && (
        <>
          {/* Packaging Mode Selector */}
          <div>
            <Label className="mb-2 block">Transfer Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant={packagingMode === 'preset' ? 'default' : 'outline'}
                onClick={() => { setPackagingMode('preset'); setJarCount(''); }}
                className={packagingMode === 'preset' ? 'bg-indigo-600' : ''}
              >
                <Package className="w-4 h-4 mr-1" />
                Preset Sizes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={packagingMode === 'custom' ? 'default' : 'outline'}
                onClick={() => { setPackagingMode('custom'); setJarCount(''); }}
                className={packagingMode === 'custom' ? 'bg-indigo-600' : ''}
              >
                <Plus className="w-4 h-4 mr-1" />
                Custom Size
              </Button>
              <Button
                type="button"
                size="sm"
                variant={packagingMode === 'bulk' ? 'default' : 'outline'}
                onClick={() => setPackagingMode('bulk')}
                className={packagingMode === 'bulk' ? 'bg-indigo-600' : ''}
              >
                Bulk Transfer
              </Button>
            </div>
          </div>

          {/* Matching Inventory Products */}
          {matchingProducts.length > 0 && packagingMode !== 'bulk' && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-2">
                📦 Matching finished products from Inventory:
              </p>
              <div className="flex flex-wrap gap-2">
                {matchingProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      if (packagingMode === 'preset') {
                        // Find closest preset
                        const closest = PACKAGING_PRESETS.find(p => p.grams === prod.grams);
                        if (closest) {
                          setSelectedPreset(closest.label);
                        } else {
                          setPackagingMode('custom');
                          setCustomGrams(String(prod.grams));
                          setCustomLabel(`${formatGrams(prod.grams)} ${prod.item_name}`);
                        }
                      } else {
                        setCustomGrams(String(prod.grams));
                        setCustomLabel(`${formatGrams(prod.grams)} ${prod.item_name}`);
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-full hover:bg-blue-100 transition-colors font-medium text-blue-700"
                  >
                    {prod.item_name} ({formatGrams(prod.grams)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preset Mode */}
          {packagingMode === 'preset' && (
            <div>
              <Label>Select Jar/Packet Size *</Label>
              <Select value={selectedPreset} onValueChange={(val) => {
                setSelectedPreset(val);
                setJarCount('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose packaging size..." />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGING_PRESETS.map((preset) => {
                    const maxPossible = remainingGrams > 0 ? Math.floor(remainingGrams / preset.grams) : 0;
                    return (
                      <SelectItem key={preset.label} value={preset.label} disabled={maxPossible === 0}>
                        {preset.label} — Max {maxPossible} units possible
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Mode */}
          {packagingMode === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Size in Grams *</Label>
                <Input
                  type="number"
                  min="1"
                  value={customGrams}
                  onChange={(e) => { setCustomGrams(e.target.value); setJarCount(''); }}
                  placeholder="e.g., 150"
                />
              </div>
              <div>
                <Label>Label (optional)</Label>
                <Input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g., 150g Premium Jar"
                />
              </div>
            </div>
          )}

          {/* Jar Count + Calculation (for preset & custom modes) */}
          {packagingMode !== 'bulk' && currentPackagingGrams > 0 && (
            <>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Auto Calculation</span>
                </div>
                <p className="text-sm text-amber-700">
                  Each unit = <strong>{formatGrams(currentPackagingGrams)}</strong> |
                  Available = <strong>{remainingGrams.toLocaleString()}g</strong> |
                  Max possible = <strong className="text-lg">{maxJars}</strong> units
                </p>
              </div>

              <div>
                <Label>Number of Jars/Packets to Make *</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min="1"
                    max={maxJars}
                    value={jarCount}
                    onChange={(e) => setJarCount(e.target.value)}
                    placeholder={`Max: ${maxJars}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setJarCount(String(maxJars))}
                    className="whitespace-nowrap"
                  >
                    Use Max ({maxJars})
                  </Button>
                </div>
              </div>

              {parseInt(jarCount) > 0 && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                  <h4 className="text-sm font-bold text-indigo-900 mb-2">Transfer Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-indigo-600">Packaging:</span>
                      <p className="font-semibold">{jarCount} × {packagingMode === 'preset' ? selectedPreset : (customLabel || `${customGrams}g`)}</p>
                    </div>
                    <div>
                      <span className="text-indigo-600">Raw Material Used:</span>
                      <p className="font-bold text-lg">{rawDeduction.toFixed(3)} {rawUnit}</p>
                    </div>
                    <div>
                      <span className="text-indigo-600">Remaining After:</span>
                      <p className="font-semibold text-green-700">
                        {(maxQuantityRaw - rawDeduction).toFixed(3)} {rawUnit}
                      </p>
                    </div>
                    <div>
                      <span className="text-indigo-600">Inventory Transfer:</span>
                      <p className="font-semibold">+{jarCount} units to main stock</p>
                    </div>
                  </div>
                  {parseInt(jarCount) > maxJars && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200 text-red-700 text-xs flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Exceeds maximum possible! Reduce to {maxJars} or less.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Bulk Transfer Mode */}
          {packagingMode === 'bulk' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity to Transfer *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxQuantityRaw}
                  value={bulkQuantity}
                  onChange={(e) => setBulkQuantity(e.target.value)}
                  placeholder={`Max: ${maxQuantityRaw}`}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={bulkUnit} onValueChange={setBulkUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">KG</SelectItem>
                    <SelectItem value="gm">Grams</SelectItem>
                    <SelectItem value="pc">Pieces</SelectItem>
                    <SelectItem value="jar">Jars</SelectItem>
                    <SelectItem value="litre">Litre</SelectItem>
                    <SelectItem value="ml">ML</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleTransfer} className="bg-green-600 hover:bg-green-700">
          <Send className="w-4 h-4 mr-2" />
          Transfer to Inventory
        </Button>
      </div>
    </div>
  );
}
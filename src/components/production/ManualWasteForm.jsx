import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const WASTE_REASONS = [
  { value: 'end_of_batch', label: 'End of Batch (Natural)' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'expired', label: 'Expired' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'refining_loss', label: 'Refining Loss' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
  { value: 'other', label: 'Other' },
];

export default function ManualWasteForm({ batches, currentUser, onSubmit, onCancel }) {
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedItemKey, setSelectedItemKey] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');
  const [wasteReason, setWasteReason] = useState('manual_adjustment');
  const [notes, setNotes] = useState('');
  const [batchSearch, setBatchSearch] = useState('');

  // Filter batches that have items (show all, not just active ones)
  const availableBatches = useMemo(() => {
    let filtered = batches.filter(b => b.items?.length > 0);
    if (batchSearch) {
      const q = batchSearch.toLowerCase();
      filtered = filtered.filter(b =>
        (b.batch_number || '').toLowerCase().includes(q) ||
        (b.po_number || '').toLowerCase().includes(q) ||
        (b.supplier_name || '').toLowerCase().includes(q) ||
        b.items?.some(i => (i.item_name || '').toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [batches, batchSearch]);

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const availableItems = useMemo(() => {
    if (!selectedBatch) return [];
    return selectedBatch.items?.filter(i => (i.quantity_remaining || 0) > 0) || [];
  }, [selectedBatch]);

  const selectedItem = availableItems.find(
    i => (i.inventory_id || i.item_name) === selectedItemKey
  );

  const maxQty = selectedItem?.quantity_remaining || 0;

  const handleSubmit = () => {
    if (!selectedBatchId) {
      toast.error('Please select a batch');
      return;
    }
    if (!selectedItemKey) {
      toast.error('Please select an item');
      return;
    }
    const qty = parseFloat(wasteQuantity);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid waste quantity');
      return;
    }
    if (qty > maxQty) {
      toast.error(`Cannot exceed remaining quantity (${maxQty} ${selectedItem?.unit || 'kg'})`);
      return;
    }

    onSubmit({
      batch: selectedBatch,
      wasteData: {
        itemName: selectedItem.item_name,
        inventoryId: selectedItem.inventory_id,
        wasteQuantity: qty,
        unit: selectedItem.unit || 'kg',
        wasteReason,
        notes,
        recordedById: currentUser?.id,
        recordedByName: currentUser?.full_name,
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Manual Waste Entry
        </h3>
        <p className="text-sm text-amber-700">
          Record waste for any production batch by selecting the PO/Batch number
        </p>
      </div>

      {/* Batch Search */}
      <div>
        <Label>Search PO / Batch Number</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={batchSearch}
            onChange={(e) => setBatchSearch(e.target.value)}
            placeholder="Search by batch #, PO #, supplier, or item name..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Select Batch */}
      <div>
        <Label>Select Batch *</Label>
        <Select value={selectedBatchId} onValueChange={(val) => {
          setSelectedBatchId(val);
          setSelectedItemKey('');
          setWasteQuantity('');
        }}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select a production batch..." />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {availableBatches.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No batches found</div>
            ) : (
              availableBatches.map(b => {
                const hasRemaining = (b.total_remaining_quantity || 0) > 0;
                return (
                  <SelectItem key={b.id} value={b.id} disabled={!hasRemaining}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{b.batch_number}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-xs text-slate-500">PO: {b.po_number}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-xs">{b.supplier_name}</span>
                      {!hasRemaining && <Badge variant="outline" className="text-xs text-red-500 ml-1">No stock</Badge>}
                    </div>
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Batch Info */}
      {selectedBatch && (
        <div className="p-3 bg-slate-50 rounded-lg border text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-slate-500">PO Number</p>
            <p className="font-semibold">{selectedBatch.po_number}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Supplier</p>
            <p className="font-semibold">{selectedBatch.supplier_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Remaining</p>
            <p className="font-semibold text-blue-600">{selectedBatch.total_remaining_quantity || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Waste So Far</p>
            <p className="font-semibold text-red-600">{selectedBatch.total_waste_quantity || 0}</p>
          </div>
        </div>
      )}

      {/* Select Item */}
      {selectedBatch && (
        <div>
          <Label>Select Item *</Label>
          <Select value={selectedItemKey} onValueChange={(val) => {
            setSelectedItemKey(val);
            setWasteQuantity('');
          }}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select item from batch..." />
            </SelectTrigger>
            <SelectContent>
              {availableItems.length === 0 ? (
                <div className="p-3 text-sm text-slate-500 text-center">No items with remaining stock</div>
              ) : (
                availableItems.map((item, idx) => (
                  <SelectItem key={idx} value={item.inventory_id || item.item_name}>
                    {item.item_name} — Remaining: {item.quantity_remaining || 0} {item.unit || 'kg'}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selected Item Details */}
      {selectedItem && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
          <p><span className="font-semibold">Item:</span> {selectedItem.item_name}</p>
          <p><span className="font-semibold">Remaining:</span> {maxQty} {selectedItem.unit || 'kg'}</p>
          <p><span className="font-semibold">Unit Price:</span> ৳{(selectedItem.unit_price || 0).toLocaleString()}</p>
        </div>
      )}

      {/* Waste Quantity */}
      {selectedItem && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Waste Quantity *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={maxQty}
              value={wasteQuantity}
              onChange={(e) => setWasteQuantity(e.target.value)}
              placeholder={`Max: ${maxQty}`}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Estimated Loss</Label>
            <div className="mt-1 p-2 bg-red-50 rounded-lg border border-red-200 text-red-700 font-bold text-lg">
              ৳{((parseFloat(wasteQuantity) || 0) * (selectedItem.unit_price || 0)).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Waste Reason */}
      <div>
        <Label>Waste Reason *</Label>
        <Select value={wasteReason} onValueChange={setWasteReason}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WASTE_REASONS.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the waste reason in detail..."
          rows={3}
          className="mt-1"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          className="bg-red-600 hover:bg-red-700"
          disabled={!selectedBatchId || !selectedItemKey || !wasteQuantity}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Submit Waste Record
        </Button>
      </div>
    </div>
  );
}
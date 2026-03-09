import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitMerge, ArrowRight, AlertTriangle } from 'lucide-react';

export default function MergeCategoryDialog({ open, onOpenChange, selectedCategories, allInventory, onMerge }) {
  const [targetId, setTargetId] = useState(selectedCategories[0]?.id || '');
  const [customName, setCustomName] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const targetCat = selectedCategories.find(c => c.id === targetId);
  const sourceCats = selectedCategories.filter(c => c.id !== targetId);

  // Count affected inventory items
  const sourceNames = sourceCats.map(c => c.name);
  const affectedCount = allInventory.filter(item => sourceNames.includes(item.category)).length;

  const handleMerge = async () => {
    if (!targetId) return;
    setIsMerging(true);
    await onMerge({
      targetId,
      targetName: customName.trim() || targetCat?.name,
      sourceCategories: sourceCats,
      affectedCount
    });
    setIsMerging(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-purple-600" />
            Merge Categories
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Source categories */}
          <div>
            <Label className="text-sm text-slate-500 mb-2 block">Categories to merge</Label>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map(cat => (
                <Badge
                  key={cat.id}
                  className={`text-sm py-1 px-3 ${cat.id === targetId ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-slate-100 text-slate-600'}`}
                  style={{ borderLeft: `4px solid ${cat.color || '#94A3B8'}` }}
                >
                  {cat.name}
                  {cat.id === targetId && <span className="ml-1.5 text-xs opacity-70">← keep</span>}
                </Badge>
              ))}
            </div>
          </div>

          {/* Target selection */}
          <div>
            <Label>Keep which category? *</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target category..." />
              </SelectTrigger>
              <SelectContent>
                {selectedCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional rename */}
          <div>
            <Label>Rename merged category (optional)</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={targetCat?.name || 'Keep original name'}
            />
          </div>

          {/* Impact preview */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">Merge impact</p>
                <ul className="mt-1 text-amber-700 space-y-1">
                  <li className="flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    <strong>{sourceCats.length}</strong> categor{sourceCats.length === 1 ? 'y' : 'ies'} will be deleted
                  </li>
                  <li className="flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    <strong>{affectedCount}</strong> inventory items will be reassigned to <strong>{customName.trim() || targetCat?.name}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleMerge}
              disabled={isMerging || !targetId || sourceCats.length === 0}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <GitMerge className="w-4 h-4" />
              {isMerging ? 'Merging...' : `Merge ${selectedCategories.length} → 1`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
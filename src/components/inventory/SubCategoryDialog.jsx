import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FolderPlus, Check, X } from 'lucide-react';

const CATEGORY_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Red', value: '#EF4444' },
];

export default function SubCategoryDialog({ open, onOpenChange, parentCategory, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: parentCategory?.color || '#3B82F6',
    sort_order: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateSlug = (name) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    await onSubmit({
      name: formData.name.trim(),
      slug: generateSlug(formData.name),
      department: parentCategory?.department || 'prodhan_com_e_commerce',
      category_type: parentCategory?.category_type || 'product_category',
      parent_category_id: parentCategory?.id,
      description: formData.description,
      color: formData.color,
      sort_order: formData.sort_order,
      is_active: true,
    });
    setFormData({ name: '', description: '', color: parentCategory?.color || '#3B82F6', sort_order: 0 });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  if (!parentCategory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-600" />
            Add Sub-Category
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: parentCategory.color || '#3B82F6' }}
          >
            {parentCategory.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-xs text-slate-500">Parent category</span>
            <p className="font-semibold text-sm">{parentCategory.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Sub-Category Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={`e.g. ${parentCategory.name} - Men, ${parentCategory.name} - Women`}
              required
              autoFocus
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Color</Label>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {CATEGORY_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${formData.color === c.value ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Sub-Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
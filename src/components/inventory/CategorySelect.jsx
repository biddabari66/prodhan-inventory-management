import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
];

/**
 * Quick Add Category Form
 */
function QuickAddCategoryForm({ department, categoryType, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const createMutation = useMutation({
    mutationFn: (data) => erp.entities.ProductCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-categories']);
      toast.success('Category created!');
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      department,
      category_type: categoryType,
      color,
      is_active: true,
      sort_order: 999
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Category Name *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter category name"
          autoFocus
        />
      </div>
      <div>
        <Label>Color</Label>
        <div className="flex gap-2 mt-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                color === c.value ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : ''
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={createMutation.isPending}>
          <Check className="w-4 h-4 mr-1" /> Create
        </Button>
      </div>
    </form>
  );
}

/**
 * Reusable Category Select Component with Add New option
 */
export default function CategorySelect({ 
  value, 
  onValueChange, 
  department, 
  categoryType = 'product_category',
  placeholder = 'Select category',
  showDepartmentBadge = false,
  showAddNew = true,
  className = ''
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Fetch categories based on department
  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ['product-categories', department, categoryType],
    queryFn: async () => {
      const allCategories = await erp.entities.ProductCategory.list('sort_order');
      return allCategories.filter(cat => 
        cat.is_active && 
        cat.category_type === categoryType &&
        (cat.department === department || cat.department === 'both')
      );
    },
  });

  const handleAddSuccess = () => {
    setIsAddOpen(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 h-10 px-3 border rounded-md bg-muted ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading categories...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {categories.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                No categories available
              </div>
            ) : (
              categories.map((category) => (
                <SelectItem key={category.id} value={category.slug || category.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    />
                    <span>{category.name}</span>
                    {showDepartmentBadge && category.department === 'both' && (
                      <Badge variant="outline" className="text-xs ml-2">All</Badge>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        {showAddNew && (
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            onClick={() => setIsAddOpen(true)}
            title="Add new category"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <QuickAddCategoryForm
            department={department}
            categoryType={categoryType}
            onSuccess={handleAddSuccess}
            onCancel={() => setIsAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Book Subject Select Component
 * Specifically for Boibari book subjects
 */
export function BookSubjectSelect({ value, onValueChange, className = '', showAddNew = true }) {
  return (
    <CategorySelect
      value={value}
      onValueChange={onValueChange}
      department="boibari"
      categoryType="book_subject"
      placeholder="Select subject"
      className={className}
      showAddNew={showAddNew}
    />
  );
}

/**
 * Product Category Select for Prodhan.com
 */
export function ProdhanCategorySelect({ value, onValueChange, className = '', showAddNew = true }) {
  return (
    <CategorySelect
      value={value}
      onValueChange={onValueChange}
      department="prodhan_com_e_commerce"
      categoryType="product_category"
      placeholder="Select category"
      className={className}
      showAddNew={showAddNew}
    />
  );
}
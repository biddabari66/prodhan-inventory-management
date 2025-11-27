import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Category Select Component
 * Filters categories based on user's department
 */
export default function CategorySelect({ 
  value, 
  onValueChange, 
  department, 
  categoryType = 'product_category',
  placeholder = 'Select category',
  showDepartmentBadge = false,
  className = ''
}) {
  // Fetch categories based on department
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['product-categories', department, categoryType],
    queryFn: async () => {
      const allCategories = await base44.entities.ProductCategory.list('sort_order');
      return allCategories.filter(cat => 
        cat.is_active && 
        cat.category_type === categoryType &&
        (cat.department === department || cat.department === 'both')
      );
    },
  });

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 h-10 px-3 border rounded-md bg-muted ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading categories...</span>
      </div>
    );
  }

  return (
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
  );
}

/**
 * Book Subject Select Component
 * Specifically for Boibari book subjects
 */
export function BookSubjectSelect({ value, onValueChange, className = '' }) {
  return (
    <CategorySelect
      value={value}
      onValueChange={onValueChange}
      department="boibari"
      categoryType="book_subject"
      placeholder="Select subject"
      className={className}
    />
  );
}

/**
 * Product Category Select for Prodhan.com
 */
export function ProdhanCategorySelect({ value, onValueChange, className = '' }) {
  return (
    <CategorySelect
      value={value}
      onValueChange={onValueChange}
      department="prodhan_com_e_commerce"
      categoryType="product_category"
      placeholder="Select category"
      className={className}
    />
  );
}
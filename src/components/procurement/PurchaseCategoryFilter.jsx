import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Layers } from 'lucide-react';

export default function PurchaseCategoryFilter({ selected, onSelect }) {
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => erp.entities.ProductCategory.filter({ department: 'prodhan_com_e_commerce', is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  // Also fetch unique categories from inventory to include unregistered ones
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-categories-filter'],
    queryFn: () => erp.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }, '-updated_date', 5000),
    staleTime: 5 * 60 * 1000,
  });

  // Merge categories from both sources
  const allCategories = useMemo(() => {
    const catMap = new Map();
    // Add registered categories first (with their sort order)
    categories.forEach(c => catMap.set(c.name?.toLowerCase(), { name: c.name, sortOrder: c.sort_order || 0, registered: true }));
    // Add unregistered inventory categories
    inventoryItems.forEach(item => {
      if (item.category?.trim() && !catMap.has(item.category.trim().toLowerCase())) {
        catMap.set(item.category.trim().toLowerCase(), { name: item.category.trim(), sortOrder: 9999, registered: false });
      }
    });
    return [...catMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, inventoryItems]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <Layers className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <button
        onClick={() => onSelect('all')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
          selected === 'all'
            ? 'bg-slate-900 text-white shadow-sm'
            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
        }`}
      >
        All Categories
      </button>
      {allCategories.map((cat) => (
        <button
          key={cat.name}
          onClick={() => onSelect(cat.name)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            selected === cat.name
              ? 'bg-red-600 text-white shadow-sm'
              : cat.registered
                ? 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300'
          }`}
        >
          {cat.name} {!cat.registered && '•'}
        </button>
      ))}
    </div>
  );
}
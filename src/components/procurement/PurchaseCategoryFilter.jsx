import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';

export default function PurchaseCategoryFilter({ selected, onSelect }) {
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => base44.entities.ProductCategory.filter({ department: 'prodhan_com_e_commerce', is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  const sorted = [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

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
      {sorted.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.name)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            selected === cat.name
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
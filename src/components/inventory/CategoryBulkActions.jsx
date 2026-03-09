import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Trash2, GitMerge, FolderPlus, X } from 'lucide-react';

export default function CategoryBulkActions({ selectedIds, categories, onMerge, onBulkDelete, onCreateSubCategory, onClearSelection }) {
  const count = selectedIds.length;
  if (count === 0) return null;

  const selectedNames = selectedIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean);

  return (
    <div className="sticky top-0 z-20 bg-white border border-red-200 rounded-xl shadow-lg p-4 flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-red-600" />
        <span className="font-semibold text-sm text-slate-700">
          {count} selected
        </span>
        <div className="flex gap-1 flex-wrap max-w-sm">
          {selectedNames.slice(0, 3).map(name => (
            <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
          ))}
          {selectedNames.length > 3 && <Badge variant="outline" className="text-xs">+{selectedNames.length - 3}</Badge>}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 flex-wrap">
        {count === 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCreateSubCategory(selectedIds[0])}
            className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <FolderPlus className="w-4 h-4" />
            Add Sub-Category
          </Button>
        )}

        {count >= 2 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onMerge}
            className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <GitMerge className="w-4 h-4" />
            Merge ({count})
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onBulkDelete}
          className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete ({count})
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="gap-1 text-slate-500"
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
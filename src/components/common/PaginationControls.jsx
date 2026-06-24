import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PaginationControls({ 
  currentPage, 
  totalPages, 
  totalRecords, 
  limit, 
  onPageChange, 
  onLimitChange,
  className = "" 
}) {
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3 border-t border-slate-100 ${className}`}>
      
      {/* Items per page selector */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>Show</span>
        <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger className="h-8 w-[80px] bg-white border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="300">300</SelectItem>
          </SelectContent>
        </Select>
        <span>items</span>
      </div>

      {/* Page Info */}
      <div className="text-sm text-slate-500 font-medium">
        Page {currentPage} of {totalPages || 1} <span className="mx-2 opacity-50">|</span> Total: {totalRecords || 0}
      </div>

      {/* Prev/Next Buttons */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage <= 1}
          className="h-8 px-2 gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage >= totalPages}
          className="h-8 px-2 gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

    </div>
  );
}

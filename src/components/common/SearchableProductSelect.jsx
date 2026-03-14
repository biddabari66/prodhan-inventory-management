import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, Package, X, Check } from 'lucide-react';

export default function SearchableProductSelect({ 
  inventory = [], 
  value, 
  onValueChange, 
  placeholder = "Search and select product...",
  showStock = true,
  showPrice = true,
  disabled = false,
  allowClear = false,
  onClear
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const isOpenRef = useRef(false);
  const inputRef = useRef(null);

  // Keep ref in sync to avoid stale closures
  isOpenRef.current = isOpen;

  const selectedItem = useMemo(() => {
    return inventory.find(item => item.id === value);
  }, [inventory, value]);

  const filteredItems = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];
    if (!searchQuery) return inventory.slice(0, 30);
    const query = searchQuery.toLowerCase();
    const exactMatch = inventory.find(item => 
      item.isbn === query || item.barcode === query
    );
    if (exactMatch) return [exactMatch];
    return inventory.filter(item => 
      item.item_name?.toLowerCase().includes(query) ||
      item.english_item_name?.toLowerCase().includes(query) ||
      item.isbn?.includes(query) ||
      item.barcode?.includes(query) ||
      item.category?.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [inventory, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    // Use setTimeout to avoid immediate trigger
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const openDropdown = useCallback(() => {
    if (!disabled && !isOpenRef.current) {
      setIsOpen(true);
    }
  }, [disabled]);

  const handleSelect = useCallback((itemId) => {
    onValueChange(itemId);
    setIsOpen(false);
    setSearchQuery('');
  }, [onValueChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (allowClear && onClear) {
      onClear();
    } else {
      onValueChange('');
    }
    setSearchQuery('');
  }, [allowClear, onClear, onValueChange]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Value Display / Search Input */}
      {selectedItem && !isOpen ? (
        <div 
          className={`flex items-center justify-between p-2.5 border rounded-lg transition-colors ${
            disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white hover:border-violet-400 cursor-pointer'
          }`}
          onClick={openDropdown}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Package className="w-4 h-4 text-violet-600 flex-shrink-0" />
            <div className="truncate">
              <span className="font-medium text-sm">{selectedItem.item_name}</span>
              {showStock && <span className="text-xs text-slate-500 ml-2">(Stock: {selectedItem.current_stock})</span>}
            </div>
          </div>
          {!disabled && (
            <button 
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={openDropdown}
            placeholder={placeholder}
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-4 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            disabled={disabled}
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {selectedItem && (
            <div className="sticky top-0 bg-white p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-4 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  autoFocus
                />
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="py-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-violet-50 transition-colors ${
                    item.id === value ? 'bg-violet-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-800 truncate">
                        {item.item_name}
                      </span>
                      {item.id === value && (
                        <Check className="w-4 h-4 text-violet-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {showStock && (
                        <Badge variant="outline" className="text-xs py-0">
                          Stock: {item.current_stock}
                        </Badge>
                      )}
                      {item.category && (
                        <Badge variant="outline" className="text-xs py-0">
                          {item.category}
                        </Badge>
                      )}
                      {item.isbn && (
                        <Badge variant="outline" className="text-xs py-0 text-violet-600">
                          ISBN: {item.isbn}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {showPrice && (
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-violet-600">
                        ৳{item.selling_price?.toLocaleString() || 0}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
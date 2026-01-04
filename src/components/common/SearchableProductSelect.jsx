import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, X, Check } from 'lucide-react';

export default function SearchableProductSelect({ 
  inventory = [], 
  value, 
  onValueChange, 
  placeholder = "Search and select product..." 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  const selectedItem = useMemo(() => {
    return inventory.find(item => item.id === value);
  }, [inventory, value]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return inventory.slice(0, 50);
    const query = searchQuery.toLowerCase();
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
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (itemId) => {
    onValueChange(itemId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onValueChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Value Display / Search Input */}
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        {selectedItem && !isOpen ? (
          <div className="flex items-center justify-between p-2.5 border rounded-lg bg-white hover:border-violet-400 transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Package className="w-4 h-4 text-violet-600 flex-shrink-0" />
              <div className="truncate">
                <span className="font-medium text-sm">{selectedItem.item_name}</span>
                <span className="text-xs text-slate-500 ml-2">(Stock: {selectedItem.current_stock})</span>
              </div>
            </div>
            <button 
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="pl-9 pr-4"
            />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Search Input (when dropdown is open) */}
          {selectedItem && (
            <div className="sticky top-0 bg-white p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 text-sm"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Items List */}
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
                      <Badge variant="outline" className="text-xs py-0">
                        Stock: {item.current_stock}
                      </Badge>
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
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="text-sm font-semibold text-violet-600">
                      ৳{item.selling_price?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
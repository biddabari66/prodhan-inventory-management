import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Package, BookOpen, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Searchable Product Select Component
 * Professional, performant dropdown for selecting products from large lists
 */
export default function SearchableProductSelect({ 
  inventory = [], 
  value, 
  onValueChange, 
  placeholder = "Search products...",
  showStock = true,
  showPrice = true,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Selected product
  const selectedProduct = useMemo(() => 
    inventory.find(item => item.id === value), 
    [inventory, value]
  );

  // Filtered products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return inventory.slice(0, 50);
    
    const query = searchQuery.toLowerCase();
    return inventory.filter(item =>
      item.item_name?.toLowerCase().includes(query) ||
      item.barcode?.toLowerCase().includes(query) ||
      item.isbn?.toLowerCase().includes(query) ||
      item.author_name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [inventory, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product) => {
    onValueChange(product.id);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onValueChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected Value Display / Input */}
      <div 
        className={cn(
          "flex items-center gap-2 w-full border rounded-lg bg-white transition-all cursor-pointer",
          isOpen ? "ring-2 ring-violet-500 border-violet-500" : "border-slate-300 hover:border-slate-400",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50"
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <div className="flex items-center gap-2 flex-1 p-3">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {isOpen ? (
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
              autoFocus
              disabled={disabled}
            />
          ) : selectedProduct ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                selectedProduct.department === 'boibari' ? 'bg-cyan-100' : 'bg-purple-100'
              )}>
                {selectedProduct.department === 'boibari' ? 
                  <BookOpen className="w-4 h-4 text-cyan-600" /> : 
                  <Package className="w-4 h-4 text-purple-600" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{selectedProduct.item_name}</p>
                <div className="flex items-center gap-2">
                  {showStock && (
                    <span className="text-xs text-slate-500">Stock: {selectedProduct.current_stock}</span>
                  )}
                  {showPrice && (
                    <span className="text-xs text-slate-500">৳{selectedProduct.selling_price?.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>
        
        {selectedProduct && !isOpen && (
          <button
            onClick={handleClear}
            className="p-2 hover:bg-slate-100 rounded-lg mr-1 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <ScrollArea className="max-h-[300px]">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No products found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelect(product)}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                      product.id === value 
                        ? "bg-violet-50 border-l-2 border-l-violet-500" 
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      product.department === 'boibari' ? 'bg-cyan-100' : 'bg-purple-100'
                    )}>
                      {product.department === 'boibari' ? 
                        <BookOpen className="w-5 h-5 text-cyan-600" /> : 
                        <Package className="w-5 h-5 text-purple-600" />
                      }
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.item_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {product.isbn && (
                          <span className="text-xs text-slate-500">ISBN: {product.isbn}</span>
                        )}
                        {product.barcode && !product.isbn && (
                          <span className="text-xs text-slate-500">SKU: {product.barcode}</span>
                        )}
                        <Badge variant="outline" className="text-xs h-5">
                          {product.category}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {showStock && (
                        <Badge 
                          className={cn(
                            "text-xs",
                            product.current_stock < product.minimum_stock 
                              ? "bg-red-100 text-red-800" 
                              : "bg-green-100 text-green-800"
                          )}
                        >
                          {product.current_stock} in stock
                        </Badge>
                      )}
                      {showPrice && (
                        <p className="text-xs text-slate-600 mt-1">
                          ৳{product.selling_price?.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {product.id === value && (
                      <Check className="w-4 h-4 text-violet-600 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {filteredProducts.length > 0 && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
              Showing {filteredProducts.length} of {inventory.length} products
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Searchable Customer Select Component
 */
export function SearchableCustomerSelect({ 
  customers = [], 
  value, 
  onValueChange, 
  placeholder = "Search customers...",
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === value), 
    [customers, value]
  );

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 50);
    
    const query = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.customer_name?.toLowerCase().includes(query) ||
      c.customer_phone?.includes(query) ||
      c.customer_email?.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [customers, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer) => {
    onValueChange(customer.id);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div 
        className={cn(
          "flex items-center gap-2 w-full border rounded-lg bg-white transition-all cursor-pointer p-3",
          isOpen ? "ring-2 ring-violet-500 border-violet-500" : "border-slate-300 hover:border-slate-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <Search className="w-4 h-4 text-slate-400" />
        {isOpen ? (
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
            autoFocus
          />
        ) : selectedCustomer ? (
          <div className="flex-1">
            <p className="font-medium text-sm">{selectedCustomer.customer_name}</p>
            <p className="text-xs text-slate-500">{selectedCustomer.customer_phone}</p>
          </div>
        ) : (
          <span className="text-slate-500">{placeholder}</span>
        )}
        {selectedCustomer && !isOpen && (
          <button onClick={(e) => { e.stopPropagation(); onValueChange(''); }} className="p-1">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
          <ScrollArea className="max-h-[250px]">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <p className="text-sm">No customers found</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    className={cn(
                      "p-3 cursor-pointer transition-colors",
                      customer.id === value ? "bg-violet-50" : "hover:bg-slate-50"
                    )}
                  >
                    <p className="font-medium text-sm">{customer.customer_name}</p>
                    <p className="text-xs text-slate-500">{customer.customer_phone} • {customer.customer_email}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
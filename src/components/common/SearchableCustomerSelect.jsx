import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, X, Check, Phone, Mail } from 'lucide-react';

export default function SearchableCustomerSelect({ 
  customers = [], 
  value, 
  onValueChange, 
  placeholder = "Search customers..." 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  const selectedCustomer = useMemo(() => {
    return customers.find(customer => customer.id === value);
  }, [customers, value]);

  const filteredCustomers = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    if (!searchQuery) return customers.slice(0, 100);
    const query = searchQuery.toLowerCase();
    return customers.filter(customer => 
      customer.customer_name?.toLowerCase().includes(query) ||
      customer.customer_phone?.includes(query) ||
      customer.customer_email?.toLowerCase().includes(query)
    ).slice(0, 100);
  }, [customers, searchQuery]);

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

  const handleSelect = (customerId) => {
    onValueChange(customerId);
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
        {selectedCustomer && !isOpen ? (
          <div className="flex items-center justify-between p-2.5 border rounded-lg bg-white hover:border-violet-400 transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User className="w-4 h-4 text-violet-600 flex-shrink-0" />
              <div className="truncate">
                <span className="font-medium text-sm">{selectedCustomer.customer_name}</span>
                <span className="text-xs text-slate-500 ml-2">({selectedCustomer.customer_phone})</span>
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
          {selectedCustomer && (
            <div className="sticky top-0 bg-white p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers..."
                  className="pl-9 text-sm"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Customers List */}
          {filteredCustomers.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No customers found</p>
            </div>
          ) : (
            <div className="py-1">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleSelect(customer.id)}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-violet-50 transition-colors ${
                    customer.id === value ? 'bg-violet-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-800 truncate">
                        {customer.customer_name}
                      </span>
                      {customer.id === value && (
                        <Check className="w-4 h-4 text-violet-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.customer_phone}
                      </span>
                      {customer.customer_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.customer_email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {customer.total_orders || 0} orders
                    </Badge>
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
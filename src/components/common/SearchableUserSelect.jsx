import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, User, Mail, Search, Building2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function SearchableUserSelect({ 
  users = [], 
  value, 
  onValueChange, 
  placeholder = "Search by name, email, phone, or ID...",
  disabled = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

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

  // Dynamic search - matches name, email, phone, employee_id, department
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users.slice(0, 50); // Show first 50 when no search
    const query = search.toLowerCase().trim();
    
    // Prioritize exact email matches first
    const exactEmailMatch = users.filter(user => 
      user.email?.toLowerCase() === query
    );
    
    // Then partial matches
    const partialMatches = users.filter(user => {
      if (exactEmailMatch.includes(user)) return false;
      return (
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.employee_id?.toLowerCase().includes(query) ||
        user.phone?.includes(query) ||
        user.department?.toLowerCase().includes(query) ||
        user.job_role?.toLowerCase().includes(query)
      );
    });
    
    return [...exactEmailMatch, ...partialMatches].slice(0, 30);
  }, [users, search]);

  const selectedUser = users.find(u => u.id === value);

  const handleSelect = (user) => {
    onValueChange(user.id === value ? '' : user.id);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onValueChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Selected User Display or Search Input */}
      {selectedUser && !isOpen ? (
        <div 
          className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {selectedUser.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{selectedUser.full_name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail className="w-3 h-3" />
                <span>{selectedUser.email}</span>
                {selectedUser.department && (
                  <>
                    <span>•</span>
                    <Building2 className="w-3 h-3" />
                    <span className="capitalize">{selectedUser.department?.replace(/_/g, ' ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 w-8 p-0 hover:bg-red-50">
            <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className="pl-10 pr-4 h-11"
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No employees found</p>
              <p className="text-xs text-slate-400 mt-1">Try searching by email or name</p>
            </div>
          ) : (
            <div className="py-1">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                    value === user.id ? "bg-violet-50 border-l-2 border-violet-500" : "hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                    value === user.id ? "bg-violet-600" : "bg-slate-400"
                  )}>
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{user.full_name}</p>
                      {value === user.id && <Check className="w-4 h-4 text-violet-600 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {user.employee_id && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {user.employee_id}
                        </Badge>
                      )}
                      {user.department && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-slate-50">
                          {user.department?.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {user.job_role && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700 border-0">
                          {user.job_role}
                        </Badge>
                      )}
                    </div>
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
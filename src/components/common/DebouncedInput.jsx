import React, { useState, useEffect, useCallback, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * DEBOUNCED INPUT COMPONENT
 * Prevents excessive API calls while user is typing
 */

const DebouncedInput = memo(({
  value: externalValue,
  onChange,
  debounceMs = 300,
  placeholder = 'Search...',
  showSearchIcon = true,
  showClearButton = true,
  isLoading = false,
  className = '',
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(externalValue || '');

  // Sync internal value with external value
  useEffect(() => {
    setInternalValue(externalValue || '');
  }, [externalValue]);

  // Debounced onChange handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== externalValue) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange, externalValue]);

  const handleChange = useCallback((e) => {
    setInternalValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={`relative ${className}`}>
      {showSearchIcon && (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      )}
      
      <Input
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${showSearchIcon ? 'pl-9' : ''} ${showClearButton && internalValue ? 'pr-16' : ''}`}
        {...props}
      />
      
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isLoading && (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        )}
        
        {showClearButton && internalValue && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
});

DebouncedInput.displayName = 'DebouncedInput';

export default DebouncedInput;
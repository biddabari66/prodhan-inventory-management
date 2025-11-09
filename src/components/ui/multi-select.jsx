import React, { useState, useMemo } from "react";
import { X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MultiSelect({ options, selected, onChange, placeholder = "Select employees...", className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleUnselect = (value) => {
    onChange(selected.filter((s) => s !== value));
  };

  const handleSelect = (value) => {
    if (!selected.includes(value)) {
      onChange([...selected, value]);
    }
    setSearchTerm("");
  };

  const filteredOptions = useMemo(() => {
    return options.filter(option => 
      !selected.includes(option.value) &&
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, selected, searchTerm]);

  const selectedOptions = useMemo(() => {
    return selected.map(value => options.find(opt => opt.value === value)).filter(Boolean);
  }, [selected, options]);

  return (
    <div className={`relative ${className}`}>
      <div className="min-h-[40px] w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1 items-center">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="secondary" className="flex items-center gap-1">
              {option.label}
              <button
                type="button"
                className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                onClick={() => handleUnselect(option.value)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <div className="flex-1 flex items-center gap-2 min-w-[120px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={selected.length === 0 ? placeholder : ""}
              className="flex-1 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
            />
            <ChevronDown 
              className="h-4 w-4 text-muted-foreground cursor-pointer" 
              onClick={() => setIsOpen(!isOpen)}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {searchTerm ? 'No employees found' : 'No more employees to select'}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
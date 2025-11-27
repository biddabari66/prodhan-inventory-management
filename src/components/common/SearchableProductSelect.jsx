import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Package } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchableProductSelect({ 
  products, 
  value, 
  onChange, 
  placeholder = "Search and select product...",
  disabled = false 
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === value);
  }, [products, value]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.item_name?.toLowerCase().includes(query) ||
      p.isbn?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate">
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedProduct.item_name}</span>
              <Badge variant="outline" className="ml-auto flex-shrink-0">
                Stock: {selectedProduct.current_stock}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search by name, ISBN, barcode..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No products found
            </div>
          </CommandEmpty>
          <CommandList>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={() => {
                    onChange(product.id);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "w-4 h-4",
                          value === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div>
                        <p className="font-medium">{product.item_name}</p>
                        <div className="flex gap-2 mt-1">
                          {product.isbn && (
                            <Badge variant="outline" className="text-xs">
                              ISBN: {product.isbn}
                            </Badge>
                          )}
                          {product.barcode && (
                            <Badge variant="outline" className="text-xs">
                              SKU: {product.barcode}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-violet-600">
                        ৳{product.selling_price?.toLocaleString()}
                      </p>
                      <Badge 
                        variant={product.current_stock > 0 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        Stock: {product.current_stock}
                      </Badge>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
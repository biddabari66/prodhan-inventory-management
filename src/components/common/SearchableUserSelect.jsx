import React, { useState, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchableUserSelect({ 
  users = [], 
  value, 
  onValueChange, 
  placeholder = "Search employees...",
  disabled = false,
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const query = search.toLowerCase();
    return users.filter(user => 
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.employee_id?.toLowerCase().includes(query)
    );
  }, [users, search]);

  const selectedUser = users.find(u => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedUser ? (
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              {selectedUser.full_name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput 
            placeholder="Search by name or email..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {filteredUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onValueChange(user.id === value ? '' : user.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
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
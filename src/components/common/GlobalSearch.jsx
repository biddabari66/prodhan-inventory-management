import React, { useState, useEffect } from 'react';
import { Search, Users, DollarSign, Package, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const mockResults = [
    { id: 1, type: 'student', title: 'Ahmed Hassan', subtitle: 'BCS Student', icon: Users },
    { id: 2, type: 'expense', title: 'Office Supplies', subtitle: '৳5,000 - Marketing', icon: DollarSign },
    { id: 3, type: 'inventory', title: 'BCS Guidebook', subtitle: '120 units remaining', icon: Package },
    { id: 4, type: 'lead', title: 'Fatima Rahman', subtitle: 'Interested in Bank Course', icon: Target },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'student': return 'bg-blue-100 text-blue-700';
      case 'expense': return 'bg-red-100 text-red-700';
      case 'inventory': return 'bg-green-100 text-green-700';
      case 'lead': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-start text-sm text-muted-foreground hover:bg-white/10 border-white/20"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search anything...
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search students, expenses, inventory..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {search && (
            <>
              <CommandGroup heading="Quick Results">
                {mockResults
                  .filter(item => 
                    item.title.toLowerCase().includes(search.toLowerCase()) ||
                    item.subtitle.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem key={item.id}>
                        <div className="flex items-center gap-3 w-full">
                          <Icon className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                          </div>
                          <Badge className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup heading="Quick Actions">
            <CommandItem>
              <Users className="mr-2 h-4 w-4" />
              <span>Add New Student</span>
            </CommandItem>
            <CommandItem>
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Record Expense</span>
            </CommandItem>
            <CommandItem>
              <Target className="mr-2 h-4 w-4" />
              <span>Create Lead</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
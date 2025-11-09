import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'This Month', value: 'thismonth' },
  { label: 'Last Month', value: 'lastmonth' },
  { label: 'Custom Range', value: 'custom' }
];

export default function DateRangeFilter({ value, onChange, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState('');
  const [customRange, setCustomRange] = useState({ from: null, to: null });

  const getDateRange = (presetValue) => {
    const today = new Date();
    switch (presetValue) {
      case 'today':
        return { from: today, to: today };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { from: yesterday, to: yesterday };
      case 'last7days':
        return { from: subDays(today, 6), to: today };
      case 'thismonth':
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case 'lastmonth':
        const lastMonth = subDays(startOfMonth(today), 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      default:
        return null;
    }
  };

  const handlePresetChange = (presetValue) => {
    setPreset(presetValue);
    if (presetValue === 'custom') {
      // Don't auto-apply, wait for custom selection
      return;
    }
    
    const dateRange = getDateRange(presetValue);
    if (dateRange) {
      onChange(dateRange);
      setIsOpen(false);
    }
  };

  const handleCustomRangeSelect = (range) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      onChange(range);
      setIsOpen(false);
    }
  };

  const clearFilter = () => {
    setPreset('');
    setCustomRange({ from: null, to: null });
    onChange(null);
  };

  const formatDisplayText = () => {
    if (!value) return 'Date Added';
    
    if (value.from && value.to) {
      if (format(value.from, 'yyyy-MM-dd') === format(value.to, 'yyyy-MM-dd')) {
        return format(value.from, 'MMM d, yyyy');
      }
      return `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d, yyyy')}`;
    }
    
    return 'Date Added';
  };

  return (
    <div className={cn('relative', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="p-3 border-r">
              <div className="space-y-1">
                {DATE_PRESETS.map((presetOption) => (
                  <Button
                    key={presetOption.value}
                    variant={preset === presetOption.value ? "default" : "ghost"}
                    className="w-full justify-start text-sm"
                    onClick={() => handlePresetChange(presetOption.value)}
                  >
                    {presetOption.label}
                  </Button>
                ))}
              </div>
            </div>
            {preset === 'custom' && (
              <div className="p-3">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customRange?.from}
                  selected={customRange}
                  onSelect={handleCustomRangeSelect}
                  numberOfMonths={2}
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
          onClick={clearFilter}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
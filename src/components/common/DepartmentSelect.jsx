import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Globe } from 'lucide-react';

const DEPARTMENTS = [
  { 
    value: 'prodhan_com_e_commerce', 
    label: 'Prodhan.com E-commerce', 
    icon: Globe,
    color: 'text-purple-600'
  }
];

export default function DepartmentSelect({ 
  value, 
  onValueChange, 
  placeholder = "Select department...",
  className = "",
  required = false,
  includeAllOption = false,
  allOptionLabel = "All Departments"
}) {
  return (
    <Select value={value} onValueChange={onValueChange} required={required}>
      <SelectTrigger className={`w-full ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {DEPARTMENTS.map((dept) => {
          const IconComponent = dept.icon;
          return (
            <SelectItem key={dept.value} value={dept.value}>
              <div className="flex items-center gap-3">
                <IconComponent className={`w-4 h-4 ${dept.color}`} />
                <span>{dept.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// Export departments array for use in other components
export { DEPARTMENTS };
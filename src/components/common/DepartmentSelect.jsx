import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, 
  Code, 
  Package, 
  Users, 
  Headphones, 
  Megaphone, 
  ShoppingCart, 
  TrendingUp, 
  FlaskConical,
  Building2
} from 'lucide-react';

const DEPARTMENTS = [
  { 
    value: 'biddabari_publication', 
    label: 'Biddabari Publication', 
    icon: BookOpen,
    color: 'text-blue-600'
  },
  { 
    value: 'it', 
    label: 'IT', 
    icon: Code,
    color: 'text-purple-600'
  },
  { 
    value: 'boibari', 
    label: 'Boibari', 
    icon: Package,
    color: 'text-green-600'
  },
  { 
    value: 'admission', 
    label: 'Admission', 
    icon: Users,
    color: 'text-orange-600'
  },
  { 
    value: 'service', 
    label: 'Service', 
    icon: Headphones,
    color: 'text-cyan-600'
  },
  { 
    value: 'marketing', 
    label: 'Marketing', 
    icon: Megaphone,
    color: 'text-pink-600'
  },
  { 
    value: 'prodhan_com_e_commerce', 
    label: 'Prodhan.com (E-commerce)', 
    icon: ShoppingCart,
    color: 'text-indigo-600'
  },
  { 
    value: 'sales', 
    label: 'Sales', 
    icon: TrendingUp,
    color: 'text-emerald-600'
  },
  { 
    value: 'r_and_d', 
    label: 'R & D', 
    icon: FlaskConical,
    color: 'text-violet-600'
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
        {includeAllOption && (
          <SelectItem value="all">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-gray-600" />
              <span>{allOptionLabel}</span>
            </div>
          </SelectItem>
        )}
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
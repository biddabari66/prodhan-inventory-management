import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock } from 'lucide-react';

/**
 * DEPARTMENT FILTER WITH DATA SEGREGATION
 * Enforces strict department-based access control
 */
export default function DepartmentFilter({ currentUser, selectedDepartment, onDepartmentChange }) {
  // Super admin and specific roles can view all departments
  const canViewAllDepartments = currentUser?.job_role === 'super_admin' || 
                                  currentUser?.job_role === 'admin' ||
                                  currentUser?.job_role === 'inventory_manager';

  // Get user's default department from User entity
  const userDepartment = currentUser?.department;

  // Determine available departments
  const getAvailableDepartments = () => {
    if (canViewAllDepartments) {
      return [
        { value: 'all', label: 'All Departments', restricted: false },
        { value: 'boibari', label: 'Boibari.com (Books)', restricted: false },
        { value: 'prodhan_com_e_commerce', label: 'Prodhan.com (E-commerce)', restricted: false }
      ];
    }

    // Regular users can only see their own department
    if (userDepartment === 'boibari') {
      return [{ value: 'boibari', label: 'Boibari.com (Books)', restricted: true }];
    } else if (userDepartment === 'prodhan_com_e_commerce') {
      return [{ value: 'prodhan_com_e_commerce', label: 'Prodhan.com (E-commerce)', restricted: true }];
    }

    // Default fallback
    return [{ value: 'all', label: 'No Department Access', restricted: true }];
  };

  const availableDepartments = getAvailableDepartments();

  // Auto-select user's department if they can only access one
  React.useEffect(() => {
    if (!canViewAllDepartments && availableDepartments.length === 1) {
      onDepartmentChange(availableDepartments[0].value);
    }
  }, [canViewAllDepartments, availableDepartments, onDepartmentChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {availableDepartments.map((dept) => (
              <SelectItem key={dept.value} value={dept.value}>
                <div className="flex items-center gap-2">
                  {dept.restricted && <Lock className="w-3 h-3 text-orange-600" />}
                  {dept.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!canViewAllDepartments && (
          <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Restricted Access
          </Badge>
        )}
      </div>

      {!canViewAllDepartments && (
        <p className="text-xs text-muted-foreground">
          You can only view {userDepartment === 'boibari' ? 'Boibari.com' : 'Prodhan.com'} inventory.
          Contact administrator for cross-department access.
        </p>
      )}
    </div>
  );
}
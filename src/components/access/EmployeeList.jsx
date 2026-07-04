import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users } from 'lucide-react';

export default function EmployeeList({
  employees,
  selectedEmployee,
  onEmployeeSelect,
  filters,
  setFilters,
  isLoading,
  DepartmentSelectComponent
}) {
  return (
    <Card className="h-full flex flex-col premium-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Employees ({employees.length})
          </div>
        </CardTitle>
        <div className="pt-4 space-y-3">
          <Input
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            {/* Use the enhanced DepartmentSelectComponent with "All" option */}
            <DepartmentSelectComponent
              value={filters.department}
              onValueChange={(value) => setFilters({ ...filters, department: value })}
              placeholder="All Departments"
              includeAllOption={true}
              allOptionLabel="All Departments"
            />
            <Select
              value={filters.job_role}
              onValueChange={(value) => setFilters({ ...filters, job_role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                <SelectItem value="procurement_officer">Procurement Officer</SelectItem>
                <SelectItem value="sales_staff">Sales Staff</SelectItem>
                <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="department_head">Department Head</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {employees.map(user => (
                <button
                  key={user.id}
                  onClick={() => onEmployeeSelect(user)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    selectedEmployee?.id === user.id
                      ? 'bg-violet-100 dark:bg-violet-900/50'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profile_picture_url} />
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                      {user.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">{user.full_name || user.displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-violet-600 font-medium truncate">
                      {user.department?.name || 'No Department'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
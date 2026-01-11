import React, { useState, useEffect, useMemo } from 'react';
import { User } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';
import { NotificationService } from '../components/notifications/NotificationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Shield, Users, Search, Save, Crown, Lock, AlertTriangle, Loader2
} from 'lucide-react';
import EmployeeList from '../components/access/EmployeeList';
import PermissionMatrix from '../components/access/PermissionMatrix';
import DepartmentSelect from '../components/common/DepartmentSelect';
import { withPermission } from '../components/common/PermissionGuard';

// INVENTORY-FOCUSED PERMISSIONS SYSTEM
// Source of truth for default permissions per role
const ROLE_PERMISSIONS = {
  super_admin: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_categories: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true },
    inventory_ai_insights: { can_view: true, can_export: true },
    financial_analytics: { can_view: true, can_export: true, can_view_sensitive_finance: true },
    user_access_manager: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    integrations: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    system_alerts: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    audit_trail: { can_view: true, can_export: true }
  },
  admin: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_approve: true, can_export: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_categories: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true },
    inventory_ai_insights: { can_view: true, can_export: true },
    financial_analytics: { can_view: true, can_export: true },
    user_access_manager: { can_view: true, can_create: true, can_edit: true },
    integrations: { can_view: true, can_create: true, can_edit: true },
    system_alerts: { can_view: true, can_create: true, can_edit: true },
    audit_trail: { can_view: true, can_export: true }
  },
  inventory_manager: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_approve: true, can_export: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_categories: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true },
    inventory_ai_insights: { can_view: true, can_export: true },
    financial_analytics: { can_view: true, can_export: true }
  },
  procurement_officer: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true, can_export: true },
    sales: { can_view: true, can_export: true },
    customer_management: { can_view: true, can_export: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true }
  },
  sales_staff: {
    inventory_overview: { can_view: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true }
  },
  warehouse_staff: {
    inventory_overview: { can_view: true },
    inventory_movements: { can_view: true, can_create: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_export: true },
    purchase_orders: { can_view: true, can_export: true }
  },
  viewer: {
    inventory_overview: { can_view: true },
    sales: { can_view: true },
    customer_management: { can_view: true },
    inventory_reports: { can_view: true, can_export: true }
  }
};


function UserAccessManagerPage() {
  const [users, setUsers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    department: 'all',
    job_role: 'all'
  });

  const departments = [
    { value: 'biddabari_publication', label: 'Biddabari Publication' },
    { value: 'it', label: 'IT' },
    { value: 'boibari', label: 'Boibari' },
    { value: 'admission', label: 'Admission' },
    { value: 'service', label: 'Service' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'prodhan_com_e_commerce', label: 'Prodhan.com' },
    { value: 'sales', label: 'Sales' },
    { value: 'r_and_d', label: 'R&D' },
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'HR' },
    { value: 'operations', label: 'Operations' }
  ];

  const getDepartmentDisplayName = (departmentValue) => {
    const dept = departments.find(d => d.value === departmentValue);
    return dept ? dept.label : departmentValue;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, currentUserData] = await Promise.all([
        User.list(),
        User.me()
      ]);
      setUsers(usersData);
      setCurrentUser(currentUserData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async (userId) => {
    if (!userId) {
      setPermissions({});
      return;
    }
    try {
      const userPermissions = await UserPermission.filter({ user_id: userId });
      const permissionsMap = {};
      userPermissions.forEach(p => {
        permissionsMap[p.module] = {
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_approve: p.can_approve,
          can_export: p.can_export,
          can_view_sensitive_finance: p.can_view_sensitive_finance
        };
      });
      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('Failed to load permissions');
      setPermissions({});
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    loadPermissions(employee.id);
  };

  const handleRoleChange = async (newRole) => {
    if (!selectedEmployee) return;

    setIsSaving(true);
    try {
      await User.update(selectedEmployee.id, { job_role: newRole });

      // Load default permissions for the new role
      const defaultPermissions = ROLE_PERMISSIONS[newRole] || {};
      setPermissions(defaultPermissions);

      // Update employee in state
      setSelectedEmployee({ ...selectedEmployee, job_role: newRole });
      setUsers(users.map(u => u.id === selectedEmployee.id ? { ...u, job_role: newRole } : u));

      toast.success(`Role updated to ${newRole.replace(/_/g, ' ')}`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  // CRITICAL FIX: Add the missing onPermissionChange handler
  const handlePermissionChange = (moduleId, permissionId, checked) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [permissionId]: checked
      }
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;

    setIsSaving(true);
    try {
      // Delete existing permissions
      const existingPermissions = await UserPermission.filter({ user_id: selectedEmployee.id });
      await Promise.all(existingPermissions.map(p => UserPermission.delete(p.id)));

      // Create new permissions - only for modules with at least one permission enabled
      const permissionPromises = Object.entries(permissions)
        .filter(([module, perms]) => {
          // Only save if at least one permission is enabled
          return perms.can_view || perms.can_create || perms.can_edit || 
                 perms.can_delete || perms.can_approve || perms.can_export || 
                 perms.can_view_sensitive_finance;
        })
        .map(([module, perms]) => {
          return UserPermission.create({
            user_id: selectedEmployee.id,
            module,
            can_view: perms.can_view || false,
            can_create: perms.can_create || false,
            can_edit: perms.can_edit || false,
            can_delete: perms.can_delete || false,
            can_approve: perms.can_approve || false,
            can_export: perms.can_export || false,
            can_view_sensitive_finance: perms.can_view_sensitive_finance || false,
          });
        });

      await Promise.all(permissionPromises);
      
      // Clear user cache to force permission reload
      localStorage.removeItem('cached_user_permissions');
      
      toast.success(`✅ Permissions saved for ${selectedEmployee.full_name}! User must refresh to see changes.`);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyRoleDefaults = () => {
    if (!selectedEmployee?.job_role) {
      toast.error('No role selected');
      return;
    }

    const defaultPermissions = ROLE_PERMISSIONS[selectedEmployee.job_role];
    if (!defaultPermissions) {
      toast.error('No default permissions found for this role');
      return;
    }

    setPermissions(defaultPermissions);
    toast.success(`Applied default permissions for ${selectedEmployee.job_role.replace(/_/g, ' ')}.`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !filters.search ||
      user.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesDepartment = filters.department === 'all' || user.department === filters.department;
    const matchesRole = filters.job_role === 'all' || user.job_role === filters.job_role;

    return matchesSearch && matchesDepartment && matchesRole;
  });

  // Check if current user can manage super admin - FIXED
  const canManageSuperAdmin = currentUser?.job_role === 'super_admin' || currentUser?.job_role === 'admin';
  const canManageAdmin = currentUser?.job_role === 'super_admin' || currentUser?.job_role === 'admin';


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/20">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Premium Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">User Access Manager</h1>
              <p className="text-slate-600 mt-1 text-base">Role-based permissions and security management</p>
            </div>
          </div>
        </div>

        {/* Super Admin Info Card */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Role-Based Access Control</h3>
                <p className="text-sm text-amber-800">
                  Control user access to inventory modules. <strong>Super Admin</strong> has unrestricted access to all inventory and financial features.
                  <strong> Admin</strong> has full inventory management without sensitive financial data access.
                </p>
                <div className="mt-2 p-2 bg-white rounded border border-amber-200">
                  <p className="text-xs text-amber-700 font-medium">
                    💡 Roles: Super Admin (full) → Admin → Inventory Manager → Procurement Officer → Sales/Warehouse Staff → Viewer
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee List */}
          <div className="lg:col-span-1">
            <EmployeeList
              employees={filteredUsers}
              selectedEmployee={selectedEmployee}
              onEmployeeSelect={handleEmployeeSelect}
              filters={filters}
              setFilters={setFilters}
              isLoading={isLoading}
              DepartmentSelectComponent={DepartmentSelect}
              departments={departments}
              getDepartmentDisplayName={getDepartmentDisplayName}
            />
          </div>

          {/* Permission Matrix */}
          <div className="lg:col-span-2">
            {selectedEmployee ? (
              <Card className="premium-card h-full flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-violet-600" />
                      Manage Permissions - {selectedEmployee.full_name}
                    </CardTitle>
                    <Badge variant={selectedEmployee.job_role === 'super_admin' ? 'default' : 'secondary'} className="flex items-center gap-1">
                      {selectedEmployee.job_role === 'super_admin' && <Crown className="w-3 h-3" />}
                      {selectedEmployee.job_role?.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 overflow-auto">
                  {/* Role Selection */}
                  <div className="p-4 bg-slate-500 rounded-lg border">
                    <Label className="text-sm font-semibold mb-2 block">Change Job Role</Label>
                    <Select
                      value={selectedEmployee.job_role}
                      onValueChange={handleRoleChange}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin" disabled={!canManageSuperAdmin}>
                          <span className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-600" />
                            Super Admin (Full Access)
                          </span>
                        </SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                        <SelectItem value="procurement_officer">Procurement Officer</SelectItem>
                        <SelectItem value="sales_staff">Sales Staff</SelectItem>
                        <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                        <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleApplyRoleDefaults}
                      variant="outline"
                      className="mt-3 w-full"
                      size="sm"
                      disabled={isSaving || !selectedEmployee.job_role}
                    >
                      Apply Role Default Permissions
                    </Button>
                  </div>

                  {/* Financial Access Warning */}
                  {selectedEmployee.job_role !== 'super_admin' && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800">
                          <strong>Financial Data Restricted:</strong> This user cannot view aggregate revenue, profit, or sensitive financial metrics.
                          Only Super Admin role has this access.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Permission Matrix - CRITICAL FIX: Pass onPermissionChange */}
                  <PermissionMatrix
                    employee={selectedEmployee}
                    permissions={permissions}
                    onPermissionChange={handlePermissionChange}
                  />

                  {/* Save Button */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      onClick={handleSavePermissions}
                      disabled={isSaving}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Permissions
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="premium-card h-full flex items-center justify-center">
                <CardContent className="text-center p-12">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Employee Selected</h3>
                  <p className="text-sm text-slate-500">
                    Select an employee from the list to manage their permissions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPermission(UserAccessManagerPage, 'user_access_manager', 'can_view');
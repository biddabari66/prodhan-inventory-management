import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Shield, Users, Save, Crown, Lock, AlertTriangle, Loader2
} from 'lucide-react';
import EmployeeList from '../components/access/EmployeeList';
import PermissionMatrix from '../components/access/PermissionMatrix';
import ConfidentialPermissions from '../components/access/ConfidentialPermissions';
import DepartmentSelect from '../components/common/DepartmentSelect';
import { withPermission } from '../components/common/PermissionGuard';

// ============================================================
// ROLE TEMPLATES — defines default permissions for each role
// ============================================================
const ROLE_PERMISSIONS = {
  super_admin: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    discount_campaigns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
    production_house: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_categories: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    marketing_roi: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true },
    inventory_ai_insights: { can_view: true, can_export: true },
    finance: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
    finance_dashboard: { can_view: true, can_create: true, can_edit: true, can_export: true },
    financial_analytics: { can_view: true, can_export: true },
    payroll: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    attendance: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    auto_reports: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    user_access_manager: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    integrations: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    system_alerts: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    audit_trail: { can_view: true, can_export: true },
    _confidential: {
      can_view_purchase_price: true,
      can_view_cost_data: true,
      can_view_profit_data: true,
      can_view_sensitive_finance: true,
      can_view_salary_data: true,
    }
  },
  admin: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    discount_campaigns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_approve: true, can_export: true },
    production_house: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_categories: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    marketing_roi: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true },
    inventory_ai_insights: { can_view: true, can_export: true },
    finance: { can_view: true, can_create: true, can_edit: true, can_approve: true, can_export: true },
    finance_dashboard: { can_view: true, can_create: true, can_edit: true, can_export: true },
    financial_analytics: { can_view: true, can_export: true },
    payroll: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    attendance: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    auto_reports: { can_view: true, can_create: true, can_edit: true },
    user_access_manager: { can_view: true, can_create: true, can_edit: true },
    integrations: { can_view: true, can_create: true, can_edit: true },
    system_alerts: { can_view: true, can_create: true, can_edit: true },
    audit_trail: { can_view: true, can_export: true },
    _confidential: {
      can_view_purchase_price: true,
      can_view_cost_data: true,
      can_view_profit_data: true,
      can_view_sensitive_finance: false,
      can_view_salary_data: true,
    }
  },
  inventory_manager: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    discount_campaigns: { can_view: true, can_create: true, can_edit: true, can_export: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_approve: true, can_export: true },
    production_house: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    inventory_categories: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    marketing_roi: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true },
    inventory_ai_insights: { can_view: true, can_export: true },
    finance_dashboard: { can_view: true, can_export: true },
    financial_analytics: { can_view: true, can_export: true },
    payroll: { can_view: true, can_export: true },
    _confidential: {
      can_view_purchase_price: true,
      can_view_cost_data: true,
      can_view_profit_data: true,
      can_view_sensitive_finance: false,
      can_view_salary_data: false,
    }
  },
  procurement_officer: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true, can_export: true },
    sales: { can_view: true, can_export: true },
    customer_management: { can_view: true, can_export: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_export: true },
    production_house: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true },
    _confidential: {
      can_view_purchase_price: true,
      can_view_cost_data: false,
      can_view_profit_data: false,
      can_view_sensitive_finance: false,
      can_view_salary_data: false,
    }
  },
  sales_staff: {
    inventory_overview: { can_view: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_export: true },
    discount_campaigns: { can_view: true },
    inventory_reports: { can_view: true, can_export: true },
    product_analytics: { can_view: true },
    _confidential: {
      can_view_purchase_price: false,
      can_view_cost_data: false,
      can_view_profit_data: false,
      can_view_sensitive_finance: false,
      can_view_salary_data: false,
    }
  },
  warehouse_staff: {
    inventory_overview: { can_view: true },
    inventory_movements: { can_view: true, can_create: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_export: true },
    purchase_orders: { can_view: true, can_export: true },
    production_house: { can_view: true, can_create: true, can_edit: true },
    _confidential: {
      can_view_purchase_price: false,
      can_view_cost_data: false,
      can_view_profit_data: false,
      can_view_sensitive_finance: false,
      can_view_salary_data: false,
    }
  },
  viewer: {
    inventory_overview: { can_view: true },
    sales: { can_view: true },
    customer_management: { can_view: true },
    inventory_reports: { can_view: true, can_export: true },
    _confidential: {
      can_view_purchase_price: false,
      can_view_cost_data: false,
      can_view_profit_data: false,
      can_view_sensitive_finance: false,
      can_view_salary_data: false,
    }
  }
};

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

const getDepartmentDisplayName = (val) => {
  const dept = departments.find(d => d.value === val);
  return dept ? dept.label : val;
};

function UserAccessManagerPage() {
  const [users, setUsers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [confidentialPerms, setConfidentialPerms] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({ search: '', department: 'all', job_role: 'all' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [usersData, currentUserData] = await Promise.all([User.list(), User.me()]);
    setUsers(usersData);
    setCurrentUser(currentUserData);
    setIsLoading(false);
  };

  const loadPermissions = useCallback(async (userId) => {
    if (!userId) { setPermissions({}); setConfidentialPerms({}); return; }
    const userPermissions = await UserPermission.filter({ user_id: userId });
    const permissionsMap = {};
    const confMap = {};

    userPermissions.forEach(p => {
      permissionsMap[p.module] = {
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_approve: p.can_approve,
        can_export: p.can_export,
      };
      // Merge confidential from every permission record (they apply globally)
      if (p.can_view_purchase_price) confMap.can_view_purchase_price = true;
      if (p.can_view_cost_data) confMap.can_view_cost_data = true;
      if (p.can_view_profit_data) confMap.can_view_profit_data = true;
      if (p.can_view_sensitive_finance) confMap.can_view_sensitive_finance = true;
      if (p.can_view_salary_data) confMap.can_view_salary_data = true;
    });
    setPermissions(permissionsMap);
    setConfidentialPerms(confMap);
  }, []);

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    loadPermissions(employee.id);
  };

  const handleRoleChange = async (newRole) => {
    if (!selectedEmployee) return;
    setIsSaving(true);
    await User.update(selectedEmployee.id, { job_role: newRole });
    const defaults = ROLE_PERMISSIONS[newRole] || {};
    const { _confidential, ...modulePerms } = defaults;
    setPermissions(modulePerms);
    setConfidentialPerms(_confidential || {});
    setSelectedEmployee({ ...selectedEmployee, job_role: newRole });
    setUsers(users.map(u => u.id === selectedEmployee.id ? { ...u, job_role: newRole } : u));
    toast.success(`Role updated to ${newRole.replace(/_/g, ' ')}`);
    setIsSaving(false);
  };

  const handlePermissionChange = (moduleId, permissionId, checked) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: { ...(prev[moduleId] || {}), [permissionId]: checked }
    }));
  };

  const handleConfidentialChange = (permId, checked) => {
    setConfidentialPerms(prev => ({ ...prev, [permId]: checked }));
  };

  const handleApplyRoleDefaults = () => {
    if (!selectedEmployee?.job_role) { toast.error('No role selected'); return; }
    const defaults = ROLE_PERMISSIONS[selectedEmployee.job_role];
    if (!defaults) { toast.error('No defaults for this role'); return; }
    const { _confidential, ...modulePerms } = defaults;
    setPermissions(modulePerms);
    setConfidentialPerms(_confidential || {});
    toast.success(`Applied default permissions for ${selectedEmployee.job_role.replace(/_/g, ' ')}`);
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;
    setIsSaving(true);

    // Delete existing permissions
    const existing = await UserPermission.filter({ user_id: selectedEmployee.id });
    await Promise.all(existing.map(p => UserPermission.delete(p.id)));

    // Create new permissions — attach confidential flags to every module record
    const entries = Object.entries(permissions);
    if (entries.length > 0) {
      await Promise.all(entries.map(([module, perms]) =>
        UserPermission.create({
          user_id: selectedEmployee.id,
          module,
          can_view: perms.can_view || false,
          can_create: perms.can_create || false,
          can_edit: perms.can_edit || false,
          can_delete: perms.can_delete || false,
          can_approve: perms.can_approve || false,
          can_export: perms.can_export || false,
          can_view_purchase_price: confidentialPerms.can_view_purchase_price || false,
          can_view_cost_data: confidentialPerms.can_view_cost_data || false,
          can_view_profit_data: confidentialPerms.can_view_profit_data || false,
          can_view_sensitive_finance: confidentialPerms.can_view_sensitive_finance || false,
          can_view_salary_data: confidentialPerms.can_view_salary_data || false,
        })
      ));
    }
    toast.success('Permissions saved successfully!');
    setIsSaving(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !filters.search ||
      user.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDepartment = filters.department === 'all' || user.department === filters.department;
    const matchesRole = filters.job_role === 'all' || user.job_role === filters.job_role;
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const canManageSuperAdmin = currentUser?.job_role === 'super_admin' || currentUser?.job_role === 'admin';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/10">
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-red-800 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Access Manager</h1>
              <p className="text-slate-500 mt-0.5 text-sm">Role-based permissions, confidential data access & security</p>
            </div>
          </div>
        </div>

        {/* Role Legend */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Role Hierarchy & Templates</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.keys(ROLE_PERMISSIONS).map(role => (
                    <Badge key={role} variant="outline" className="bg-white text-xs">
                      {role === 'super_admin' && <Crown className="w-3 h-3 mr-1 text-amber-600" />}
                      {role.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  Select a role → Apply defaults → Fine-tune individual permissions → Save
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Grid */}
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

          {/* Permission Panel */}
          <div className="lg:col-span-2">
            {selectedEmployee ? (
              <div className="space-y-6">
                {/* Role Card */}
                <Card className="premium-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Lock className="w-5 h-5 text-red-600" />
                        {selectedEmployee.full_name}
                      </CardTitle>
                      <Badge
                        variant={selectedEmployee.job_role === 'super_admin' ? 'default' : 'secondary'}
                        className="flex items-center gap-1"
                      >
                        {selectedEmployee.job_role === 'super_admin' && <Crown className="w-3 h-3" />}
                        {selectedEmployee.job_role?.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border">
                      <Label className="text-sm font-semibold mb-2 block">Change Role</Label>
                      <Select value={selectedEmployee.job_role} onValueChange={handleRoleChange} disabled={isSaving}>
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
                      <Button onClick={handleApplyRoleDefaults} variant="outline" className="mt-3 w-full" size="sm" disabled={isSaving}>
                        Apply Role Default Permissions
                      </Button>
                    </div>

                    {selectedEmployee.job_role !== 'super_admin' && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800">
                            <strong>Note:</strong> Confidential data (purchase price, costs, profit, salary) is controlled separately below. Module access does not automatically grant confidential data visibility.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Confidential Data Permissions */}
                <ConfidentialPermissions
                  employee={selectedEmployee}
                  confidentialPerms={confidentialPerms}
                  onConfidentialChange={handleConfidentialChange}
                />

                {/* Module Permissions Matrix */}
                <PermissionMatrix
                  employee={selectedEmployee}
                  permissions={permissions}
                  onPermissionChange={handlePermissionChange}
                />

                {/* Save */}
                <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg">
                  <Button onClick={handleSavePermissions} disabled={isSaving} className="bg-red-700 hover:bg-red-800 text-white px-8">
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save All Permissions</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="premium-card h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center p-12">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Employee Selected</h3>
                  <p className="text-sm text-slate-500">Select an employee from the list to manage their permissions</p>
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
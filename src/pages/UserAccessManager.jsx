import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Shield, Users, Save, Crown, Lock, AlertTriangle, Loader2, Building2, Network
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
  finance_officer: {
    finance: { can_view: true, can_create: true, can_edit: true, can_approve: true, can_export: true },
    finance_dashboard: { can_view: true, can_export: true },
    financial_analytics: { can_view: true, can_export: true },
    payroll: { can_view: true, can_create: true, can_edit: true, can_export: true },
    sales: { can_view: true, can_export: true },
    purchase_orders: { can_view: true, can_export: true },
    inventory_overview: { can_view: true },
    inventory_reports: { can_view: true, can_export: true },
    attendance: { can_view: true, can_export: true },
    _confidential: {
      can_view_purchase_price: true,
      can_view_cost_data: true,
      can_view_profit_data: true,
      can_view_sensitive_finance: true,
      can_view_salary_data: true,
    }
  },
  hr_manager: {
    attendance: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    payroll: { can_view: true, can_create: true, can_edit: true, can_export: true },
    user_access_manager: { can_view: true, can_edit: true },
    inventory_overview: { can_view: true },
    sales: { can_view: true },
    _confidential: {
      can_view_purchase_price: false,
      can_view_cost_data: false,
      can_view_profit_data: false,
      can_view_sensitive_finance: false,
      can_view_salary_data: true,
    }
  },
  marketing_staff: {
    inventory_overview: { can_view: true },
    sales: { can_view: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true, can_export: true },
    discount_campaigns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true },
    marketing_roi: { can_view: true, can_create: true, can_edit: true, can_export: true },
    product_analytics: { can_view: true, can_export: true },
    inventory_reports: { can_view: true, can_export: true },
    _confidential: {
      can_view_purchase_price: false,
      can_view_cost_data: false,
      can_view_profit_data: false,
      can_view_sensitive_finance: false,
      can_view_salary_data: false,
    }
  },
  operations_staff: {
    inventory_overview: { can_view: true, can_create: true, can_edit: true },
    sales: { can_view: true, can_create: true, can_edit: true, can_export: true },
    customer_management: { can_view: true, can_create: true, can_edit: true },
    purchase_orders: { can_view: true, can_create: true, can_edit: true, can_export: true },
    production_house: { can_view: true, can_create: true, can_edit: true },
    inventory_movements: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_returns: { can_view: true, can_create: true, can_edit: true, can_export: true },
    inventory_reconciliation: { can_view: true, can_create: true, can_edit: true },
    inventory_suppliers: { can_view: true, can_create: true, can_edit: true },
    inventory_categories: { can_view: true, can_edit: true },
    _confidential: {
      can_view_purchase_price: true,
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
    product_analytics: { can_view: true },
    finance_dashboard: { can_view: true },
    _confidential: {
      can_view_purchase_price: false,
      can_view_cost_data: false,
      can_view_profit_data: false,
      can_view_sensitive_finance: false,
      can_view_salary_data: false,
    }
  }
};

// Departments are now fetched dynamically

function UserAccessManagerPage() {
  const [users, setUsers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [confidentialPerms, setConfidentialPerms] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({ search: '', department: 'all', job_role: 'all' });

  // Sub-Company → Department assignment state
  const [companies, setCompanies] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Create-user (with login credentials) — admin only
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ displayName: '', email: '', password: '', jobRole: 'EMPLOYEE', companyId: '', departmentId: '' });
  const [newUserDepts, setNewUserDepts] = useState([]);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const loadNewUserDepts = async (companyId) => {
    if (!companyId) { setNewUserDepts([]); return; }
    try {
      const res = await erp.api.get('/departments', { params: { companyId } });
      setNewUserDepts(res.data?.data ?? res.data ?? []);
    } catch { setNewUserDepts([]); }
  };

  const handleResetPassword = async () => {
    if (resetPasswordValue.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsResettingPassword(true);
    try {
      await erp.api.post(`/users/${selectedEmployee.id}/reset-password`, { newPassword: resetPasswordValue });
      toast.success('Password reset successfully');
      setResetPasswordOpen(false);
      setResetPasswordValue('');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.displayName.trim() || !newUser.email.trim() || newUser.password.length < 6) {
      toast.error('Name, valid email, and a password (min 6 chars) are required'); return;
    }
    setCreating(true);
      try {
        await erp.api.post('/auth/register', {
          displayName: newUser.displayName.trim(),
          email: newUser.email.trim().toLowerCase(),
          password: newUser.password,
          jobRole: newUser.jobRole,
          companyId: newUser.companyId || undefined,
          departmentId: newUser.departmentId || undefined,
        });
        toast.success(`User created - ${newUser.email} can now log in`);
      setAddOpen(false);
      setNewUser({ displayName: '', email: '', password: '', jobRole: 'EMPLOYEE', companyId: '', departmentId: '' });
      setNewUserDepts([]);
      const fresh = await User.list();
      setUsers(Array.isArray(fresh) ? fresh : []);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not create user (email may already exist)');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Load sub-companies once
  useEffect(() => {
    (async () => {
      try {
        const res = await erp.api.get('/companies');
        const data = res.data?.data ?? res.data ?? [];
        setCompanies(Array.isArray(data) ? data : []);
      } catch {
        setCompanies([]);
      }
    })();
  }, []);

  // Load departments for a given sub-company
  const loadDepartments = useCallback(async (companyId) => {
    if (!companyId) { setDeptOptions([]); return; }
    setIsLoadingDepts(true);
    try {
      const res = await erp.api.get('/departments', { params: { companyId } });
      const data = res.data?.data ?? res.data ?? [];
      setDeptOptions(Array.isArray(data) ? data : []);
    } catch {
      setDeptOptions([]);
    } finally {
      setIsLoadingDepts(false);
    }
  }, []);

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
    // Reset & seed the company/department assignment for this user
    const deptId = employee.department_id || employee.departmentId || '';
    setSelectedDeptId(deptId ? String(deptId) : '');
    setSelectedCompanyId('');
    setDeptOptions([]);
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompanyId(companyId);
    setSelectedDeptId('');
    loadDepartments(companyId);
  };

  const handleAssignDepartment = async () => {
    if (!selectedEmployee || !selectedCompanyId || !selectedDeptId) {
      toast.error('Select a sub-company and department first');
      return;
    }
    setIsAssigning(true);
    try {
      await User.update(selectedEmployee.id, { company_id: selectedCompanyId, department_id: selectedDeptId });
      setSelectedEmployee({ ...selectedEmployee, company_id: selectedCompanyId, companyId: selectedCompanyId, department_id: selectedDeptId, departmentId: selectedDeptId });
      setUsers(users.map(u =>
        u.id === selectedEmployee.id
          ? { ...u, company_id: selectedCompanyId, companyId: selectedCompanyId, department_id: selectedDeptId, departmentId: selectedDeptId }
          : u
      ));
      toast.success('Sub-company & department assigned');
    } catch {
      toast.error('Failed to assign department');
    } finally {
      setIsAssigning(false);
    }
  };

  const companyName = (c) => c?.name || c?.display_name || c?.title || `Company #${c?.id}`;
  const deptName = (d) => d?.name || d?.display_name || d?.title || `Dept #${d?.id}`;
  const currentDeptId = selectedEmployee?.department_id || selectedEmployee?.departmentId || '';
  const currentDeptLabel = (() => {
    const match = deptOptions.find(d => String(d.id) === String(currentDeptId));
    return match ? deptName(match) : (currentDeptId ? `Department #${currentDeptId}` : 'Unassigned');
  })();

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

  const handlePermissionChange = React.useCallback((moduleId, permissionId, checked) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: { ...(prev[moduleId] || {}), [permissionId]: checked }
    }));
  }, []);

  const handleConfidentialChange = React.useCallback((permId, checked) => {
    setConfidentialPerms(prev => ({ ...prev, [permId]: checked }));
  }, []);

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
    // Refresh the PermissionGuard's cache so changes take effect immediately
    localStorage.removeItem('cached_user_permissions');
    toast.success('Permissions saved successfully!');
    setIsSaving(false);
  };

  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !filters.search ||
        user.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email?.toLowerCase().includes(filters.search.toLowerCase());
      
      const userDeptId = user.department_id || user.departmentId || user.department;
      const matchesDepartment = filters.department === 'all' || userDeptId === filters.department;
      
      const userRole = String(user.job_role || user.jobRole || '').toLowerCase();
      const filterRole = String(filters.job_role || '').toLowerCase();
      const matchesRole = filterRole === 'all' || userRole === filterRole;
      
      return matchesSearch && matchesDepartment && matchesRole;
    });
  }, [users, filters]);

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
              <p className="text-slate-500 mt-0.5 text-sm">Create users, assign sub-company & department, set permissions</p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-slate-800 to-red-800 text-white shadow hover:shadow-md">
            <UserPlus className="w-4 h-4 mr-2" /> Create User
          </Button>
        </div>

        {/* Create User dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-red-700" /> Create New User</DialogTitle></DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5"><Label>Full Name</Label><Input value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} placeholder="e.g. Karim Ahmed" /></div>
              <div className="space-y-1.5"><Label>Email (login)</Label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@company.com" /></div>
              <div className="space-y-1.5"><Label>Password</Label><Input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="min 6 characters" /></div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newUser.jobRole} onValueChange={(v) => setNewUser({ ...newUser, jobRole: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['ADMIN','MANAGER','DEPARTMENT_HEAD','SALES_MANAGER','SALES_EXECUTIVE','INVENTORY_MANAGER','HR_MANAGER','ACCOUNTANT','EMPLOYEE'].map(r => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g,' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Sub-Company</Label>
                  <Select value={newUser.companyId} onValueChange={(v) => { setNewUser({ ...newUser, companyId: v, departmentId: '' }); loadNewUserDepts(v); }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={newUser.departmentId} onValueChange={(v) => setNewUser({ ...newUser, departmentId: v })} disabled={!newUser.companyId}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{newUserDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={creating} className="bg-red-700 hover:bg-red-800 text-white">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />} Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="text" value={resetPasswordValue} onChange={e => setResetPasswordValue(e.target.value)} placeholder="Minimum 8 characters" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
              <Button onClick={handleResetPassword} disabled={isResettingPassword} className="bg-red-700 hover:bg-red-800 text-white">
                {isResettingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                      <div className="flex gap-2 items-center">
                        <Button variant="outline" size="sm" onClick={() => setResetPasswordOpen(true)} className="text-xs h-7">
                           Reset Password
                        </Button>
                        <Badge
                          variant={selectedEmployee.job_role === 'super_admin' ? 'default' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {selectedEmployee.job_role === 'super_admin' && <Crown className="w-3 h-3" />}
                          {selectedEmployee.job_role?.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </div>
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
                          <SelectItem value="finance_officer">Finance Officer</SelectItem>
                          <SelectItem value="hr_manager">HR Manager</SelectItem>
                          <SelectItem value="sales_staff">Sales Staff</SelectItem>
                          <SelectItem value="marketing_staff">Marketing Staff</SelectItem>
                          <SelectItem value="operations_staff">Operations Staff</SelectItem>
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

                {/* Sub-Company → Department Assignment */}
                <Card className="premium-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="w-5 h-5 text-red-600" />
                      Sub-Company &amp; Department
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Current assignment */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg border">
                      <span className="text-sm text-slate-500">Current department:</span>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Network className="w-3 h-3" />
                        {currentDeptLabel}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sub-Company select */}
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Sub-Company</Label>
                        <Select value={selectedCompanyId} onValueChange={handleCompanyChange} disabled={isAssigning}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select sub-company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.length === 0 ? (
                              <SelectItem value="__none" disabled>No sub-companies found</SelectItem>
                            ) : (
                              companies.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>{companyName(c)}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Department select (cascading) */}
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Department</Label>
                        {isLoadingDepts ? (
                          <Skeleton className="h-10 w-full rounded-md" />
                        ) : (
                          <Select
                            value={selectedDeptId}
                            onValueChange={setSelectedDeptId}
                            disabled={isAssigning || !selectedCompanyId}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={selectedCompanyId ? 'Select department' : 'Select sub-company first'} />
                            </SelectTrigger>
                            <SelectContent>
                              {deptOptions.length === 0 ? (
                                <SelectItem value="__none" disabled>No departments</SelectItem>
                              ) : (
                                deptOptions.map(d => (
                                  <SelectItem key={d.id} value={String(d.id)}>{deptName(d)}</SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleAssignDepartment}
                        disabled={isAssigning || !selectedDeptId}
                        variant="outline"
                        size="sm"
                      >
                        {isAssigning ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning...</>
                        ) : (
                          <><Save className="w-4 h-4 mr-2" /> Assign Department</>
                        )}
                      </Button>
                    </div>
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
              <Card className="premium-card h-full flex flex-col items-center justify-center min-h-[500px] border-dashed border-2 bg-gradient-to-br from-slate-50/50 to-white">
                <CardContent className="text-center p-12 max-w-md">
                  <div className="relative mx-auto mb-6 w-24 h-24">
                    <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-25"></div>
                    <div className="relative flex items-center justify-center w-full h-full bg-amber-50 rounded-full shadow-inner border border-amber-100">
                      <Shield className="w-10 h-10 text-amber-500 drop-shadow-sm" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight mb-3">
                    Access Control Center
                  </h3>
                  <p className="text-base text-slate-500 mb-8 leading-relaxed">
                    Select an employee from the directory to manage their module permissions, data access, and departmental scope.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="p-4 rounded-xl bg-white shadow-sm border border-slate-100 flex items-start gap-3">
                      <Lock className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700">Role Templates</h4>
                        <p className="text-xs text-slate-500 mt-1">Apply quick presets</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white shadow-sm border border-slate-100 flex items-start gap-3">
                      <Network className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700">Scope Sync</h4>
                        <p className="text-xs text-slate-500 mt-1">Assign sub-companies</p>
                      </div>
                    </div>
                  </div>
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
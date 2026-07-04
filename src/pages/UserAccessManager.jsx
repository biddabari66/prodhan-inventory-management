import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// Main Access Manager Page
function UserAccessManagerPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  // Data Queries
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['access-users'],
    queryFn: async () => {
      const fresh = await User.list();
      return Array.isArray(fresh) ? fresh : [];
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['access-companies'],
    queryFn: async () => {
      const res = await erp.api.get('/companies');
      return Array.isArray(res.data) ? res.data : res.data?.data || res.data?.companies || [];
    },
    staleTime: 5 * 60 * 1000
  });

  // State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [confidentialPerms, setConfidentialPerms] = useState({});
  const [filters, setFilters] = useState({ search: '', department: 'all', job_role: 'all' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ displayName: '', email: '', password: '', jobRole: 'EMPLOYEE', companyId: '', departmentId: '' });
  
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Derived state
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const mSearch = !filters.search || (u.full_name || u.displayName || u.email || '').toLowerCase().includes(filters.search.toLowerCase());
      const mDept = filters.department === 'all' || u.department_id === filters.department;
      const mRole = filters.job_role === 'all' || u.job_role === filters.job_role;
      return mSearch && mDept && mRole;
    });
  }, [users, filters]);

  // Methods
  const loadUserPermissions = async (userId) => {
    try {
      const userPermissions = await UserPermission.filter({ user_id: userId });
      const pMap = {};
      userPermissions.forEach(p => {
        pMap[p.module] = {
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_approve: p.can_approve,
          can_export: p.can_export
        };
      });
      setPermissions(pMap);
      
      const conf = userPermissions.find(p => p.module === '_confidential');
      setConfidentialPerms(conf ? {
        can_view_purchase_price: conf.can_view_purchase_price,
        can_view_cost_data: conf.can_view_cost_data,
        can_view_profit_data: conf.can_view_profit_data,
        can_view_sensitive_finance: conf.can_view_sensitive_finance,
        can_view_salary_data: conf.can_view_salary_data
      } : {});
    } catch(e) {
      console.error(e);
      toast.error('Failed to load user permissions');
    }
  };

  useEffect(() => {
    if (selectedEmployee) loadUserPermissions(selectedEmployee.id);
  }, [selectedEmployee]);

  const handleApplyRoleTemplate = () => {
    if (!selectedEmployee) return;
    const roleKey = selectedEmployee.job_role?.toLowerCase() || selectedEmployee.role?.toLowerCase();
    const template = ROLE_PERMISSIONS[roleKey];
    if (template) {
      const newPerms = { ...template };
      const conf = newPerms._confidential;
      delete newPerms._confidential;
      setPermissions(newPerms);
      if (conf) setConfidentialPerms(conf);
      toast.success('Role template applied. Click Save to confirm.');
    } else {
      toast.error('No template found for this role');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;
    setIsSaving(true);
    try {
      const existing = await UserPermission.filter({ user_id: selectedEmployee.id });
      await Promise.all(existing.map(p => UserPermission.delete(p.id)));

      const createPromises = Object.entries(permissions).map(([module, perms]) => 
        UserPermission.create({
          user_id: selectedEmployee.id,
          module,
          ...perms
        })
      );
      
      if (Object.keys(confidentialPerms).length > 0) {
        createPromises.push(UserPermission.create({
          user_id: selectedEmployee.id,
          module: '_confidential',
          can_view: true,
          ...confidentialPerms
        }));
      }

      await Promise.all(createPromises);
      toast.success('Permissions saved successfully');
    } catch(e) {
      console.error(e);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
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
      toast.success('User created - ' + newUser.email + ' can now log in');
      setAddOpen(false);
      setNewUser({ displayName: '', email: '', password: '', jobRole: 'EMPLOYEE', companyId: '', departmentId: '' });
      refetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    setIsResettingPassword(true);
    try {
      await erp.api.post('/auth/admin/reset-password', {
        userId: selectedEmployee.id,
        newPassword: resetPasswordValue
      });
      toast.success('Password updated successfully');
      setResetPasswordOpen(false);
      setResetPasswordValue('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Render Premium UI
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        <PageHeader 
          icon={Shield} 
          title="User & Role Management" 
          subtitle="Manage system access, permissions, and security policies"
          actions={
            <Button onClick={() => setAddOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white shadow-md rounded-xl">
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          
          {/* LEFT: User List */}
          <Card className="border border-slate-200/60 shadow-sm bg-white/60 backdrop-blur-xl flex flex-col h-[calc(100vh-140px)] min-h-[600px] overflow-hidden rounded-2xl">
            <div className="p-4 border-b border-slate-100 space-y-3 bg-white/40">
              <div className="relative">
                <Input 
                  placeholder="Search users..." 
                  value={filters.search} 
                  onChange={(e) => setFilters({...filters, search: e.target.value})} 
                  className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all pl-9"
                />
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filters.job_role} onValueChange={(v) => setFilters({...filters, job_role: v})}>
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {usersLoading ? (
                <div className="p-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No users found</div>
              ) : (
                filteredUsers.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => setSelectedEmployee(u)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 group ${
                      selectedEmployee?.id === u.id 
                        ? 'bg-amber-50 border border-amber-200 shadow-sm ring-1 ring-amber-500/20' 
                        : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      selectedEmployee?.id === u.id ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}>
                      {(u.full_name || u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${selectedEmployee?.id === u.id ? 'text-amber-900' : 'text-slate-700'}`}>
                        {u.full_name || u.displayName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                    {u.job_role === 'ADMIN' && (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-1.5 py-0 rounded flex-shrink-0 text-[10px]">Admin</Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* RIGHT: Selected User Details */}
          <div className="h-[calc(100vh-140px)] min-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {!selectedEmployee ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center space-y-4 bg-white/40 p-10 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm max-w-md">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Shield className="w-10 h-10 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Select a User</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Choose a user from the list to manage their roles, permissions, and security settings.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* User Profile Header Card */}
                <Card className="border border-slate-200/60 shadow-sm bg-white/60 backdrop-blur-xl overflow-hidden rounded-2xl">
                  <div className="h-24 bg-gradient-to-r from-slate-100 to-amber-50"></div>
                  <div className="px-6 pb-6 relative">
                    <div className="w-20 h-20 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center font-bold text-3xl text-amber-600 absolute -top-10">
                      {(selectedEmployee.full_name || selectedEmployee.displayName || selectedEmployee.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="mt-12 flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                          {selectedEmployee.full_name || selectedEmployee.displayName}
                          {(selectedEmployee.job_role === 'ADMIN' || selectedEmployee.role === 'admin') && 
                            <Crown className="w-5 h-5 text-amber-500" />
                          }
                        </h2>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                          {selectedEmployee.email}
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="uppercase tracking-wider text-xs font-semibold text-slate-400">{selectedEmployee.job_role || selectedEmployee.role}</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setResetPasswordOpen(true)}
                          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Reset Password
                        </Button>
                        <Button 
                          onClick={handleApplyRoleTemplate}
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none"
                        >
                          Auto-Fill by Role
                        </Button>
                        <Button 
                          onClick={handleSavePermissions} 
                          disabled={isSaving}
                          className="bg-amber-600 hover:bg-amber-700 text-white shadow-md"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Permission Matrix */}
                <PermissionMatrix 
                  permissions={permissions} 
                  onChange={setPermissions} 
                />
                
                {/* Confidential Permissions */}
                <ConfidentialPermissions 
                  permissions={confidentialPerms} 
                  onChange={setConfidentialPerms} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
            <div className="bg-amber-500 p-6 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold">Reset Password</DialogTitle>
              <p className="text-amber-100 mt-1 opacity-90">For {selectedEmployee?.email}</p>
            </div>
            <div className="p-6 space-y-4 bg-white">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input 
                  type="password" 
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="h-11 border-slate-200 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
                <Button onClick={handleResetPassword} disabled={isResettingPassword} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {isResettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
            <div className="bg-slate-900 p-6 text-white">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold">Create New Account</DialogTitle>
              <p className="text-slate-400 mt-1">Provision a new user for your workspace</p>
            </div>
            <div className="p-6 space-y-4 bg-white">
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Full Name</Label>
                <Input 
                  value={newUser.displayName} 
                  onChange={(e) => setNewUser({...newUser, displayName: e.target.value})} 
                  placeholder="e.g. John Doe"
                  className="h-11 bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Email Address</Label>
                <Input 
                  type="email" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})} 
                  placeholder="john@example.com"
                  className="h-11 bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Initial Password</Label>
                <Input 
                  type="password" 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})} 
                  placeholder="Min 6 characters"
                  className="h-11 bg-slate-50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Role</Label>
                  <Select value={newUser.jobRole} onValueChange={(v) => setNewUser({...newUser, jobRole: v})}>
                    <SelectTrigger className="h-11 bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Sub-Company</Label>
                  <Select value={newUser.companyId} onValueChange={(v) => setNewUser({...newUser, companyId: v})}>
                    <SelectTrigger className="h-11 bg-slate-50">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                <Button variant="outline" onClick={() => setAddOpen(false)} className="h-11 px-6 rounded-xl">Cancel</Button>
                <Button onClick={handleCreateUser} disabled={creating} className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
                  {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Create Account'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

export default withPermission(UserAccessManagerPage, 'user_access_manager', 'can_view');

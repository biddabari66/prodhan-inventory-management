import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Warehouse, ShoppingCart, Users, Package, Briefcase, RotateCcw, PackageX,
  Shield, Building2, Layers, BarChart3, FileText, Sparkles, Calculator,
  TrendingUp, Clock, Bell, Link2, DollarSign
} from 'lucide-react';

const MODULES = [
  // Inventory
  { id: 'inventory_overview', name: 'Inventory Overview', icon: Warehouse, category: 'Inventory & Products' },
  { id: 'sales', name: 'Sales Orders', icon: ShoppingCart, category: 'Inventory & Products' },
  { id: 'customer_management', name: 'Customer Management', icon: Users, category: 'Inventory & Products' },
  { id: 'discount_campaigns', name: 'Discount Campaigns', icon: Sparkles, category: 'Inventory & Products' },
  { id: 'purchase_orders', name: 'Purchase Orders', icon: Package, category: 'Procurement & Warehouse' },
  { id: 'production_house', name: 'Production House', icon: Briefcase, category: 'Procurement & Warehouse' },
  { id: 'inventory_movements', name: 'Stock Movements', icon: RotateCcw, category: 'Procurement & Warehouse' },
  { id: 'inventory_returns', name: 'Returns & Damages', icon: PackageX, category: 'Procurement & Warehouse' },
  { id: 'inventory_reconciliation', name: 'Reconciliation', icon: Shield, category: 'Procurement & Warehouse' },
  { id: 'inventory_suppliers', name: 'Suppliers', icon: Building2, category: 'Procurement & Warehouse' },
  { id: 'inventory_categories', name: 'Categories', icon: Layers, category: 'Procurement & Warehouse' },
  // Analytics
  { id: 'product_analytics', name: 'Product Analytics', icon: BarChart3, category: 'Analytics & Reports' },
  { id: 'marketing_roi', name: 'Marketing ROI', icon: TrendingUp, category: 'Analytics & Reports' },
  { id: 'inventory_reports', name: 'Inventory Reports', icon: FileText, category: 'Analytics & Reports' },
  { id: 'inventory_ai_insights', name: 'AI Insights', icon: Sparkles, category: 'Analytics & Reports' },
  // Finance
  { id: 'finance', name: 'Finance Management', icon: Calculator, category: 'Finance & Payroll' },
  { id: 'finance_dashboard', name: 'Finance Dashboard', icon: TrendingUp, category: 'Finance & Payroll' },
  { id: 'financial_analytics', name: 'Financial Reports', icon: DollarSign, category: 'Finance & Payroll' },
  { id: 'payroll', name: 'Payroll', icon: Calculator, category: 'Finance & Payroll' },
  { id: 'wholesale', name: 'Wholesale / Distribution', icon: Building2, category: 'Inventory & Products' },
  { id: 'crm', name: 'CRM & Leads', icon: Users, category: 'Inventory & Products' },
  // Analytics & Reports
  { id: 'reports', name: 'Reports Hub', icon: FileText, category: 'Analytics & Reports' },
  { id: 'ai_copilot', name: 'AI Copilot', icon: Sparkles, category: 'Analytics & Reports' },
  // Finance
  { id: 'accounting', name: 'Accounting', icon: Calculator, category: 'Finance & Payroll' },
  { id: 'expenses', name: 'Expenses', icon: DollarSign, category: 'Finance & Payroll' },
  // HR
  { id: 'attendance', name: 'Employee Attendance', icon: Clock, category: 'Human Resources' },
  { id: 'tasks', name: 'Tasks', icon: FileText, category: 'Human Resources' },
  { id: 'kpi', name: 'KPI Tracking', icon: BarChart3, category: 'Human Resources' },
  { id: 'production_projects', name: 'Production Projects', icon: Briefcase, category: 'Human Resources' },
  // System
  { id: 'auto_reports', name: 'Auto Report Settings', icon: Bell, category: 'System & Security' },
  { id: 'user_access_manager', name: 'User Access Manager', icon: Shield, category: 'System & Security' },
  { id: 'integrations', name: 'Integrations', icon: Link2, category: 'System & Security' },
  { id: 'automation', name: 'Automation Hub', icon: Link2, category: 'System & Security' },
  { id: 'webhooks', name: 'Webhooks', icon: Link2, category: 'System & Security' },
  { id: 'company_profiles', name: 'Company Profiles', icon: Building2, category: 'System & Security' },
  { id: 'hardware_config', name: 'Hardware Config', icon: Shield, category: 'System & Security' },
  { id: 'system_alerts', name: 'System Alerts', icon: Bell, category: 'System & Security' },
  { id: 'audit_trail', name: 'Audit Trail', icon: FileText, category: 'System & Security' },
];

const PERMISSIONS = [
  { id: 'can_view', name: 'View' },
  { id: 'can_create', name: 'Create' },
  { id: 'can_edit', name: 'Edit' },
  { id: 'can_delete', name: 'Delete' },
  { id: 'can_approve', name: 'Approve' },
  { id: 'can_export', name: 'Export' },
];

const CATEGORY_COLORS = {
  'Inventory & Products': 'border-l-blue-600',
  'Procurement & Warehouse': 'border-l-amber-600',
  'Analytics & Reports': 'border-l-emerald-600',
  'Finance & Payroll': 'border-l-red-600',
  'Human Resources': 'border-l-purple-600',
  'System & Security': 'border-l-slate-700',
};

export default function PermissionMatrix({ employee, permissions, onPermissionChange }) {
  const safePermissions = permissions || {};

  const modulesByCategory = MODULES.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {});

  const isPermissionDisabled = (moduleId, permissionId) => {
    if (employee?.job_role === 'super_admin') return true;
    const modulePerms = safePermissions[moduleId] || {};
    if (permissionId !== 'can_view' && !modulePerms.can_view && employee?.job_role !== 'admin') return true;
    return false;
  };

  const toggleAllModule = (moduleId, enable) => {
    PERMISSIONS.forEach(p => {
      onPermissionChange(moduleId, p.id, enable);
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(modulesByCategory).map(([category, modules]) => (
        <Card key={category} className={`border-l-4 ${CATEGORY_COLORS[category] || 'border-l-slate-400'}`}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span>{category}</span>
              <Badge variant="outline" className="text-xs">{modules.length} modules</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              {modules.map(module => {
                const modulePerms = safePermissions[module.id] || {};
                const ModuleIcon = module.icon;
                const allEnabled = PERMISSIONS.every(p => modulePerms[p.id]);
                const someEnabled = PERMISSIONS.some(p => modulePerms[p.id]);

                return (
                  <div key={module.id} className="border rounded-lg p-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ModuleIcon className="w-4 h-4 text-slate-600" />
                        <h4 className="font-medium text-sm">{module.name}</h4>
                      </div>
                      {employee?.job_role !== 'super_admin' && (
                        <button
                          onClick={() => toggleAllModule(module.id, !allEnabled)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                            allEnabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : someEnabled
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {allEnabled ? 'Full Access' : someEnabled ? 'Partial' : 'No Access'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {PERMISSIONS.map(permission => (
                        <div key={permission.id} className="flex items-center space-x-1.5">
                          <Switch
                            id={`${module.id}-${permission.id}`}
                            checked={modulePerms[permission.id] || false}
                            onCheckedChange={(checked) => onPermissionChange(module.id, permission.id, checked)}
                            disabled={isPermissionDisabled(module.id, permission.id)}
                            className="scale-90"
                          />
                          <label
                            htmlFor={`${module.id}-${permission.id}`}
                            className="text-xs font-medium cursor-pointer select-none"
                          >
                            {permission.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { MODULES, PERMISSIONS };
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Target, UserCheck, Users, Warehouse, Package, BookOpen, BarChart3,
  Phone, MessageSquare, TrendingUp, TrendingDown, Award, Calculator, Clock, Briefcase, FileSignature,
  Calendar, UserIcon, FileText, Plus, Shield, Link2, Bell, Mail, ShoppingCart, RotateCcw, PackageX,
  Building2, Sparkles, Layers
} from 'lucide-react';

const MODULES = [
  { id: 'inventory_overview', name: 'Inventory Overview', icon: Warehouse, category: 'Inventory' },
  { id: 'sales', name: 'Sales Orders', icon: ShoppingCart, category: 'Inventory' },
  { id: 'customer_management', name: 'Customer Management', icon: Users, category: 'Inventory' },
  { id: 'purchase_orders', name: 'Purchase Orders', icon: Package, category: 'Inventory' },
  { id: 'inventory_movements', name: 'Stock Movements', icon: RotateCcw, category: 'Inventory' },
  { id: 'inventory_returns', name: 'Returns & Damages', icon: PackageX, category: 'Inventory' },
  { id: 'inventory_reconciliation', name: 'Reconciliation', icon: Shield, category: 'Inventory' },
  { id: 'inventory_suppliers', name: 'Suppliers', icon: Building2, category: 'Inventory' },
  { id: 'inventory_categories', name: 'Categories', icon: Layers, category: 'Inventory' },
  { id: 'product_analytics', name: 'Product Analytics', icon: BarChart3, category: 'Inventory' },
  { id: 'inventory_reports', name: 'Inventory Reports', icon: FileText, category: 'Inventory' },
  { id: 'inventory_ai_insights', name: 'AI Insights', icon: Sparkles, category: 'Inventory' },
  { id: 'financial_analytics', name: 'Financial Reports', icon: TrendingUp, category: 'Inventory' },
  { id: 'user_access_manager', name: 'User Access Manager', icon: Shield, category: 'System' },
  { id: 'integrations', name: 'Integrations', icon: Link2, category: 'System' },
  { id: 'system_alerts', name: 'System Alerts', icon: Bell, category: 'System' },
  { id: 'audit_trail', name: 'Audit Trail', icon: FileText, category: 'System' }
];

const PERMISSIONS = [
  { id: 'can_view', name: 'View', description: 'View data and access pages' },
  { id: 'can_create', name: 'Create', description: 'Create new records' },
  { id: 'can_edit', name: 'Edit', description: 'Edit existing records' },
  { id: 'can_delete', name: 'Delete', description: 'Delete records' },
  { id: 'can_approve', name: 'Approve', description: 'Approve requests and transactions' },
  { id: 'can_export', name: 'Export', description: 'Export data to files' }
];

export default function PermissionMatrix({ employee, permissions, onPermissionChange, moduleGroups, roleDefinitions }) {
  // Ensure permissions is always an object
  const safePermissions = permissions || {};
  
  const modulesByCategory = MODULES.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {});

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      department_head: 'bg-purple-100 text-purple-800',
      employee: 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const isPermissionDisabled = (moduleId, permissionId) => {
    // Super Admin has all permissions and cannot be restricted
    if (employee?.job_role === 'super_admin') return true;
    
    // Get module permissions safely
    const modulePerms = safePermissions[moduleId] || {};
    
    // View permission is required for all others (except for admin who can have all)
    if (permissionId !== 'can_view' && !modulePerms.can_view && employee?.job_role !== 'admin') return true;
    
    return false;
  };

  return (
    <div className="h-full overflow-auto space-y-6">
      {Object.entries(modulesByCategory).map(([category, modules]) => (
        <Card key={category} className="border-l-4 border-l-violet-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{category}</span>
              <Badge variant="outline">{modules.length} modules</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modules.map(module => {
                const modulePerms = safePermissions[module.id] || {};
                const ModuleIcon = module.icon;
                
                return (
                  <div key={module.id} className="border rounded-lg p-4 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      {ModuleIcon && <ModuleIcon className="w-5 h-5 text-violet-600" />}
                      <h4 className="font-medium">{module.name}</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {PERMISSIONS.map(permission => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Switch
                            id={`${module.id}-${permission.id}`}
                            checked={modulePerms[permission.id] || false}
                            onCheckedChange={(checked) => onPermissionChange(module.id, permission.id, checked)}
                            disabled={isPermissionDisabled(module.id, permission.id)}
                          />
                          <label 
                            htmlFor={`${module.id}-${permission.id}`}
                            className="text-sm font-medium cursor-pointer"
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
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Permission Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Admin:</strong> Has all permissions automatically - cannot be restricted</li>
          <li>• <strong>Manager:</strong> Can approve transactions and view all data</li>
          <li>• <strong>Employee:</strong> Basic permissions for daily operations</li>
          <li>• <strong>View permission</strong> is required before granting other permissions</li>
          <li>• <strong>Changes take effect immediately</strong> across the entire system</li>
        </ul>
      </div>
    </div>
  );
}
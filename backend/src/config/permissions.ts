import { JobRole } from '@prisma/client';

// Map of action strings to allowed JobRoles
export type Permission =
  // Orders
  | 'orders:read' | 'orders:create' | 'orders:update' | 'orders:delete'
  | 'orders:export' | 'orders:import'
  // Inventory
  | 'inventory:read' | 'inventory:create' | 'inventory:update' | 'inventory:delete'
  | 'inventory:adjust_stock'
  // CRM
  | 'crm:read' | 'crm:create' | 'crm:update' | 'crm:delete'
  | 'crm:assign' | 'crm:convert'
  // Customers
  | 'customers:read' | 'customers:create' | 'customers:update'
  // HR
  | 'employees:read' | 'employees:create' | 'employees:update' | 'employees:delete'
  | 'attendance:read' | 'attendance:create' | 'attendance:update' | 'attendance:admin_mark'
  | 'payroll:read' | 'payroll:create' | 'payroll:approve' | 'payroll:mark_paid'
  | 'performance:read' | 'performance:create'
  // Finance
  | 'expenses:read' | 'expenses:create' | 'expenses:update' | 'expenses:approve' | 'expenses:reject'
  | 'income:read' | 'income:create'
  | 'finance:read'
  // Integrations
  | 'integrations:read' | 'integrations:update'
  // Reports
  | 'reports:read' | 'reports:create' | 'reports:schedule'
  // System
  | 'audit:read' | 'notifications:manage' | 'settings:manage'
  | 'campaigns:manage' | 'suppliers:manage' | 'categories:manage'
  | 'purchase_orders:read' | 'purchase_orders:create' | 'purchase_orders:update';

const ALL: Permission[] = [
  'orders:read', 'orders:create', 'orders:update', 'orders:delete', 'orders:export', 'orders:import',
  'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete', 'inventory:adjust_stock',
  'crm:read', 'crm:create', 'crm:update', 'crm:delete', 'crm:assign', 'crm:convert',
  'customers:read', 'customers:create', 'customers:update',
  'employees:read', 'employees:create', 'employees:update', 'employees:delete',
  'attendance:read', 'attendance:create', 'attendance:update', 'attendance:admin_mark',
  'payroll:read', 'payroll:create', 'payroll:approve', 'payroll:mark_paid',
  'performance:read', 'performance:create',
  'expenses:read', 'expenses:create', 'expenses:update', 'expenses:approve', 'expenses:reject',
  'income:read', 'income:create',
  'finance:read',
  'integrations:read', 'integrations:update',
  'reports:read', 'reports:create', 'reports:schedule',
  'audit:read', 'notifications:manage', 'settings:manage',
  'campaigns:manage', 'suppliers:manage', 'categories:manage',
  'purchase_orders:read', 'purchase_orders:create', 'purchase_orders:update',
];

export const PERMISSION_MATRIX: Record<JobRole, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL,

  FINANCE_HEAD: [
    'orders:read', 'orders:export',
    'expenses:read', 'expenses:create', 'expenses:update', 'expenses:approve', 'expenses:reject',
    'income:read', 'income:create',
    'finance:read',
    'payroll:read', 'payroll:create', 'payroll:approve', 'payroll:mark_paid',
    'reports:read', 'reports:create', 'reports:schedule',
    'employees:read',
  ],

  ACCOUNTANT: [
    'orders:read', 'orders:export',
    'expenses:read', 'expenses:create',
    'income:read', 'income:create',
    'finance:read',
    'payroll:read',
    'reports:read', 'reports:create',
    'employees:read',
  ],

  HR_MANAGER: [
    'employees:read', 'employees:create', 'employees:update',
    'attendance:read', 'attendance:create', 'attendance:update', 'attendance:admin_mark',
    'payroll:read', 'payroll:create', 'payroll:approve', 'payroll:mark_paid',
    'performance:read', 'performance:create',
    'reports:read', 'reports:create',
  ],

  HR_EXECUTIVE: [
    'employees:read',
    'attendance:read', 'attendance:create', 'attendance:admin_mark',
    'payroll:read',
    'performance:read', 'performance:create',
  ],

  SALES_MANAGER: [
    'orders:read', 'orders:create', 'orders:update', 'orders:delete', 'orders:export', 'orders:import',
    'crm:read', 'crm:create', 'crm:update', 'crm:delete', 'crm:assign', 'crm:convert',
    'customers:read', 'customers:create', 'customers:update',
    'inventory:read',
    'campaigns:manage',
    'reports:read', 'reports:create',
  ],

  SALES_EXECUTIVE: [
    'orders:read', 'orders:create', 'orders:update', 'orders:export',
    'crm:read', 'crm:create', 'crm:update', 'crm:convert',
    'customers:read', 'customers:create',
    'inventory:read',
  ],

  MARKETING_MANAGER: [
    'crm:read', 'crm:create', 'crm:update', 'crm:assign',
    'customers:read',
    'campaigns:manage',
    'orders:read', 'orders:export',
    'reports:read', 'reports:create',
    'integrations:read',
  ],

  MARKETING_EXECUTIVE: [
    'crm:read', 'crm:create', 'crm:update',
    'customers:read',
    'orders:read',
  ],

  INVENTORY_MANAGER: [
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete', 'inventory:adjust_stock',
    'suppliers:manage',
    'categories:manage',
    'purchase_orders:read', 'purchase_orders:create', 'purchase_orders:update',
    'orders:read',
    'reports:read', 'reports:create',
  ],

  PROCUREMENT_OFFICER: [
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:adjust_stock',
    'suppliers:manage',
    'purchase_orders:read', 'purchase_orders:create', 'purchase_orders:update',
    'expenses:read', 'expenses:create',
  ],

  DEPARTMENT_HEAD: [
    'orders:read', 'orders:create', 'orders:update', 'orders:export',
    'inventory:read',
    'crm:read', 'crm:create', 'crm:update',
    'customers:read',
    'employees:read',
    'attendance:read',
    'payroll:read',
    'expenses:read', 'expenses:create',
    'reports:read',
  ],

  MANAGER: [
    'orders:read', 'orders:create', 'orders:update',
    'inventory:read',
    'crm:read', 'crm:create', 'crm:update',
    'customers:read',
    'attendance:read',
    'expenses:read', 'expenses:create',
    'reports:read',
  ],

  EMPLOYEE: [
    'attendance:read', 'attendance:create',
    'performance:read', 'performance:create',
    'orders:read',
    'inventory:read',
  ],
};

export function hasPermission(role: JobRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

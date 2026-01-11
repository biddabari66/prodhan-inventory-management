import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';

/**
 * PRODUCTION-READY: Centralized hook for checking user permissions
 * This is the SINGLE source of truth for all permission checks in the app
 */
export const useUserPermissions = () => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserAndPermissions();
  }, []);

  const loadUserAndPermissions = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Super Admin and Admin have all permissions
      if (['super_admin', 'admin'].includes(currentUser?.job_role)) {
        const allPermissions = {
          inventory_overview: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          sales: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          customer_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          purchase_orders: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_movements: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_returns: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_reconciliation: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_suppliers: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          inventory_categories: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_approve: true, can_export: true },
          product_analytics: { can_view: true, can_export: true },
          inventory_reports: { can_view: true, can_export: true },
          inventory_ai_insights: { can_view: true, can_export: true },
          financial_analytics: { can_view: true, can_export: true, can_view_sensitive_finance: true },
          user_access_manager: { can_view: true, can_create: true, can_edit: true, can_delete: true },
          integrations: { can_view: true, can_create: true, can_edit: true, can_delete: true },
          system_alerts: { can_view: true, can_create: true, can_edit: true, can_delete: true },
          audit_trail: { can_view: true, can_export: true }
        };
        setPermissions(allPermissions);
        setIsLoading(false);
        return;
      }

      // Load permissions from UserPermission entity
      const userPermissions = await UserPermission.filter({ user_id: currentUser.id });
      const permMap = {};
      
      userPermissions.forEach(p => {
        permMap[p.module] = {
          can_view: p.can_view || false,
          can_create: p.can_create || false,
          can_edit: p.can_edit || false,
          can_delete: p.can_delete || false,
          can_approve: p.can_approve || false,
          can_export: p.can_export || false,
          can_view_sensitive_finance: p.can_view_sensitive_finance || false
        };
      });

      setPermissions(permMap);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setIsLoading(false);
    }
  };

  const hasPermission = useCallback((module, action = 'can_view') => {
    // Super Admin and Admin bypass
    if (['super_admin', 'admin'].includes(user?.job_role)) return true;
    return permissions[module]?.[action] === true;
  }, [user?.job_role, permissions]);

  const isSuperAdmin = useMemo(() => user?.job_role === 'super_admin', [user?.job_role]);
  const isAdmin = useMemo(() => ['super_admin', 'admin'].includes(user?.job_role), [user?.job_role]);

  return {
    user,
    permissions,
    isLoading,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    reload: loadUserAndPermissions
  };
};

export default useUserPermissions;
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { UserPermission } from '@/entities/UserPermission';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, AlertTriangle, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * PRODUCTION-READY PERMISSION GUARD SYSTEM
 *
 * Performance: the user comes from AuthContext (already loaded once at app boot)
 * and the permission map is fetched ONCE via React Query, cached across every
 * navigation and seeded synchronously from localStorage — so page-to-page
 * navigation no longer re-runs `me()` + a permissions fetch (no "Verifying…"
 * flash on every click).
 *
 * Security: client-side gating only hides pages. The real enforcement is the
 * backend `requirePermission` middleware on every API route — a tampered cache
 * cannot read data it isn't allowed to. Denials here still derive from the real
 * permission records.
 */

// Super Admin / Admin have unrestricted access to ALL modules and features.
const isSuperAdmin = (user) => {
  const jr = (user?.job_role || '').toLowerCase();
  return jr === 'super_admin' || jr === 'admin' || user?.role === 'admin';
};

const isAdmin = (user) => user?.job_role === 'admin' || user?.role === 'admin';

const canViewFinancialData = (user) =>
  isSuperAdmin(user) || isAdmin(user) || user?.can_view_financial_data === true;

const PERM_CACHE_KEY = 'cached_user_permissions';

const readCachedMap = () => {
  try {
    const raw = localStorage.getItem(PERM_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Single shared source of truth for the current user's permission map.
 * Returns { user, map, isLoading }. The map is keyed by module name.
 */
export const usePermissionMap = () => {
  const { user, isLoadingAuth } = useAuth();
  const superAdmin = isSuperAdmin(user);

  const { data: map, isLoading: mapLoading } = useQuery({
    queryKey: ['user-permission-map', user?.id],
    queryFn: async () => {
      const list = await UserPermission.filter({ user_id: user.id });
      const m = {};
      (list || []).forEach((p) => { if (p && p.module) m[p.module] = p; });
      try { localStorage.setItem(PERM_CACHE_KEY, JSON.stringify(m)); } catch { /* ignore */ }
      return m;
    },
    // Admins bypass; don't fetch for them. Only fetch when we have a user id.
    enabled: !!user?.id && !superAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // Seed synchronously from cache so the first protected page is instant…
    initialData: superAdmin ? undefined : (readCachedMap() || undefined),
    // …but treat the seed as stale so it's revalidated once in the background
    // (a stale/tampered cache self-corrects; pages still render instantly).
    initialDataUpdatedAt: 0,
    refetchOnWindowFocus: false,
  });

  return {
    user,
    map: map || null,
    isLoading: isLoadingAuth || (!superAdmin && !map && mapLoading),
  };
};

/**
 * Pure decision: 'loading' | 'allow' | 'deny'.
 */
const decide = ({ user, map, isLoading, module, permission, requireFinancialAccess }) => {
  if (isLoading) return 'loading';
  if (!user) return 'deny';
  if (isSuperAdmin(user)) return 'allow';
  if (requireFinancialAccess && !canViewFinancialData(user)) return 'deny';

  const mp = map ? map[module] : null;
  if (mp && mp[permission] === true) return 'allow';

  // Admins keep default view access to non-financial modules.
  if (isAdmin(user) && !requireFinancialAccess && permission === 'can_view') return 'allow';

  // If we have no map yet (and we're not loading), deny safely.
  return 'deny';
};

const InlineChecking = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="text-center space-y-3">
      <Shield className="w-8 h-8 animate-pulse mx-auto text-orange-500" />
      <p className="text-sm text-muted-foreground">Checking access…</p>
    </div>
  </div>
);

const AccessDenied = ({ module, requireFinancialAccess, user }) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-red-50 to-orange-50">
      <Card className="max-w-md w-full shadow-2xl border-red-200">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-red-900">Access Denied</h2>
            <p className="text-red-700">
              You don't have permission to access this {module} module
              {requireFinancialAccess && ' or view financial data'}.
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Need Access?</p>
                <p>Contact your system administrator or department head to request permission for this module.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="flex-1" variant="outline">
              Go to Dashboard
            </Button>
            <Button onClick={() => navigate(-1)} className="flex-1">Go Back</Button>
          </div>
          {user && (
            <div className="text-xs text-muted-foreground pt-4 border-t">
              <p>Logged in as: <span className="font-semibold">{user.full_name || user.displayName || user.email}</span></p>
              <p>Role: <span className="font-semibold">{user.job_role || user.role}</span></p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * HOC that wraps a page/component with permission checking (cached & fast).
 */
export const withPermission = (WrappedComponent, module, permission = 'can_view', requireFinancialAccess = false) => {
  return function PermissionGuardedComponent(props) {
    const { user, map, isLoading } = usePermissionMap();
    const decision = useMemo(
      () => decide({ user, map, isLoading, module, permission, requireFinancialAccess }),
      [user, map, isLoading]
    );

    if (decision === 'loading') return <InlineChecking />;
    if (decision === 'deny') return <AccessDenied module={module} requireFinancialAccess={requireFinancialAccess} user={user} />;
    return <WrappedComponent {...props} currentUser={user} />;
  };
};

/**
 * Hook to check permissions dynamically within components (cached & fast).
 * @returns {{ hasPermission: boolean, isLoading: boolean, user: object }}
 */
export const usePermission = (module, permission = 'can_view') => {
  const { user, map, isLoading } = usePermissionMap();
  const decision = decide({ user, map, isLoading, module, permission, requireFinancialAccess: false });
  return { hasPermission: decision === 'allow', isLoading: decision === 'loading', user };
};

/**
 * Conditionally render children based on permission.
 */
export const PermissionGate = ({ module, permission = 'can_view', children, fallback = null }) => {
  const { hasPermission, isLoading } = usePermission(module, permission);
  if (isLoading) return null;
  if (!hasPermission) return fallback;
  return <>{children}</>;
};

/**
 * Hide financial data from users without financial access.
 */
export const FinancialDataGate = ({ children, fallback = null }) => {
  const { user, isLoading } = usePermissionMap();
  if (isLoading) return null;
  if (!canViewFinancialData(user)) return fallback || (
    <div className="p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
      <Lock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
      <p className="text-sm text-gray-600 font-medium">Financial Data - Restricted Access</p>
      <p className="text-xs text-gray-500 mt-1">Contact your administrator for access</p>
    </div>
  );
  return <>{children}</>;
};

/**
 * Confidential field permission (purchase price, cost, profit, salary, finance).
 */
export const useConfidentialPermission = (confidentialField) => {
  const { user, map, isLoading } = usePermissionMap();
  if (isSuperAdmin(user)) return { canView: true, isLoading: false };
  const canView = !!map && Object.values(map).some((p) => p && p[confidentialField] === true);
  return { canView, isLoading };
};

export const ConfidentialDataGate = ({ field, children, fallback = null }) => {
  const { canView, isLoading } = useConfidentialPermission(field);
  if (isLoading) return null;
  if (!canView) return fallback || (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
      <Lock className="w-3 h-3" /> Restricted
    </span>
  );
  return <>{children}</>;
};

export default withPermission;

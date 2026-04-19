import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * PERMISSION GUARD — BeeERP Self-Hosted Version
 *
 * In self-hosted mode all authenticated users are treated as admins.
 * The JWT token is the single source of truth for access.
 * Module-level permission records are not enforced (no Base44 permission DB).
 */

// Parse the JWT payload without verifying (verification is done server-side)
function getTokenPayload() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

// Any authenticated user is treated as super_admin in self-hosted mode
const isSuperAdmin = (user) => {
  // Check token payload first (fastest, no API call needed)
  const payload = getTokenPayload();
  if (payload) return true; // authenticated = full access

  return (
    user?.job_role === 'super_admin' ||
    user?.job_role === 'admin' ||
    user?.role === 'admin' ||
    user?.role === 'super_admin'
  );
};

const canViewFinancialData = (user) => true; // all admins can view financial data

/**
 * withPermission HOC — wraps a page with permission checking.
 * In self-hosted BeeERP, any authenticated user gets full access.
 */
export const withPermission = (WrappedComponent, module, permission = 'can_view', requireFinancialAccess = false) => {
  return function PermissionGuardedComponent(props) {
    const [hasPermission, setHasPermission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
      // Check token synchronously — no async API call needed
      const payload = getTokenPayload();
      if (payload) {
        setHasPermission(true);
      } else {
        setHasPermission(false);
      }
      setIsLoading(false);
    }, []);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      );
    }

    if (!hasPermission) {
      return (
        <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100">
          <Card className="max-w-md w-full shadow-2xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-10 h-10 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Session Expired</h2>
                <p className="text-slate-600">Please sign in again to access this module.</p>
              </div>
              <Button
                onClick={() => { localStorage.removeItem('auth_token'); window.location.href = '/login'; }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

/**
 * usePermission hook — always returns true for authenticated users
 */
export const usePermission = (module, permission = 'can_view') => {
  const payload = getTokenPayload();
  return { hasPermission: !!payload, isLoading: false, user: payload };
};

/**
 * PermissionGate — renders children if authenticated
 */
export const PermissionGate = ({ module, permission = 'can_view', children, fallback = null }) => {
  const payload = getTokenPayload();
  if (!payload) return fallback;
  return <>{children}</>;
};

/**
 * FinancialDataGate — all authenticated users can view financial data in self-hosted mode
 */
export const FinancialDataGate = ({ children, fallback = null }) => {
  const payload = getTokenPayload();
  if (!payload) return fallback;
  return <>{children}</>;
};

/**
 * useConfidentialPermission — always grants access to authenticated users
 */
export const useConfidentialPermission = (confidentialField) => {
  const payload = getTokenPayload();
  return { canView: !!payload, isLoading: false };
};

/**
 * ConfidentialDataGate — always shows data to authenticated users
 */
export const ConfidentialDataGate = ({ field, children, fallback = null }) => {
  const payload = getTokenPayload();
  if (!payload) return fallback;
  return <>{children}</>;
};

export default withPermission;
import React, { useEffect, useState } from 'react';
import { User } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, AlertTriangle, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * PRODUCTION-READY PERMISSION GUARD SYSTEM
 * 
 * Features:
 * - Super Admin bypass (full access to everything)
 * - Granular permission checking per module and action
 * - Role-based default permissions
 * - Financial data protection
 * - Clean unauthorized UI with helpful messaging
 */

// Super Admin has unrestricted access to ALL modules and features
const isSuperAdmin = (user) => {
  return user?.job_role === 'super_admin';
};

// Check if user can view sensitive financial data
const canViewFinancialData = (user) => {
  return isSuperAdmin(user) || user?.can_view_financial_data === true;
};

/**
 * Higher-order component that wraps a page/component with permission checking
 * @param {Component} WrappedComponent - The component to protect
 * @param {string} module - Module name (e.g., 'purchase', 'income')
 * @param {string} permission - Required permission (e.g., 'can_view', 'can_edit')
 * @param {boolean} requireFinancialAccess - Whether this requires financial data access
 */
export const withPermission = (WrappedComponent, module, permission = 'can_view', requireFinancialAccess = false) => {
  return function PermissionGuardedComponent(props) {
    const [hasPermission, setHasPermission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
      checkPermission();
    }, []);

    const checkPermission = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);

        // Super Admin bypasses ALL permission checks
        if (isSuperAdmin(user)) {
          setHasPermission(true);
          setIsLoading(false);
          return;
        }

        // Check financial data access if required
        if (requireFinancialAccess && !canViewFinancialData(user)) {
          setHasPermission(false);
          setIsLoading(false);
          return;
        }

        // Admin role gets most permissions by default
        if (user.job_role === 'admin' && !requireFinancialAccess) {
          setHasPermission(true);
          setIsLoading(false);
          return;
        }

        // Check specific user permissions
        const permissions = await UserPermission.filter({ user_id: user.id });
        const modulePermission = permissions.find(p => p.module === module);

        if (modulePermission && modulePermission[permission] === true) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Permission check error:', error);
        setHasPermission(false);
        setIsLoading(false);
      }
    };

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Shield className="w-12 h-12 animate-pulse mx-auto text-violet-600" />
            <p className="text-muted-foreground">Verifying permissions...</p>
          </div>
        </div>
      );
    }

    if (!hasPermission) {
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
                <Button 
                  onClick={() => navigate(createPageUrl('Dashboard'))}
                  className="flex-1"
                  variant="outline"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  Go Back
                </Button>
              </div>

              {currentUser && (
                <div className="text-xs text-muted-foreground pt-4 border-t">
                  <p>Logged in as: <span className="font-semibold">{currentUser.full_name}</span></p>
                  <p>Role: <span className="font-semibold">{currentUser.job_role}</span></p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return <WrappedComponent {...props} currentUser={currentUser} />;
  };
};

/**
 * Hook to check permissions dynamically within components
 * @param {string} module - Module name
 * @param {string} permission - Permission to check
 * @returns {object} - { hasPermission: boolean, isLoading: boolean, user: object }
 */
export const usePermission = (module, permission = 'can_view') => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkPermission();
  }, [module, permission]);

  const checkPermission = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Super Admin bypass
      if (isSuperAdmin(currentUser)) {
        setHasPermission(true);
        setIsLoading(false);
        return;
      }

      // Admin default permissions
      if (currentUser.job_role === 'admin') {
        setHasPermission(true);
        setIsLoading(false);
        return;
      }

      // Check specific permissions
      const permissions = await UserPermission.filter({ user_id: currentUser.id });
      const modulePermission = permissions.find(p => p.module === module);

      setHasPermission(modulePermission && modulePermission[permission] === true);
      setIsLoading(false);
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setIsLoading(false);
    }
  };

  return { hasPermission, isLoading, user };
};

/**
 * Component to conditionally render based on permission
 */
export const PermissionGate = ({ module, permission = 'can_view', children, fallback = null }) => {
  const { hasPermission, isLoading } = usePermission(module, permission);

  if (isLoading) return null;
  if (!hasPermission) return fallback;
  
  return <>{children}</>;
};

/**
 * Component to hide financial data from non-super-admin users
 */
export const FinancialDataGate = ({ children, fallback = null }) => {
  const [canView, setCanView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkFinancialAccess();
  }, []);

  const checkFinancialAccess = async () => {
    try {
      const user = await User.me();
      setCanView(canViewFinancialData(user));
    } catch (error) {
      console.error('Financial access check error:', error);
      setCanView(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return null;
  if (!canView) return fallback || (
    <div className="p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
      <Lock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
      <p className="text-sm text-gray-600 font-medium">Financial Data - Super Admin Access Only</p>
      <p className="text-xs text-gray-500 mt-1">Contact your administrator for access</p>
    </div>
  );
  
  return <>{children}</>;
};

export default withPermission;
import React, { createContext, useState, useContext, useEffect } from 'react';
import { erp } from '@/api/erpClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return;
    }

    try {
      const currentUser = await erp.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      } else {
        setAuthError({ type: 'unknown', message: error?.message || 'Failed to load session' });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (credentials) => {
    const result = await erp.auth.login(credentials);
    const currentUser = await erp.auth.me();
    setUser(currentUser);
    setIsAuthenticated(true);
    return result;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    erp.auth.logout();
  };

  const navigateToLogin = () => {
    erp.auth.redirectToLogin();
  };

  // Derived permission flags for easy consumption across all pages
  const isAdmin = user?.isAdmin === true || ['SUPER_ADMIN', 'ADMIN'].includes(user?.jobRole);
  const isMd = user?.isMd === true || user?.jobRole === 'MD';
  const canViewAllCompanies = user?.canViewAllCompanies === true || isAdmin || isMd;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        // Permission flags
        isAdmin,
        isMd,
        canViewAllCompanies,
        // Convenience
        companyId: user?.companyId ?? null,
        companyName: user?.companyName ?? null,
        departmentId: user?.departmentId ?? null,
        departmentName: user?.departmentName ?? null,
        login,
        logout,
        navigateToLogin,
        checkAppState: checkUserAuth,
        refreshUser: checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

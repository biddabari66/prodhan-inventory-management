import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({
    id: 'beeErp-local',
    public_settings: { app_name: 'BeeERP', requires_auth: true }
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.warn('Auth check failed:', error.message || error);

      // Only clear token on actual auth rejection (401/403), not network errors
      const status = error.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
      } else if (!status) {
        // Network/server unreachable — don't clear token, allow retry
        // but mark as not authenticated so the UI redirects to login
        setIsAuthenticated(false);
      } else {
        // Other server errors (500 etc) — still require re-login
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    const data = await base44.auth.login(email, password);
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthError(null);
    return data;
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('cached_user_data');
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      logout,
      navigateToLogin,
      checkAppState: checkAuth
    }}>
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

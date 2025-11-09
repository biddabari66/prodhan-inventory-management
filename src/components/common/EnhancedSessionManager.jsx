import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { User } from '@/entities/User';
import { AuditLog } from '@/entities/AuditLog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showWarning, setShowWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Set session timeout to 24 hours
  const IDLE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const WARNING_DURATION = 5 * 60 * 1000; // 5 minutes warning
  const WARNING_TIME = IDLE_TIMEOUT - WARNING_DURATION;
  
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const lastInitTimestamp = useRef(0); // Safeguard against rapid re-renders

  const initializeSession = useCallback(async () => {
    // Safeguard to prevent "Too Many Requests" (429) errors from render loops
    if (Date.now() - lastInitTimestamp.current < 5000) {
      console.warn("Session initialization throttled to prevent request loop.");
      return;
    }
    lastInitTimestamp.current = Date.now();
    
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Session initialization failed:', error);
      // Don't set user to null on 429, might be temporary
      if (error?.response?.status !== 429) {
          setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    toast.success('Connection restored');
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast.error('Connection lost - working offline');
  }, []);

  const setupNetworkListeners = useCallback(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }, [handleOnline, handleOffline]);

  const removeNetworkListeners = useCallback(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }, [handleOnline, handleOffline]);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const handleIdleLogout = useCallback(async () => {
    try {
      clearAllTimers();
      setShowWarning(false);
      
      if (user) {
        await AuditLog.create({
          user_id: user.id,
          user_name: user.full_name,
          action: 'logout',
          entity_type: 'User',
          module: 'Auth',
          description: 'User logged out due to inactivity',
          timestamp: new Date().toISOString()
        });
      }

      await User.logout();
      toast.info('You have been logged out due to inactivity');
      window.location.reload();
    } catch (error) {
      console.error('Idle logout failed:', error);
      window.location.reload();
    }
  }, [user, clearAllTimers]);

  const showIdleWarning = useCallback(() => {
    setShowWarning(true);
    setWarningCountdown(WARNING_DURATION / 1000);
    
    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setWarningCountdown(prev => {
        if (prev <= 1) {
          handleIdleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-logout after warning period
    idleTimerRef.current = setTimeout(() => {
      handleIdleLogout();
    }, WARNING_DURATION);
  }, [WARNING_DURATION, handleIdleLogout]);

  const resetIdleTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    
    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      showIdleWarning();
    }, WARNING_TIME);
  }, [WARNING_TIME, clearAllTimers, showIdleWarning]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    setWarningCountdown(0);
    clearAllTimers();
    resetIdleTimer();
    toast.success('Session extended');
  }, [clearAllTimers, resetIdleTimer]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      extendSession();
    } else {
      resetIdleTimer();
    }
  }, [showWarning, resetIdleTimer, extendSession]);

  const setupActivityListeners = useCallback(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
  }, [handleActivity]);

  const removeActivityListeners = useCallback(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, handleActivity, true);
    });
  }, [handleActivity]);

  const handleManualLogout = useCallback(async () => {
    try {
      clearAllTimers();
      setShowWarning(false);
      
      if (user) {
        await AuditLog.create({
          user_id: user.id,
          user_name: user.full_name,
          action: 'logout',
          entity_type: 'User',
          module: 'Auth',
          description: 'User logged out manually',
          timestamp: new Date().toISOString()
        });
      }

      await User.logout();
      toast.success('Logged out successfully');
      window.location.reload();
    } catch (error) {
      console.error('Manual logout failed:', error);
      window.location.reload();
    }
  }, [user, clearAllTimers]);

  useEffect(() => {
    initializeSession();
    setupNetworkListeners();
    setupActivityListeners();
    resetIdleTimer();

    return () => {
      clearAllTimers();
      removeActivityListeners();
      removeNetworkListeners();
    };
  }, [initializeSession, setupNetworkListeners, setupActivityListeners, resetIdleTimer, clearAllTimers, removeActivityListeners, removeNetworkListeners]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const contextValue = {
    user,
    isOnline,
    isLoading,
    logout: handleManualLogout,
    extendSession
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
      
      {!isOnline && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className="bg-yellow-50 border-yellow-200">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You're currently offline
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Dialog open={showWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Session Expiring Soon
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Your session will expire in
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatTime(warningCountdown)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={extendSession} className="flex-1">
                Stay Logged In
              </Button>
              <Button onClick={handleIdleLogout} variant="outline" className="flex-1">
                Logout Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SessionContext.Provider>
  );
};

export default SessionProvider;
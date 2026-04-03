import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Navigation,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Attendance as AttendanceEntity } from '@/entities/Attendance';
import { AttendanceSetting } from '@/entities/AttendanceSetting';
import { User } from '@/entities/User';
import { markAttendance } from '@/functions/markAttendance';
import { base44 } from '@/api/base44Client';
import { useDebounce, useThrottle, CacheManager, usePerformanceMonitor } from '../components/common/PerformanceOptimizer';
import { useOptimisticActions } from '../components/common/OptimisticActions';

import MobileCheckInOut from '../components/attendance/MobileCheckInOut';

// Lazy load heavy components for faster initial load
const AttendanceAnalytics = React.lazy(() => import('../components/attendance/AttendanceAnalytics'));
const ManualAttendanceForm = React.lazy(() => import('../components/attendance/ManualAttendanceForm'));
const ShiftManagement = React.lazy(() => import('../components/attendance/ShiftManagement'));
const ShiftAssignmentManagement = React.lazy(() => import('../components/attendance/ShiftAssignmentManagement'));
const OfficeLocationPicker = React.lazy(() => import('../components/attendance/OfficeLocationPicker'));

// Rate limit retry utility
const withRateLimitRetry = async (apiCall, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      const isRateLimit = error?.response?.status === 429 ||
                         error?.message?.includes('Rate limit') ||
                         error?.message?.includes('429 Too Many Requests');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`Rate limit hit, retrying after ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

// Sequential delay utility to prevent simultaneous API calls
const sequentialDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Digital Clock Component - Optimized with React.memo
const DigitalClock = React.memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 border-0 shadow-2xl overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]"></div>
      <CardContent className="p-8 sm:p-10 text-center relative z-10">
        <div className="space-y-4">
          <div className="text-5xl sm:text-7xl font-black text-white tabular-nums tracking-tight drop-shadow-lg">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-lg sm:text-xl text-white/90 font-semibold">
            {format(currentTime, 'EEEE, d MMMM yyyy')}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-white/80 font-semibold uppercase tracking-wider">Live Bangladesh Time</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

DigitalClock.displayName = 'DigitalClock';

// Enhanced Location Status Component - Optimized with React.memo
const LocationStatus = React.memo(({ currentLocation, isLocationLoading, onRefreshLocation, officeLocation, allowedRadius }) => {
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const getLocationIcon = useMemo(() => {
    if (isLocationLoading) return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (!currentLocation) return <WifiOff className="w-5 h-5 text-red-500" />;
    return <Navigation className="w-5 h-5 text-green-500" />;
  }, [isLocationLoading, currentLocation]);

  const getLocationStatus = useMemo(() => {
    if (isLocationLoading) return { text: 'Getting location...', color: 'text-blue-600' };
    if (!currentLocation) return { text: 'Location unavailable', color: 'text-red-600' };

    if (officeLocation && allowedRadius) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );

      if (distance <= allowedRadius) {
        return { text: `Within office area (${Math.round(distance)}m away)`, color: 'text-green-600' };
      } else {
        return { text: `Outside office area (${Math.round(distance)}m away)`, color: 'text-orange-600' };
      }
    }

    return { text: 'Location acquired', color: 'text-green-600' };
  }, [isLocationLoading, currentLocation, officeLocation, allowedRadius, calculateDistance]);

  const status = getLocationStatus;

  return (
    <Card className="bg-white border border-slate-200 shadow-md">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 pb-4">
        <CardTitle className="flex items-center gap-3 text-lg text-slate-900">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          GPS Location
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getLocationIcon}
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Location Status</h3>
              <p className={`text-xs sm:text-sm ${status.color}`}>{status.text}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshLocation}
            disabled={isLocationLoading}
            className="min-h-[44px] min-w-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${isLocationLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {currentLocation && (
          <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Latitude:</span>
              <span className="font-mono">{currentLocation.latitude.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span>Longitude:</span>
              <span className="font-mono">{currentLocation.longitude.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span>Accuracy:</span>
              <span className={`font-mono ${currentLocation.accuracy < 50 ? 'text-green-600' : currentLocation.accuracy < 150 ? 'text-orange-600' : 'text-red-600'}`}>
                {Math.round(currentLocation.accuracy)}m
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

LocationStatus.displayName = 'LocationStatus';

export default function AttendancePage() {
  usePerformanceMonitor('AttendancePage');

  const [currentUser, setCurrentUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('prompt');
  const [attendanceSettings, setAttendanceSettings] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [lastDataLoad, setLastDataLoad] = useState(null);

  const [settings, setSettings] = useState({
    office_latitude: '',
    office_longitude: '',
    radius_meters: 100,
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    late_threshold_minutes: 15,
    max_gps_accuracy_meters: 150
  });

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  
  const { optimisticAttendance } = useOptimisticActions();

  // Cached user loading with memoization
  const loadCurrentUserWithRetry = useCallback(async (retries = 3) => {
    const cacheKey = 'current_user';
    const cached = CacheManager.get(cacheKey);
    
    if (cached) {
      setCurrentUser(cached);
      return cached;
    }

    const user = await withRateLimitRetry(async () => {
      const u = await User.me();
      CacheManager.set(cacheKey, u, 2 * 60 * 1000); // Cache for 2 minutes
      setCurrentUser(u);
      return u;
    }, retries);
    
    return user;
  }, []);

  const loadTodayAttendance = useCallback(async () => {
    if (!currentUser) return;
    
    const cacheKey = `attendance_${currentUser.id}_${today}`;
    const cached = CacheManager.get(cacheKey);
    
    if (cached) {
      setTodayAttendance(cached);
      return cached;
    }

    return await withRateLimitRetry(async () => {
      const records = await AttendanceEntity.filter({
        employee_id: currentUser.id,
        date: today
      });
      const attendance = records.length > 0 ? records[0] : null;
      CacheManager.set(cacheKey, attendance, 1 * 60 * 1000); // Cache for 1 minute
      setTodayAttendance(attendance);
      return attendance;
    });
  }, [currentUser, today]);

  const loadMonthlyStats = useCallback(async () => {
    if (!currentUser) return;
    
    const currentMonth = format(new Date(), 'yyyy-MM');
    const cacheKey = `monthly_stats_${currentUser.id}_${currentMonth}`;
    const cached = CacheManager.get(cacheKey);
    
    if (cached) {
      setMonthlyStats(cached);
      return cached;
    }

    return await withRateLimitRetry(async () => {
      const records = await AttendanceEntity.filter({
        employee_id: currentUser.id,
        date: { $gte: `${currentMonth}-01`, $lte: `${currentMonth}-31` }
      });
      CacheManager.set(cacheKey, records, 3 * 60 * 1000); // Cache for 3 minutes
      setMonthlyStats(records);
      return records;
    });
  }, [currentUser]);

  const loadAttendanceSettings = useCallback(async () => {
    const cacheKey = 'attendance_settings';
    const cached = CacheManager.get(cacheKey);
    
    if (cached) {
      setAttendanceSettings(cached);
      setSettings({
        office_latitude: cached.office_latitude || '',
        office_longitude: cached.office_longitude || '',
        radius_meters: cached.radius_meters || 100,
        working_hours_start: cached.working_hours_start || '09:00',
        working_hours_end: cached.working_hours_end || '18:00',
        late_threshold_minutes: cached.late_threshold_minutes || 15,
        max_gps_accuracy_meters: cached.max_gps_accuracy_meters || 150
      });
      return cached;
    }

    return await withRateLimitRetry(async () => {
      const settingsList = await AttendanceSetting.list();
      if (settingsList && settingsList.length > 0) {
        const savedSettings = settingsList[0];
        CacheManager.set(cacheKey, savedSettings, 5 * 60 * 1000); // Cache for 5 minutes
        setAttendanceSettings(savedSettings);
        setSettings({
          office_latitude: savedSettings.office_latitude || '',
          office_longitude: savedSettings.office_longitude || '',
          radius_meters: savedSettings.radius_meters || 100,
          working_hours_start: savedSettings.working_hours_start || '09:00',
          working_hours_end: savedSettings.working_hours_end || '18:00',
          late_threshold_minutes: savedSettings.late_threshold_minutes || 15,
          max_gps_accuracy_meters: savedSettings.max_gps_accuracy_meters || 150
        });
        return savedSettings;
      }
      return null;
    });
  }, []);

  // Debounced data loading
  const loadAllAttendanceData = useCallback(async () => {
    if (!currentUser || isDataLoading) return;
    
    setIsDataLoading(true);
    try {
      console.log('🚀 [OPTIMIZED] Loading attendance data with caching...');
      
      await loadTodayAttendance();
      await sequentialDelay(200);
      
      await loadMonthlyStats();
      await sequentialDelay(200);
      
      await loadAttendanceSettings();
      
      setLastDataLoad(new Date());
      console.log('✅ [OPTIMIZED] Attendance data loaded from cache/API');
      
    } catch (error) {
      console.error('❌ Failed to load attendance data:', error);
      
      if (error?.response?.status === 429 || error?.message?.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment and try again.', {
          duration: 5000
        });
      } else {
        toast.error('Failed to load attendance data. Please try again.');
      }
    } finally {
      setIsDataLoading(false);
    }
  }, [currentUser, isDataLoading, loadTodayAttendance, loadMonthlyStats, loadAttendanceSettings]);

  // Throttled refresh
  const handleRefreshAttendance = useThrottle(() => {
    CacheManager.clearAll(); // Clear all caches on manual refresh
    loadAllAttendanceData();
    toast.success('Attendance data refreshed');
  }, 2000);

  const checkLocationPermission = useCallback(async () => {
    if (!navigator.permissions) {
      setLocationPermissionStatus('unsupported');
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermissionStatus(permission.state);

      permission.onchange = () => {
        setLocationPermissionStatus(permission.state);
      };
    } catch (error) {
      console.warn('Unable to check location permission:', error);
    }
  }, []);

  const getCurrentLocationAdvanced = useCallback(async () => {
    setIsLocationLoading(true);
    
    try {
      console.log('📍 [OPTIMIZED] Getting precise location...');
      
      const location = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this device'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const result = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            console.log('✅ Location acquired:', result);
            resolve(result);
          },
          (error) => {
            let message = 'Failed to get location';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = 'Location access denied. Please enable location permissions.';
                break;
              case error.POSITION_UNAVAILABLE:
                message = 'Location information is unavailable.';
                break;
              case error.TIMEOUT:
                message = 'Location request timed out.';
                break;
              default:
                message = `Location error: ${error.message}`;
            }
            reject(new Error(message));
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 10000
          }
        );
      });

      setCurrentLocation(location);
      return location;

    } catch (error) {
      console.error('❌ Location error:', error);
      throw error;
    } finally {
      setIsLocationLoading(false);
    }
  }, []);
  
  const getCurrentLocationSilently = useCallback(async () => {
    try {
      await getCurrentLocationAdvanced();
    } catch (error) {
      console.log('Initial location load failed silently:', error.message);
    }
  }, [getCurrentLocationAdvanced]);

  const getVerifiedLocation = useCallback(async () => {
    for (let i = 0; i < 3; i++) {
        try {
            const location = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation is not supported by this device'));
                    return;
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            });
            const result = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy
            };
            setCurrentLocation(result);
            return result;
        } catch (error) {
            let errorMessage = error.message;
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage = 'Location access denied. Please enable location permissions.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                errorMessage = 'Location unavailable. Ensure GPS is active.';
            } else if (error.code === error.TIMEOUT) {
                errorMessage = 'Location request timed out.';
            }

            if (i < 2) {
                toast.warning(`Location attempt ${i + 1} failed: ${errorMessage}. Retrying...`);
                await new Promise(res => setTimeout(res, 1000));
            } else {
                throw new Error(`Failed to get precise location after multiple attempts: ${errorMessage}`);
            }
        }
    }
  }, []);

  const submitAttendance = useCallback(async (action) => {
    setIsSubmitting(true);

    try {
        const location = await getVerifiedLocation();

        const attendanceData = {
            employee_id: currentUser.id,
            date: today,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
        };

        // 🚀 OPTIMISTIC UPDATE - Instant UI feedback
        const result = await optimisticAttendance(
            action,
            attendanceData,
            async () => {
                const payload = {
                    action: action,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                };
                
                const response = await markAttendance(payload);

                if (response.data.success) {
                    // Clear cache
                    CacheManager.clear(`attendance_${currentUser.id}_${today}`);
                    CacheManager.clear(`monthly_stats_${currentUser.id}_${format(new Date(), 'yyyy-MM')}`);
                    
                    // 🔥 TRIGGER AUTO-EMAIL for attendance
                    try {
                        // Assuming `base44` is globally available or imported from a context
                        await (window.base44 || base44).functions.invoke('triggerAutoEmails', {
                            event_type: action === 'check_in' ? 'attendance_checked_in' : 'attendance_checked_out',
                            event_data: {
                                employee_name: currentUser.full_name,
                                employee_email: currentUser.email,
                                date: today,
                                check_in_time: response.data.data?.check_in_time,
                                check_out_time: response.data.data?.check_out_time,
                                working_hours: response.data.data?.working_hours,
                                status: response.data.data?.status
                            }
                        });
                    } catch (emailError) {
                        console.warn('⚠️ Auto-email failed:', emailError);
                    }
                    
                    if (response.data.data?.bangladesh_time) {
                        setTimeout(() => {
                            toast.success(`🇧🇩 Bangladesh Time: ${response.data.data.bangladesh_time}`, {
                                duration: 4000
                            });
                        }, 1000);
                    }
                    
                    return response.data.data;
                } else {
                    throw new Error(response.data.error || `Failed to ${action}`);
                }
            }
        );

        if (result.success) {
            toast.success(`✅ ${action === 'check_in' ? 'Checked in' : 'Checked out'} successfully!`, { duration: 3000 });
        }

    } catch (error) {
        console.error(`💥 ${action} error:`, error);
        toast.error(`🚨 ${error.message || `An error occurred during ${action}.`}`, { duration: 6000 });
    } finally {
        setIsSubmitting(false);
    }
  }, [getVerifiedLocation, currentUser, today, optimisticAttendance]);

  const initializeAttendancePage = useCallback(async () => {
    try {
      console.log('🚀 [OPTIMIZED] Initializing attendance page...');
      
      await loadCurrentUserWithRetry();
      console.log('✅ User loaded');
      
      await checkLocationPermission();
      await getCurrentLocationSilently();
      console.log('✅ Location initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize attendance page:', error);
      toast.error('Failed to initialize page. Please refresh.');
    }
  }, [loadCurrentUserWithRetry, checkLocationPermission, getCurrentLocationSilently]);

  useEffect(() => {
    initializeAttendancePage();
  }, [initializeAttendancePage]);

  useEffect(() => {
    if (currentUser && !lastDataLoad && !isDataLoading) {
      const timeoutId = setTimeout(() => {
        loadAllAttendanceData();
      }, 500); // Reduced from 1000ms to 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentUser, lastDataLoad, isDataLoading, loadAllAttendanceData]);

  const saveAttendanceSettings = useCallback(async () => {
    if (!currentUser || currentUser.job_role !== 'admin') {
      toast.error('Access denied. Only administrators can modify attendance settings.');
      return;
    }

    try {
      const settingsList = await withRateLimitRetry(() => AttendanceSetting.list());

      if (settingsList && settingsList.length > 0) {
        await withRateLimitRetry(() => AttendanceSetting.update(settingsList[0].id, settings));
      } else {
        await withRateLimitRetry(() => AttendanceSetting.create(settings));
      }

      setAttendanceSettings(settings);
      CacheManager.clear('attendance_settings'); // Clear cache for settings
      toast.success('Attendance settings saved successfully!');
      await loadAttendanceSettings(); // Reload to ensure UI is in sync with potentially updated cache
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    }
  }, [currentUser, settings, loadAttendanceSettings]);

  const isAdmin = useCallback(() => {
    return currentUser && currentUser.job_role === 'admin';
  }, [currentUser]);

  const getAttendanceStatus = useMemo(() => {
    if (!todayAttendance) return { status: 'Not checked in', color: 'bg-gray-100 text-gray-800' };
    if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
      return { status: 'Checked In', color: 'bg-blue-100 text-blue-800' };
    }
    if (todayAttendance.check_in_time && todayAttendance.check_out_time) {
      return { status: 'Completed', color: 'bg-green-100 text-green-800' };
    }
    return { status: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }, [todayAttendance]);

  const attendanceStatus = getAttendanceStatus;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-violet-500" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Loading Attendance System</h1>
            <p className="text-muted-foreground">Optimized loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-slate-900 font-medium">Attendance System</span>
      </div>

      {/* Premium Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-[#D32F2F]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Attendance System</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">🇧🇩 Bangladesh timezone-verified attendance tracking with GPS verification</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastDataLoad && (
            <Badge className="bg-slate-100 text-slate-700 border border-slate-300 font-mono text-xs">
              Last sync: {format(lastDataLoad, 'HH:mm')} BD
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshAttendance}
            disabled={isDataLoading}
            className="bg-white border-slate-200 hover:bg-slate-50 h-10 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${isDataLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 text-sm font-semibold shadow-md">
            <Shield className="w-4 h-4 mr-1.5 inline" />
            Optimized ⚡
            {locationPermissionStatus === 'granted' ? (
              <Wifi className="w-4 h-4 ml-1.5 inline" />
            ) : (
              <WifiOff className="w-4 h-4 ml-1.5 inline" />
            )}
          </Badge>
        </div>
      </div>

      {/* Data Loading Indicator */}
      {isDataLoading && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-blue-900 font-semibold text-base">⚡ Refreshing attendance data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="checkinout" className="space-y-6">
        <TabsList className={`flex w-full ${isAdmin() ? '' : ''} h-12 p-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto gap-1`}>
          <TabsTrigger value="checkinout" className="h-10 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">Check In/Out</TabsTrigger>
          <TabsTrigger value="analytics" className="h-10 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">Analytics</TabsTrigger>
          <TabsTrigger value="manual" className="h-10 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">Manual Entry</TabsTrigger>
          {isAdmin() && <TabsTrigger value="location" className="h-10 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">📍 Location</TabsTrigger>}
          {isAdmin() && <TabsTrigger value="settings" className="h-10 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">⚙️ Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="checkinout" className="space-y-4 sm:space-y-6">
          {/* Mobile-optimized Check In/Out */}
          <div className="lg:hidden">
            <MobileCheckInOut currentUser={currentUser} todayAttendance={todayAttendance} onRefresh={() => { CacheManager.clearAll(); loadAllAttendanceData(); }} />
          </div>

          {/* Desktop Check In/Out */}
          <div className="hidden lg:block space-y-6">
            <DigitalClock />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Actions */}
              <Card className="bg-white border border-slate-200 shadow-md">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 pb-5">
                  <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    Today's Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-sm font-semibold text-slate-700">Current Status:</span>
                    <Badge className={`${attendanceStatus.color} px-4 py-2 text-sm font-bold`}>
                      {attendanceStatus.status}
                    </Badge>
                  </div>

                  {todayAttendance && (
                    <div className="space-y-2 text-sm">
                      {todayAttendance.check_in_time && (
                        <div className="flex justify-between"><span>Check-in:</span><span className="font-mono">{todayAttendance.check_in_time}</span></div>
                      )}
                      {todayAttendance.check_out_time && (
                        <div className="flex justify-between"><span>Check-out:</span><span className="font-mono">{todayAttendance.check_out_time}</span></div>
                      )}
                      {todayAttendance.working_hours != null && (
                        <div className="flex justify-between"><span>Working Hours:</span><span className="font-mono">{todayAttendance.working_hours.toFixed(1)}h</span></div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <Button
                      onClick={() => submitAttendance('check_in')}
                      disabled={isSubmitting || !!todayAttendance?.check_in_time}
                      className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-lg shadow-red-500/25 w-full h-14 text-base font-semibold rounded-xl disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                      Check In Now
                    </Button>
                    <Button
                      onClick={() => submitAttendance('check_out')}
                      disabled={isSubmitting || !todayAttendance?.check_in_time || !!todayAttendance?.check_out_time}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-[#D32F2F] w-full h-14 text-base font-semibold rounded-xl disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <XCircle className="w-5 h-5 mr-2" />}
                      Check Out
                    </Button>
                  </div>

                  {locationPermissionStatus !== 'granted' && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">Location permission required. Please enable GPS.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Location Status */}
              <LocationStatus
                currentLocation={currentLocation}
                isLocationLoading={isLocationLoading || isSubmitting}
                onRefreshLocation={getCurrentLocationAdvanced}
                officeLocation={attendanceSettings ? { latitude: attendanceSettings.office_latitude, longitude: attendanceSettings.office_longitude } : null}
                allowedRadius={attendanceSettings?.radius_meters}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <React.Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          }>
            <AttendanceAnalytics />
          </React.Suspense>
        </TabsContent>

        <TabsContent value="manual">
          <React.Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
          }>
            <ManualAttendanceForm
              currentUser={currentUser}
              onSuccess={loadAllAttendanceData}
            />
          </React.Suspense>
        </TabsContent>

        {/* Location Tab - Admin Only (Office Location Picker) */}
        {isAdmin() && (
          <TabsContent value="location" className="space-y-6">
            <React.Suspense fallback={
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            }>
              <OfficeLocationPicker
                settings={settings}
                onSettingsChange={setSettings}
                currentLocation={currentLocation}
              />
            </React.Suspense>
          </TabsContent>
        )}

        {/* Settings Tab - Admin Only (Shifts + Advanced Settings) */}
        {isAdmin() && (
          <TabsContent value="settings" className="space-y-6">
            <React.Suspense fallback={
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            }>
              <ShiftManagement />
              <ShiftAssignmentManagement />
            </React.Suspense>
            
            <Card className="premium-card mt-6">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Shield className="w-5 h-5 text-red-500" />
                      Attendance Settings
                      <Badge className="bg-red-100 text-red-800 text-xs">Admin Only</Badge>
                    </CardTitle>
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200 mt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">Critical System Configuration</p>
                      <p>These settings control location verification for all employees. Changes affect the entire organization's attendance system.</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Office Location */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Office Location</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="latitude" className="text-sm">Office Latitude</Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="0.000001"
                          value={settings.office_latitude}
                          onChange={(e) => setSettings({ ...settings, office_latitude: e.target.value })}
                          placeholder="23.7344354426003"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="longitude" className="text-sm">Office Longitude</Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="0.000001"
                          value={settings.office_longitude}
                          onChange={(e) => setSettings({ ...settings, office_longitude: e.target.value })}
                          placeholder="90.3866128498717"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="radius" className="text-sm">Check-in Radius (meters)</Label>
                        <Input
                          id="radius"
                          type="number"
                          value={settings.radius_meters}
                          onChange={(e) => setSettings({ ...settings, radius_meters: parseInt(e.target.value) || 100 })}
                          placeholder="100"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Employees must be within this radius to check in
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Working Hours</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="start-time" className="text-sm">Start Time</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={settings.working_hours_start}
                          onChange={(e) => setSettings({ ...settings, working_hours_start: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time" className="text-sm">End Time</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={settings.working_hours_end}
                          onChange={(e) => setSettings({ ...settings, working_hours_end: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="late-threshold" className="text-sm">Late Threshold (minutes)</Label>
                        <Input
                          id="late-threshold"
                          type="number"
                          value={settings.late_threshold_minutes}
                          onChange={(e) => setSettings({ ...settings, late_threshold_minutes: parseInt(e.target.value) || 15 })}
                          placeholder="15"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Grace period before marking as late
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Location Accuracy</h3>
                  <div>
                    <Label htmlFor="gps-accuracy" className="text-sm">Max GPS Accuracy (meters)</Label>
                    <Input
                      id="gps-accuracy"
                      type="number"
                      value={settings.max_gps_accuracy_meters}
                      onChange={(e) => setSettings({ ...settings, max_gps_accuracy_meters: parseInt(e.target.value) || 150 })}
                      placeholder="150"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Rejects check-ins if GPS accuracy is worse than this value
                    </p>
                  </div>
                </div>

                {currentLocation && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Current Location</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <div>Lat: {currentLocation.latitude.toFixed(6)}</div>
                      <div>Lon: {currentLocation.longitude.toFixed(6)}</div>
                      <div>Accuracy: {Math.round(currentLocation.accuracy)}m</div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      You can use these coordinates as your office location if you're currently at the office.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={saveAttendanceSettings} className="flex-1 bg-[#D32F2F] hover:bg-[#B71C1C] h-12 text-base font-semibold rounded-lg shadow-sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Save Settings (Admin)
                  </Button>
                  <Button variant="outline" onClick={loadAttendanceSettings} className="h-12">
                    Reset
                  </Button>
                </div>

                {attendanceSettings && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>System Configuration Active:</strong> Office location set to {attendanceSettings.office_latitude?.toFixed(4)}, {attendanceSettings.office_longitude?.toFixed(4)} with {attendanceSettings.radius_meters}m radius. Max GPS accuracy: {attendanceSettings.max_gps_accuracy_meters}m. These settings are enforced for all employees.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  );
}
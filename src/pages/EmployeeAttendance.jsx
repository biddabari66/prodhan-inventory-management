import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, MapPin, Wifi, LogIn, LogOut, Calendar, History, 
  Users, CheckCircle, XCircle, AlertTriangle, Loader2, 
  Timer, TrendingUp, Shield, RefreshCw, Edit, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { User } from '@/entities/User';
import { Attendance } from '@/entities/Attendance';
import { Shift } from '@/entities/Shift';
import { withPermission } from '@/components/common/PermissionGuard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Lazy load admin components
const OfficeLocationPicker = React.lazy(() => import('../components/attendance/OfficeLocationPicker'));
const ShiftManagement = React.lazy(() => import('../components/attendance/ShiftManagement'));
const ShiftAssignmentManagement = React.lazy(() => import('../components/attendance/ShiftAssignmentManagement'));

// Location Tab Content with its own state management
const LocationTabContent = ({ currentLocation, locationAccuracy }) => {
  const [locationSettings, setLocationSettings] = useState({
    office_latitude: null,
    office_longitude: null,
    radius_meters: 100,
    require_ip_verification: false
  });

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await base44.entities.AttendanceSetting.list();
        if (settings && settings.length > 0) {
          setLocationSettings(settings[0]);
        }
      } catch (error) {
        console.error('Failed to load attendance settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Transform currentLocation to expected format
  const formattedLocation = currentLocation ? {
    latitude: currentLocation.lat,
    longitude: currentLocation.lng,
    accuracy: locationAccuracy || 0
  } : null;

  return (
    <OfficeLocationPicker
      settings={locationSettings}
      onSettingsChange={setLocationSettings}
      currentLocation={formattedLocation}
    />
  );
};

// Digital Clock Component
const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center">
      <div className="text-6xl md:text-8xl font-bold font-mono text-blue-600 dark:text-blue-400 tracking-wider">
        {format(time, 'HH:mm:ss')}
      </div>
      <div className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mt-2">
        {format(time, 'EEEE, MMMM d, yyyy')}
      </div>
    </div>
  );
};

// Location & IP Display Component
const LocationInfo = ({ location, ipAddress, accuracy }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
        <MapPin className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <p className="text-xs text-slate-500">Location</p>
        <p className="text-sm font-semibold truncate max-w-[150px]">
          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Fetching...'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
        <Wifi className="w-5 h-5 text-green-600" />
      </div>
      <div>
        <p className="text-xs text-slate-500">IP Address</p>
        <p className="text-sm font-semibold">{ipAddress || 'Detecting...'}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
        <Shield className="w-5 h-5 text-amber-600" />
      </div>
      <div>
        <p className="text-xs text-slate-500">Accuracy</p>
        <p className="text-sm font-semibold">{accuracy ? `${Math.round(accuracy)}m` : 'N/A'}</p>
      </div>
    </div>
  </div>
);

function EmployeeAttendancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('checkin');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [ipAddress, setIpAddress] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me()
  });

  // Fetch all users (for admin view)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => User.list(),
    enabled: currentUser?.job_role === 'admin' || currentUser?.job_role === 'super_admin'
  });

  // Fetch today's attendance for current user
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayAttendance, refetch: refetchTodayAttendance } = useQuery({
    queryKey: ['todayAttendance', currentUser?.id, today],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const records = await Attendance.filter({ 
        employee_id: currentUser.id, 
        date: today 
      });
      return records[0] || null;
    },
    enabled: !!currentUser?.id
  });

  // Fetch attendance history
  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['attendanceHistory', currentUser?.id, selectedMonth],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const [year, month] = selectedMonth.split('-');
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      
      const records = await Attendance.filter({ employee_id: currentUser.id });
      return records.filter(r => {
        const date = parseISO(r.date);
        return date >= start && date <= end;
      }).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: !!currentUser?.id
  });

  // Fetch all attendance for admin
  const { data: allAttendance = [] } = useQuery({
    queryKey: ['allAttendance', selectedMonth, selectedEmployee],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      
      let records = await Attendance.list('-date', 1000);
      records = records.filter(r => {
        const date = parseISO(r.date);
        return date >= start && date <= end;
      });
      
      if (selectedEmployee !== 'all') {
        records = records.filter(r => r.employee_id === selectedEmployee);
      }
      
      return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    enabled: currentUser?.job_role === 'admin' || currentUser?.job_role === 'super_admin'
  });

  // Get location and IP on mount
  useEffect(() => {
    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationAccuracy(position.coords.accuracy);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Could not get your location. Please enable location services.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // Get IP address
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Unknown'));
  }, []);

  // Check-in handler
  const handleCheckIn = async () => {
    if (!currentUser) {
      toast.error('User not loaded');
      return;
    }

    if (todayAttendance?.check_in_time) {
      toast.error('You have already checked in today');
      return;
    }

    setIsCheckingIn(true);
    try {
      const now = new Date();
      const checkInData = {
        employee_id: currentUser.id,
        employee_name: currentUser.full_name,
        date: format(now, 'yyyy-MM-dd'),
        check_in_time: format(now, 'HH:mm:ss'),
        status: 'present',
        check_in_latitude: currentLocation?.lat,
        check_in_longitude: currentLocation?.lng,
        location_accuracy: locationAccuracy,
        check_in_ip_address: ipAddress,
        device_info: navigator.userAgent
      };

      // Check if late (after 10 AM is considered late by default)
      const hour = now.getHours();
      if (hour >= 10) {
        checkInData.status = 'late';
      }

      await Attendance.create(checkInData);
      toast.success('✅ Checked in successfully!');
      refetchTodayAttendance();
      queryClient.invalidateQueries(['attendanceHistory']);
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to check in: ' + error.message);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Check-out handler
  const handleCheckOut = async () => {
    if (!todayAttendance) {
      toast.error('You need to check in first');
      return;
    }

    if (todayAttendance.check_out_time) {
      toast.error('You have already checked out today');
      return;
    }

    setIsCheckingOut(true);
    try {
      const now = new Date();
      const checkInTime = parseISO(`${todayAttendance.date}T${todayAttendance.check_in_time}`);
      const workingMinutes = differenceInMinutes(now, checkInTime);
      const workingHours = Math.round((workingMinutes / 60) * 100) / 100;

      await Attendance.update(todayAttendance.id, {
        check_out_time: format(now, 'HH:mm:ss'),
        working_hours: workingHours,
        check_out_latitude: currentLocation?.lat,
        check_out_longitude: currentLocation?.lng,
        check_out_ip_address: ipAddress
      });

      toast.success(`✅ Checked out! Total: ${workingHours.toFixed(2)} hours`);
      refetchTodayAttendance();
      queryClient.invalidateQueries(['attendanceHistory']);
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error('Failed to check out: ' + error.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isAdmin = currentUser?.job_role === 'admin' || currentUser?.job_role === 'super_admin';

  // Calculate stats
  const calculateStats = (records) => {
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const totalHours = records.reduce((sum, r) => sum + (r.working_hours || 0), 0);
    return { present, late, absent, totalHours };
  };

  const myStats = calculateStats(attendanceHistory);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Employee Attendance</h1>
              <p className="text-slate-600 dark:text-slate-400">Track your work hours with precision</p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetchTodayAttendance()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'} mb-6`}>
          <TabsTrigger value="checkin" className="gap-2">
            <LogIn className="w-4 h-4" />
            Check In/Out
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            My History
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-2">
              <Users className="w-4 h-4" />
              All Employees
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="location" className="gap-2">
              <MapPin className="w-4 h-4" />
              📍 Location
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              ⚙️ Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Check In/Out Tab */}
        <TabsContent value="checkin" className="space-y-6">
          {/* Digital Clock Card */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <CardContent className="pt-8 pb-8">
              <DigitalClock />
            </CardContent>
          </Card>

          {/* Location & IP Info */}
          <LocationInfo 
            location={currentLocation} 
            ipAddress={ipAddress} 
            accuracy={locationAccuracy} 
          />

          {/* Today's Status */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Today's Status - {format(new Date(), 'MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Check-in Status */}
                <div className="p-6 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Check In</h3>
                    {todayAttendance?.check_in_time ? (
                      <Badge className="bg-green-600">Done</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                    )}
                  </div>
                  {todayAttendance?.check_in_time ? (
                    <p className="text-3xl font-bold text-green-700">{todayAttendance.check_in_time}</p>
                  ) : (
                    <Button 
                      onClick={handleCheckIn} 
                      disabled={isCheckingIn || !currentLocation}
                      className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg"
                    >
                      {isCheckingIn ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                      ) : (
                        <><LogIn className="w-5 h-5 mr-2" />Check In Now</>
                      )}
                    </Button>
                  )}
                </div>

                {/* Check-out Status */}
                <div className="p-6 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-red-800 dark:text-red-200">Check Out</h3>
                    {todayAttendance?.check_out_time ? (
                      <Badge className="bg-red-600">Done</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                    )}
                  </div>
                  {todayAttendance?.check_out_time ? (
                    <p className="text-3xl font-bold text-red-700">{todayAttendance.check_out_time}</p>
                  ) : (
                    <Button 
                      onClick={handleCheckOut} 
                      disabled={isCheckingOut || !todayAttendance?.check_in_time || !currentLocation}
                      variant="destructive"
                      className="w-full h-14 text-lg"
                    >
                      {isCheckingOut ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                      ) : (
                        <><LogOut className="w-5 h-5 mr-2" />Check Out Now</>
                      )}
                    </Button>
                  )}
                </div>

                {/* Working Hours */}
                <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">Working Hours</h3>
                    <Timer className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-700">
                    {todayAttendance?.working_hours != null ? 
                      `${Number(todayAttendance.working_hours).toFixed(2)} hrs` : 
                      '--:--'
                    }
                  </p>
                  {todayAttendance?.status && (
                    <Badge className={`mt-2 ${
                      todayAttendance.status === 'present' ? 'bg-green-600' :
                      todayAttendance.status === 'late' ? 'bg-amber-600' : 'bg-red-600'
                    }`}>
                      {todayAttendance.status.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700">Present</span>
                </div>
                <p className="text-2xl font-bold text-green-800">{myStats.present}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-amber-700">Late</span>
                </div>
                <p className="text-2xl font-bold text-amber-800">{myStats.late}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-700">Absent</span>
                </div>
                <p className="text-2xl font-bold text-red-800">{myStats.absent}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-700">Total Hours</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">{(myStats.totalHours || 0).toFixed(1)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Month Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Attendance History</CardTitle>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Check In</th>
                      <th className="px-4 py-3 text-left">Check Out</th>
                      <th className="px-4 py-3 text-left">Hours</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.map((record) => (
                      <tr key={record.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3 font-medium">
                          {format(parseISO(record.date), 'EEE, MMM d')}
                        </td>
                        <td className="px-4 py-3">{record.check_in_time || '-'}</td>
                        <td className="px-4 py-3">{record.check_out_time || '-'}</td>
                        <td className="px-4 py-3 font-semibold">
                          {record.working_hours != null ? `${Number(record.working_hours).toFixed(2)}h` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${
                            record.status === 'present' ? 'bg-green-600' :
                            record.status === 'late' ? 'bg-amber-600' :
                            record.status === 'absent' ? 'bg-red-600' : 'bg-slate-600'
                          }`}>
                            {record.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {attendanceHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No attendance records for this month
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab - All Employees */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    All Employee Attendance
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {allUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-48"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left">Employee</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Check In</th>
                        <th className="px-4 py-3 text-left">Check Out</th>
                        <th className="px-4 py-3 text-left">Hours</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">IP Address</th>
                        <th className="px-4 py-3 text-center">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAttendance.map((record) => {
                        const employee = allUsers.find(u => u.id === record.employee_id);
                        return (
                          <tr key={record.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={employee?.profile_picture_url} />
                                  <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                                    {(employee?.full_name || 'U').charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{record.employee_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {format(parseISO(record.date), 'EEE, MMM d')}
                            </td>
                            <td className="px-4 py-3">{record.check_in_time || '-'}</td>
                            <td className="px-4 py-3">{record.check_out_time || '-'}</td>
                            <td className="px-4 py-3 font-semibold">
                              {record.working_hours != null ? `${Number(record.working_hours).toFixed(2)}h` : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`${
                                record.status === 'present' ? 'bg-green-600' :
                                record.status === 'late' ? 'bg-amber-600' :
                                record.status === 'absent' ? 'bg-red-600' : 'bg-slate-600'
                              }`}>
                                {record.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-500">
                              {record.check_in_ip_address || '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-green-300 text-green-700 hover:bg-green-50 h-8 px-2"
                                  onClick={async () => {
                                    await Attendance.update(record.id, { status: 'present' });
                                    queryClient.invalidateQueries(['allAttendance']);
                                    toast.success('Attendance approved');
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-red-300 text-red-700 hover:bg-red-50 h-8 px-2"
                                  onClick={() => {
                                    const newStatus = prompt('Enter new status (present, late, absent):', record.status);
                                    if (newStatus && ['present', 'late', 'absent'].includes(newStatus)) {
                                      Attendance.update(record.id, { status: newStatus });
                                      queryClient.invalidateQueries(['allAttendance']);
                                      toast.success('Status updated to ' + newStatus);
                                    }
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {allAttendance.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                            No attendance records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Admin Location Tab */}
        {isAdmin && (
          <TabsContent value="location" className="space-y-6">
            <React.Suspense fallback={
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            }>
              <LocationTabContent currentLocation={currentLocation} locationAccuracy={locationAccuracy} />
            </React.Suspense>
          </TabsContent>
        )}

        {/* Admin Settings Tab */}
        {isAdmin && (
          <TabsContent value="settings" className="space-y-6">
            <React.Suspense fallback={
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            }>
              <ShiftManagement />
              <ShiftAssignmentManagement />
            </React.Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default withPermission(EmployeeAttendancePage, 'attendance', 'can_view');
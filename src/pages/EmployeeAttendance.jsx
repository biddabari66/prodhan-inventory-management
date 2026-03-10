import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Clock, MapPin, Wifi, LogIn, LogOut, Calendar, History, 
  Users, CheckCircle, XCircle, AlertTriangle, Loader2, 
  Timer, Shield, RefreshCw, Settings, Edit, Save, Search,
  ChevronLeft, ChevronRight, Download, Plus, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { User } from '@/entities/User';
import { Attendance } from '@/entities/Attendance';
import { withPermission } from '@/components/common/PermissionGuard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const OfficeLocationPicker = React.lazy(() => import('@/components/attendance/OfficeLocationPicker'));
const ShiftManagement = React.lazy(() => import('@/components/attendance/ShiftManagement'));
const ShiftAssignmentManagement = React.lazy(() => import('@/components/attendance/ShiftAssignmentManagement'));

// Digital Clock
const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="text-center">
      <div className="text-5xl md:text-7xl font-bold font-mono text-slate-800 dark:text-slate-200 tracking-wider">{format(time, 'HH:mm:ss')}</div>
      <div className="text-base text-slate-500 mt-1">{format(time, 'EEEE, MMMM d, yyyy')}</div>
    </div>
  );
};

// Status colors
const STATUS_CONFIG = {
  present: { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Present' },
  late: { color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Late' },
  absent: { color: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Absent' },
  on_leave: { color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: 'On Leave' },
};

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
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [manualEntry, setManualEntry] = useState(null);

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => User.me() });
  const isAdmin = currentUser?.job_role === 'admin' || currentUser?.job_role === 'super_admin';

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'], queryFn: () => User.list(),
    enabled: isAdmin
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayAttendance, refetch: refetchToday } = useQuery({
    queryKey: ['todayAttendance', currentUser?.id, today],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const records = await Attendance.filter({ employee_id: currentUser.id, date: today });
      return records[0] || null;
    },
    enabled: !!currentUser?.id
  });

  const { data: monthAttendance = [], refetch: refetchMonth } = useQuery({
    queryKey: ['monthAttendance', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const records = await Attendance.list('-date', 5000);
      return records.filter(r => r.date >= start && r.date <= end);
    }
  });

  // Location tracking
  useEffect(() => {
    let watchId = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => { setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationAccuracy(pos.coords.accuracy); },
        () => {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => setIpAddress(d.ip)).catch(() => setIpAddress('Unknown'));
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  const handleCheckIn = async () => {
    if (!currentUser || todayAttendance?.check_in_time) return;
    setIsCheckingIn(true);
    const now = new Date();
    await Attendance.create({
      employee_id: currentUser.id, employee_name: currentUser.full_name,
      date: format(now, 'yyyy-MM-dd'), check_in_time: format(now, 'HH:mm:ss'),
      status: now.getHours() >= 10 ? 'late' : 'present',
      check_in_latitude: currentLocation?.lat, check_in_longitude: currentLocation?.lng,
      location_accuracy: locationAccuracy, check_in_ip_address: ipAddress, device_info: navigator.userAgent
    });
    toast.success('✅ Checked in!'); refetchToday(); queryClient.invalidateQueries(['monthAttendance']);
    setIsCheckingIn(false);
  };

  const handleCheckOut = async () => {
    if (!todayAttendance || todayAttendance.check_out_time) return;
    setIsCheckingOut(true);
    const now = new Date();
    const checkInTime = parseISO(`${todayAttendance.date}T${todayAttendance.check_in_time}`);
    const hours = Math.round((differenceInMinutes(now, checkInTime) / 60) * 100) / 100;
    await Attendance.update(todayAttendance.id, {
      check_out_time: format(now, 'HH:mm:ss'), working_hours: hours,
      check_out_latitude: currentLocation?.lat, check_out_longitude: currentLocation?.lng, check_out_ip_address: ipAddress
    });
    toast.success(`✅ Checked out! ${hours.toFixed(1)}h`); refetchToday(); queryClient.invalidateQueries(['monthAttendance']);
    setIsCheckingOut(false);
  };

  // My attendance for history tab
  const myAttendance = useMemo(() => monthAttendance.filter(r => r.employee_id === currentUser?.id).sort((a, b) => b.date.localeCompare(a.date)), [monthAttendance, currentUser]);
  
  const myStats = useMemo(() => {
    const present = myAttendance.filter(r => r.status === 'present').length;
    const late = myAttendance.filter(r => r.status === 'late').length;
    const absent = myAttendance.filter(r => r.status === 'absent').length;
    const leave = myAttendance.filter(r => r.status === 'on_leave').length;
    const hours = myAttendance.reduce((s, r) => s + (r.working_hours || 0), 0);
    return { present, late, absent, leave, hours, total: present + late };
  }, [myAttendance]);

  // Admin: employee summary for the month
  const employeeSummary = useMemo(() => {
    if (!isAdmin) return [];
    const map = {};
    allUsers.forEach(u => {
      map[u.id] = { user: u, present: 0, late: 0, absent: 0, leave: 0, hours: 0, records: [] };
    });
    monthAttendance.forEach(r => {
      if (!map[r.employee_id]) map[r.employee_id] = { user: { id: r.employee_id, full_name: r.employee_name }, present: 0, late: 0, absent: 0, leave: 0, hours: 0, records: [] };
      const entry = map[r.employee_id];
      entry.records.push(r);
      if (r.status === 'present') entry.present++;
      else if (r.status === 'late') entry.late++;
      else if (r.status === 'absent') entry.absent++;
      else if (r.status === 'on_leave') entry.leave++;
      entry.hours += (r.working_hours || 0);
    });
    return Object.values(map).filter(e => e.records.length > 0 || allUsers.find(u => u.id === e.user.id))
      .filter(e => {
        if (!searchQuery) return true;
        return e.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => (b.present + b.late) - (a.present + a.late));
  }, [allUsers, monthAttendance, isAdmin, searchQuery]);

  // Admin: filtered records for detail view
  const adminRecords = useMemo(() => {
    let records = monthAttendance;
    if (selectedEmployee !== 'all') records = records.filter(r => r.employee_id === selectedEmployee);
    return records.sort((a, b) => b.date.localeCompare(a.date));
  }, [monthAttendance, selectedEmployee]);

  // Edit attendance record
  const handleSaveEdit = async () => {
    if (!editRecord) return;
    await Attendance.update(editRecord.id, {
      status: editForm.status, check_in_time: editForm.check_in_time, check_out_time: editForm.check_out_time,
      working_hours: editForm.working_hours, notes: editForm.notes,
      manual_entry_by_id: currentUser.id, manual_entry_by_name: currentUser.full_name,
      manual_entry_reason: editForm.notes || 'Admin edit', manual_entry_timestamp: new Date().toISOString()
    });
    toast.success('Attendance updated!'); setEditRecord(null); refetchMonth();
  };

  // Manual attendance entry
  const handleManualEntry = async () => {
    if (!manualEntry) return;
    const user = allUsers.find(u => u.id === manualEntry.employee_id);
    await Attendance.create({
      employee_id: manualEntry.employee_id, employee_name: user?.full_name || manualEntry.employee_id,
      date: manualEntry.date, check_in_time: manualEntry.check_in_time || '', check_out_time: manualEntry.check_out_time || '',
      status: manualEntry.status, working_hours: manualEntry.working_hours || 0,
      notes: manualEntry.notes, manual_entry_by_id: currentUser.id, manual_entry_by_name: currentUser.full_name,
      manual_entry_reason: manualEntry.notes || 'Manual entry by admin', manual_entry_timestamp: new Date().toISOString()
    });
    toast.success('Manual attendance added!'); setManualEntry(null); refetchMonth();
  };

  // Export
  const handleExport = () => {
    const data = adminRecords.map(r => ({
      Employee: r.employee_name, Date: r.date, 'Check In': r.check_in_time || '', 'Check Out': r.check_out_time || '',
      Hours: r.working_hours || 0, Status: r.status, Notes: r.notes || ''
    }));
    const headers = Object.keys(data[0] || {});
    const csv = [headers.join(','), ...data.map(r => headers.map(h => `"${r[h]}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.download = `attendance_${selectedMonth}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

  // Navigate months
  const changeMonth = (dir) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir);
    setSelectedMonth(format(d, 'yyyy-MM'));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
        <span>HR</span><span>/</span><span className="text-slate-900 font-medium">Attendance</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
            <p className="text-sm text-slate-500">Track & manage employee attendance</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchToday(); refetchMonth(); }}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-2'} h-11`}>
          <TabsTrigger value="checkin" className="gap-1.5 text-sm"><LogIn className="w-4 h-4" /> Check In/Out</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-sm"><History className="w-4 h-4" /> My History</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin" className="gap-1.5 text-sm"><Users className="w-4 h-4" /> All Staff</TabsTrigger>}
          {isAdmin && <TabsTrigger value="location" className="gap-1.5 text-sm"><MapPin className="w-4 h-4" /> Location</TabsTrigger>}
          {isAdmin && <TabsTrigger value="settings" className="gap-1.5 text-sm"><Settings className="w-4 h-4" /> Shifts</TabsTrigger>}
        </TabsList>

        {/* CHECK IN/OUT */}
        <TabsContent value="checkin" className="space-y-5 mt-4">
          <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
            <CardContent className="pt-8 pb-6"><DigitalClock /></CardContent>
          </Card>

          {/* Location info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${currentLocation ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{currentLocation ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : 'Getting location...'}</span>
            <span className="mx-2 text-slate-300">|</span>
            <Wifi className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">{ipAddress || '...'}</span>
            {locationAccuracy && <Badge variant="outline" className="ml-auto text-xs">{Math.round(locationAccuracy)}m accuracy</Badge>}
          </div>

          {/* Today's status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-green-800">Check In</span>
                  {todayAttendance?.check_in_time ? <Badge className="bg-emerald-600 text-white text-xs">Done</Badge> : <Badge variant="outline" className="text-amber-600 text-xs">Pending</Badge>}
                </div>
                {todayAttendance?.check_in_time ? (
                  <p className="text-3xl font-bold text-green-700">{todayAttendance.check_in_time}</p>
                ) : (
                  <Button onClick={handleCheckIn} disabled={isCheckingIn || !currentLocation} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12">
                    {isCheckingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />} Check In
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-red-800">Check Out</span>
                  {todayAttendance?.check_out_time ? <Badge className="bg-red-600 text-white text-xs">Done</Badge> : <Badge variant="outline" className="text-amber-600 text-xs">Pending</Badge>}
                </div>
                {todayAttendance?.check_out_time ? (
                  <p className="text-3xl font-bold text-red-700">{todayAttendance.check_out_time}</p>
                ) : (
                  <Button onClick={handleCheckOut} disabled={isCheckingOut || !todayAttendance?.check_in_time} variant="destructive" className="w-full h-12">
                    {isCheckingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />} Check Out
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-blue-800">Working Hours</span>
                  <Timer className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-blue-700">{todayAttendance?.working_hours != null ? `${Number(todayAttendance.working_hours).toFixed(1)}h` : '--'}</p>
                {todayAttendance?.status && <Badge className={`mt-2 ${STATUS_CONFIG[todayAttendance.status]?.color}`}>{STATUS_CONFIG[todayAttendance.status]?.label}</Badge>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MY HISTORY */}
        <TabsContent value="history" className="space-y-5 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Present', val: myStats.present, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
              { label: 'Late', val: myStats.late, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
              { label: 'Absent', val: myStats.absent, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
              { label: 'Leave', val: myStats.leave, color: 'text-blue-600', bg: 'bg-blue-50', icon: Calendar },
              { label: 'Hours', val: myStats.hours.toFixed(1), color: 'text-slate-700', bg: 'bg-slate-50', icon: Timer },
            ].map((s, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                  <div><p className={`text-xl font-bold ${s.color}`}>{s.val}</p><p className="text-[10px] text-slate-400 uppercase">{s.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base">My Attendance</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-40 h-8 text-sm" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">In</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Out</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Hours</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">Status</th>
                  </tr></thead>
                  <tbody>
                    {myAttendance.map(r => (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-medium">{format(parseISO(r.date), 'EEE, MMM d')}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{r.check_in_time || '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{r.check_out_time || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{r.working_hours ? `${Number(r.working_hours).toFixed(1)}h` : '—'}</td>
                        <td className="px-4 py-2.5 text-center"><Badge className={`text-xs ${STATUS_CONFIG[r.status]?.color}`}>{STATUS_CONFIG[r.status]?.label}</Badge></td>
                      </tr>
                    ))}
                    {myAttendance.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No records</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADMIN - ALL STAFF */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-5 mt-4">
            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search employee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-40 h-10 border-0 rounded-none text-sm text-center" />
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="All Employees" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-10" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
                <Button size="sm" className="h-10 bg-red-600 hover:bg-red-700" onClick={() => setManualEntry({ employee_id: '', date: format(new Date(), 'yyyy-MM-dd'), check_in_time: '09:00', check_out_time: '18:00', status: 'present', working_hours: 9, notes: '' })}>
                  <Plus className="w-4 h-4 mr-1" /> Manual Entry
                </Button>
              </div>
            </div>

            {/* Employee Summary Cards */}
            {selectedEmployee === 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {employeeSummary.slice(0, 12).map(emp => (
                  <Card key={emp.user.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedEmployee(emp.user.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={emp.user.profile_picture_url} />
                          <AvatarFallback className="bg-red-100 text-red-700 text-sm">{emp.user.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{emp.user.full_name}</p>
                          <p className="text-xs text-slate-400">{emp.user.designation || emp.user.department || ''}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div><p className="text-base font-bold text-emerald-600">{emp.present}</p><p className="text-[9px] text-slate-400">Present</p></div>
                        <div><p className="text-base font-bold text-amber-600">{emp.late}</p><p className="text-[9px] text-slate-400">Late</p></div>
                        <div><p className="text-base font-bold text-red-600">{emp.absent}</p><p className="text-[9px] text-slate-400">Absent</p></div>
                        <div><p className="text-base font-bold text-slate-700">{emp.hours.toFixed(0)}h</p><p className="text-[9px] text-slate-400">Hours</p></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Detail Table */}
            {selectedEmployee !== 'all' && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee('all')}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
                    <CardTitle className="text-base">{allUsers.find(u => u.id === selectedEmployee)?.full_name || 'Employee'} - Detail</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50"><tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">In</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Out</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Hours</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">Status</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">IP</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">Actions</th>
                      </tr></thead>
                      <tbody>
                        {adminRecords.map(r => (
                          <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-medium">{format(parseISO(r.date), 'EEE, MMM d')}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{r.check_in_time || '—'}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{r.check_out_time || '—'}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{r.working_hours ? `${Number(r.working_hours).toFixed(1)}h` : '—'}</td>
                            <td className="px-4 py-2.5 text-center"><Badge className={`text-xs ${STATUS_CONFIG[r.status]?.color}`}>{STATUS_CONFIG[r.status]?.label}</Badge></td>
                            <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{r.check_in_ip_address || '—'}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setEditRecord(r); setEditForm({ status: r.status, check_in_time: r.check_in_time || '', check_out_time: r.check_out_time || '', working_hours: r.working_hours || 0, notes: r.notes || '' }); }}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* LOCATION */}
        {isAdmin && (
          <TabsContent value="location" className="mt-4">
            <React.Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>}>
              <LocationTabContent currentLocation={currentLocation} locationAccuracy={locationAccuracy} />
            </React.Suspense>
          </TabsContent>
        )}

        {/* SHIFT SETTINGS */}
        {isAdmin && (
          <TabsContent value="settings" className="space-y-6 mt-4">
            <React.Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>}>
              <ShiftManagement />
              <ShiftAssignmentManagement />
            </React.Suspense>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Attendance - {editRecord?.employee_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-sm"><strong>Date:</strong> {editRecord?.date}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Check In</Label><Input value={editForm.check_in_time} onChange={(e) => setEditForm({ ...editForm, check_in_time: e.target.value })} /></div>
              <div><Label className="text-xs">Check Out</Label><Input value={editForm.check_out_time} onChange={(e) => setEditForm({ ...editForm, check_out_time: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Hours</Label><Input type="number" step="0.5" value={editForm.working_hours} onChange={(e) => setEditForm({ ...editForm, working_hours: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} placeholder="Reason for edit..." /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveEdit}><Save className="w-4 h-4 mr-1" /> Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={!!manualEntry} onOpenChange={() => setManualEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manual Attendance Entry</DialogTitle></DialogHeader>
          {manualEntry && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Employee</Label>
                <Select value={manualEntry.employee_id} onValueChange={(v) => setManualEntry({ ...manualEntry, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Date</Label><Input type="date" value={manualEntry.date} onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={manualEntry.status} onValueChange={(v) => setManualEntry({ ...manualEntry, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">In</Label><Input type="time" value={manualEntry.check_in_time} onChange={(e) => setManualEntry({ ...manualEntry, check_in_time: e.target.value })} /></div>
                <div><Label className="text-xs">Out</Label><Input type="time" value={manualEntry.check_out_time} onChange={(e) => setManualEntry({ ...manualEntry, check_out_time: e.target.value })} /></div>
                <div><Label className="text-xs">Hours</Label><Input type="number" step="0.5" value={manualEntry.working_hours} onChange={(e) => setManualEntry({ ...manualEntry, working_hours: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div><Label className="text-xs">Notes</Label><Textarea value={manualEntry.notes} onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })} rows={2} /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setManualEntry(null)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={handleManualEntry} disabled={!manualEntry.employee_id}><UserCheck className="w-4 h-4 mr-1" /> Add Entry</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Location Tab reusable
const LocationTabContent = ({ currentLocation, locationAccuracy }) => {
  const [settings, setSettings] = useState({ office_latitude: null, office_longitude: null, radius_meters: 100, require_ip_verification: false });
  useEffect(() => {
    base44.entities.AttendanceSetting.list().then(s => { if (s?.length) setSettings(s[0]); }).catch(() => {});
  }, []);
  const loc = currentLocation ? { latitude: currentLocation.lat, longitude: currentLocation.lng, accuracy: locationAccuracy || 0 } : null;
  return <OfficeLocationPicker settings={settings} onSettingsChange={setSettings} currentLocation={loc} />;
};

export default withPermission(EmployeeAttendancePage, 'attendance', 'can_view');
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarOff,
  ListChecks,
  Plus,
  RefreshCw,
  Users,
  Fingerprint,
  Bluetooth,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { TableSkeleton, StatGridSkeleton, ErrorState } from '@/components/common/Skeletons';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY', 'LEAVE'];

const STATUS_BADGE = {
  PRESENT: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  ABSENT: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  LATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  LEAVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  HALF_DAY: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  HOLIDAY: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const cls = STATUS_BADGE[status] || 'bg-slate-100 text-slate-700';
  return <Badge className={`${cls} font-medium`}>{status.replace('_', ' ')}</Badge>;
}

export default function AttendanceAdmin() {
  const queryClient = useQueryClient();

  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');

  // ----- Users (for resolving names + filters/dialog) -----
  const usersQuery = useQuery({
    queryKey: ['users', 'attendance-admin'],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { limit: 200 } });
      return data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const users = usersQuery.data ?? [];
  const userMap = useMemo(() => {
    const m = new Map();
    users.forEach((u) => m.set(u.id, u.displayName || u.full_name || u.email || u.id));
    return m;
  }, [users]);
  const nameFor = (id) => userMap.get(id) || id || 'Unknown';

  // ----- Attendance records -----
  const attendanceParams = useMemo(() => {
    const p = { dateFrom, dateTo };
    if (statusFilter !== 'ALL') p.status = statusFilter;
    if (userFilter !== 'ALL') p.userId = userFilter;
    return p;
  }, [dateFrom, dateTo, statusFilter, userFilter]);

  const attendanceQuery = useQuery({
    queryKey: ['attendance', attendanceParams],
    queryFn: async () => {
      const { data } = await api.get('/attendance', { params: attendanceParams });
      return data?.data ?? [];
    },
    keepPreviousData: true,
  });

  const records = attendanceQuery.data ?? [];

  // ----- Stats -----
  const stats = useMemo(() => {
    const count = (s) => records.filter((r) => r.status === s).length;
    return {
      present: count('PRESENT'),
      absent: count('ABSENT'),
      late: count('LATE'),
      leave: count('LEAVE'),
      total: records.length,
    };
  }, [records]);

  // ----- Per-employee summary -----
  const summary = useMemo(() => {
    const byUser = new Map();
    records.forEach((r) => {
      if (!byUser.has(r.userId)) {
        byUser.set(r.userId, { userId: r.userId, present: 0, absent: 0, late: 0, leave: 0, total: 0 });
      }
      const row = byUser.get(r.userId);
      row.total += 1;
      if (r.status === 'PRESENT') row.present += 1;
      else if (r.status === 'ABSENT') row.absent += 1;
      else if (r.status === 'LATE') row.late += 1;
      else if (r.status === 'LEAVE') row.leave += 1;
    });
    return Array.from(byUser.values())
      .map((row) => {
        const considered = row.total - 0; // all records in range
        const attended = row.present + row.late;
        const pct = considered > 0 ? Math.round((attended / considered) * 100) : 0;
        return { ...row, pct };
      })
      .sort((a, b) => nameFor(a.userId).localeCompare(nameFor(b.userId)));
  }, [records, userMap]);

  // ----- Presets -----
  const applyPreset = (preset) => {
    const now = new Date();
    if (preset === 'today') {
      setDateFrom(todayStr());
      setDateTo(todayStr());
    } else if (preset === 'week') {
      setDateFrom(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setDateTo(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (preset === 'month') {
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
    }
  };

  // ----- Mark attendance dialog -----
  const [dialogOpen, setDialogOpen] = useState(false);
  const emptyForm = { userId: '', date: todayStr(), status: 'PRESENT', checkIn: '', checkOut: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const markMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/attendance/manual', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Attendance marked successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to mark attendance');
    },
  });

  const submitMark = () => {
    if (!form.userId) {
      toast.error('Please select an employee');
      return;
    }
    if (!form.date) {
      toast.error('Please select a date');
      return;
    }
    const payload = {
      userId: form.userId,
      date: form.date,
      status: form.status,
    };
    if (form.checkIn) payload.checkIn = form.checkIn;
    if (form.checkOut) payload.checkOut = form.checkOut;
    if (form.notes) payload.notes = form.notes;
    markMutation.mutate(payload);
  };

  const isFirstLoad = attendanceQuery.isLoading && !attendanceQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarCheck}
        title="Attendance Management"
        subtitle="View and manage attendance for all employees"
        breadcrumb="HR / Attendance"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => attendanceQuery.refetch()}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${attendanceQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                  <Plus className="w-4 h-4" />
                  Mark Attendance
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Mark Attendance</DialogTitle>
                  <DialogDescription>
                    Manually record attendance for an employee.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Employee</Label>
                    <Select value={form.userId} onValueChange={(v) => setField('userId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.displayName || u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={form.date}
                        onChange={(e) => setField('date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Check-in</Label>
                      <Input
                        type="time"
                        value={form.checkIn}
                        onChange={(e) => setField('checkIn', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Check-out</Label>
                      <Input
                        type="time"
                        value={form.checkOut}
                        onChange={(e) => setField('checkOut', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Optional notes"
                      value={form.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={submitMark}
                    disabled={markMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {markMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Filters */}
      <Card className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:flex-wrap">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPreset('today')}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('week')}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('month')}>
                This Month
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full lg:w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full lg:w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All employees</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.displayName || u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {isFirstLoad ? (
        <StatGridSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <StatCard icon={CheckCircle2} label="Present" value={stats.present} tone="green" index={0} />
          <StatCard icon={XCircle} label="Absent" value={stats.absent} tone="red" index={1} />
          <StatCard icon={AlertTriangle} label="Late" value={stats.late} tone="orange" index={2} />
          <StatCard icon={CalendarOff} label="On Leave" value={stats.leave} tone="blue" index={3} />
          <StatCard icon={ListChecks} label="Total Records" value={stats.total} tone="slate" index={4} />
        </div>
      )}

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="summary">Per-Employee Summary</TabsTrigger>
          <TabsTrigger value="config" className="gap-2 text-indigo-600 data-[state=active]:text-indigo-700">
            <Fingerprint className="w-4 h-4" />
            Device Config
          </TabsTrigger>
        </TabsList>

        {/* Records tab */}
        <TabsContent value="records">
          <Card className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="w-5 h-5 text-orange-500" />
                Attendance Records
                {!isFirstLoad && (
                  <span className="text-sm font-normal text-slate-500">({records.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isFirstLoad ? (
                <TableSkeleton rows={8} cols={7} />
              ) : attendanceQuery.isError ? (
                <ErrorState
                  message="Failed to load attendance records."
                  onRetry={() => attendanceQuery.refetch()}
                />
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-slate-500">
                  <CalendarOff className="w-10 h-10 text-slate-300" />
                  <p className="text-sm">No attendance records for the selected filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Working Hours</TableHead>
                        <TableHead>Late (min)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{nameFor(r.userId)}</TableCell>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>{r.checkIn || <span className="text-slate-400">—</span>}</TableCell>
                          <TableCell>{r.checkOut || <span className="text-slate-400">—</span>}</TableCell>
                          <TableCell>
                            {r.workingHours != null ? `${r.workingHours}h` : <span className="text-slate-400">—</span>}
                          </TableCell>
                          <TableCell>
                            {r.lateMinutes ? (
                              <span className="text-amber-600 font-medium">{r.lateMinutes}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={r.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary tab */}
        <TabsContent value="summary">
          <Card className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-orange-500" />
                Per-Employee Summary
                <span className="text-sm font-normal text-slate-500">
                  ({dateFrom} → {dateTo})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isFirstLoad ? (
                <TableSkeleton rows={6} cols={6} />
              ) : attendanceQuery.isError ? (
                <ErrorState
                  message="Failed to load summary."
                  onRetry={() => attendanceQuery.refetch()}
                />
              ) : summary.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center text-slate-500">
                  <Users className="w-10 h-10 text-slate-300" />
                  <p className="text-sm">No data for the selected period.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Leave</TableHead>
                        <TableHead>Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.map((row) => (
                        <TableRow key={row.userId}>
                          <TableCell className="font-medium">{nameFor(row.userId)}</TableCell>
                          <TableCell>
                            <span className="text-green-600 font-medium">{row.present}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-red-600 font-medium">{row.absent}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-amber-600 font-medium">{row.late}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-blue-600 font-medium">{row.leave}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                                  style={{ width: `${row.pct}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium tabular-nums">{row.pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Biometrics Config tab */}
        <TabsContent value="config">
          <Card className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
              <CardTitle className="flex items-center gap-2 text-base text-indigo-900">
                <Fingerprint className="w-5 h-5 text-indigo-500" />
                Biometric & Bluetooth Device Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column: Setup Guide */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Device Setup Guide</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Follow these steps to connect supported biometric terminals (e.g., ZKTeco) or Bluetooth attendance beacons to your workspace.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">1</div>
                        <div>
                          <h4 className="font-medium text-slate-900">Network Configuration</h4>
                          <p className="text-sm text-slate-600 mt-1">Connect your biometric device to the same local network, or configure it to push data to our cloud endpoint: <code className="bg-slate-200 px-1 rounded">https://api.prodhan.com/webhooks/attendance</code></p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">2</div>
                        <div>
                          <h4 className="font-medium text-slate-900">Register Device Serial</h4>
                          <p className="text-sm text-slate-600 mt-1">Enter the Serial Number (SN) of the biometric device or MAC address of the Bluetooth beacon in the registration panel.</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">3</div>
                        <div>
                          <h4 className="font-medium text-slate-900">Sync Users</h4>
                          <p className="text-sm text-slate-600 mt-1">Click "Sync Users" to push the employee list to the device, or pull enrolled fingerprints from the device to the cloud.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column: Active Devices */}
                <div className="space-y-6">
                  <div className="p-5 rounded-xl border border-slate-200 shadow-sm bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900">Connected Devices</h3>
                      <Button size="sm" variant="outline" className="h-8 gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Mock Device 1 */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Wifi className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">ZKTeco K40</p>
                            <p className="text-xs text-slate-500">IP: 192.168.1.100</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700">Online</Badge>
                      </div>

                      {/* Mock Device 2 */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <Bluetooth className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">Entrance Beacon</p>
                            <p className="text-xs text-slate-500">MAC: 00:1A:2B:3C</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-slate-200 text-slate-600">Offline</Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <RefreshCw className="w-4 h-4" />
                        Sync All Devices
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

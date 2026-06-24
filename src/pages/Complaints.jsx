import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquareWarning, Plus, AlertCircle, CheckCircle2, FolderOpen, RefreshCw, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { StatGridSkeleton, TableSkeleton, ErrorState } from '@/components/common/Skeletons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const CHANNELS = [
  { value: 'phone', label: 'Phone' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'walk_in', label: 'Walk-in' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'reopened', label: 'Reopened' },
];

const STATUS_STYLES = {
  open: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  reopened: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  reopened: 'Reopened',
};

const CHART_COLORS = ['#F59E0B', '#FB923C', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return '—';
  }
};

export default function Complaints() {
  const queryClient = useQueryClient();

  // Date range — default: this month
  const [range, setRange] = useState(() => ({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  }));

  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const applyPreset = (preset) => {
    const now = new Date();
    if (preset === 'week') {
      setRange({
        from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      });
    } else if (preset === 'month') {
      setRange({
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      });
    }
  };

  // ---- Queries ----
  const deptQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments');
      return res.data?.data ?? res.data ?? [];
    },
  });
  const departments = Array.isArray(deptQuery.data) ? deptQuery.data : [];

  const complaintsQuery = useQuery({
    queryKey: ['complaints', range.from, range.to],
    queryFn: async () => {
      const res = await api.get('/reporting/complaints', {
        params: { dateFrom: range.from, dateTo: range.to },
      });
      return res.data?.data ?? res.data ?? [];
    },
  });
  const complaints = Array.isArray(complaintsQuery.data) ? complaintsQuery.data : [];

  const bySourceQuery = useQuery({
    queryKey: ['complaints-by-source', range.from, range.to],
    queryFn: async () => {
      const res = await api.get('/reporting/complaints-by-source', {
        params: { dateFrom: range.from, dateTo: range.to },
      });
      return res.data?.data ?? res.data ?? { total: 0, teams: [] };
    },
  });
  const bySource = bySourceQuery.data ?? { total: 0, teams: [] };
  const teams = Array.isArray(bySource.teams) ? bySource.teams : [];

  // ---- Stats ----
  const stats = useMemo(() => {
    const total = complaints.length;
    const open = complaints.filter((c) => c.status === 'open' || c.status === 'reopened').length;
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    const repeat = complaints.filter((c) => c.isRepeat).length;
    return { total, open, resolved, repeat };
  }, [complaints]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    queryClient.invalidateQueries({ queryKey: ['complaints-by-source'] });
  };

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (body) => api.post('/reporting/complaints', body),
    onSuccess: () => {
      toast.success('Complaint logged — source team notified');
      setNewOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to log complaint'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/reporting/complaints/${id}`, body),
    onSuccess: () => {
      toast.success('Complaint updated');
      setSelected(null);
      invalidate();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <PageHeader
          icon={MessageSquareWarning}
          title="Complaints"
          subtitle="Closed-loop complaint tracking by source team"
          actions={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  className="h-9 w-[150px]"
                  aria-label="From date"
                />
                <span className="text-slate-400 text-sm">to</span>
                <Input
                  type="date"
                  value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  className="h-9 w-[150px]"
                  aria-label="To date"
                />
                <Button variant="outline" size="sm" className="h-9" onClick={() => applyPreset('week')}>
                  This Week
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => applyPreset('month')}>
                  This Month
                </Button>
              </div>
              <Button
                onClick={() => setNewOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Complaint
              </Button>
            </>
          }
        />

        {/* Stats */}
        {complaintsQuery.isLoading ? (
          <StatGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatTile icon={MessageSquareWarning} label="Total" value={stats.total} tone="orange" />
            <StatTile icon={AlertCircle} label="Open" value={stats.open} tone="amber" />
            <StatTile icon={CheckCircle2} label="Resolved" value={stats.resolved} tone="green" />
            <StatTile icon={RefreshCw} label="Repeat" value={stats.repeat} tone="red" />
          </div>
        )}

        <Tabs defaultValue="complaints" className="space-y-4">
          <TabsList>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="bySource">By Source Team</TabsTrigger>
          </TabsList>

          {/* ---- Complaints tab ---- */}
          <TabsContent value="complaints">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderOpen className="w-4 h-4 text-amber-600" />
                  Complaints log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complaintsQuery.isLoading ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : complaintsQuery.isError ? (
                  <ErrorState message="Failed to load complaints." onRetry={() => complaintsQuery.refetch()} />
                ) : complaints.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No complaints in this date range.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Source Team</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>CSAT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complaints.map((c) => (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer hover:bg-amber-50/60 dark:hover:bg-slate-800/60"
                            onClick={() => setSelected(c)}
                          >
                            <TableCell className="whitespace-nowrap text-sm">{fmtDate(c.date)}</TableCell>
                            <TableCell className="font-medium">{c.customer || '—'}</TableCell>
                            <TableCell className="capitalize text-sm">
                              {(c.channel || '').replace('_', ' ') || '—'}
                            </TableCell>
                            <TableCell>
                              {c.sourceTeamName ? (
                                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                                  {c.sourceTeamName}
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge className={STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-700'}>
                                  {STATUS_LABEL[c.status] || c.status}
                                </Badge>
                                {c.isRepeat && (
                                  <Badge className="bg-red-100 text-red-800 border-red-200">
                                    Repeat{c.reopenedCount ? ` ×${c.reopenedCount}` : ''}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {c.csat ? (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                  {c.csat}
                                </span>
                              ) : (
                                '—'
                              )}
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

          {/* ---- By Source Team tab ---- */}
          <TabsContent value="bySource">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Complaints by Source Team</CardTitle>
                </CardHeader>
                <CardContent>
                  {bySourceQuery.isLoading ? (
                    <TableSkeleton rows={5} cols={1} />
                  ) : bySourceQuery.isError ? (
                    <ErrorState message="Failed to load report." onRetry={() => bySourceQuery.refetch()} />
                  ) : teams.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm">
                      No complaints in this date range.
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teams} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="sourceTeamName"
                            tick={{ fontSize: 12 }}
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="total" name="Complaints" radius={[6, 6, 0, 0]}>
                            {teams.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {!bySourceQuery.isLoading && !bySourceQuery.isError && teams.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Source team breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source Team</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Repeats</TableHead>
                            <TableHead className="text-right">Repeat Rate</TableHead>
                            <TableHead className="text-right">Resolved</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teams.map((t) => (
                            <TableRow key={t.sourceTeamId}>
                              <TableCell>
                                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                                  {t.sourceTeamName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{t.total ?? 0}</TableCell>
                              <TableCell className="text-right">{t.repeats ?? 0}</TableCell>
                              <TableCell className="text-right">
                                {t.repeatRate != null ? `${Math.round(t.repeatRate)}%` : '—'}
                              </TableCell>
                              <TableCell className="text-right text-green-700">{t.resolved ?? 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ---- New Complaint dialog ---- */}
      <NewComplaintDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        departments={departments}
        submitting={createMutation.isPending}
        onSubmit={(body) => createMutation.mutate(body)}
      />

      {/* ---- Manage dialog ---- */}
      <ManageComplaintDialog
        complaint={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        submitting={updateMutation.isPending}
        onSubmit={(body) => updateMutation.mutate(body)}
      />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }) {
  const tones = {
    orange: 'from-amber-500 to-orange-600',
    amber: 'from-amber-400 to-amber-600',
    green: 'from-emerald-500 to-green-600',
    red: 'from-rose-500 to-red-600',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${tones[tone] || tones.orange} flex items-center justify-center shadow-md shadow-orange-500/20`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewComplaintDialog({ open, onOpenChange, departments, submitting, onSubmit }) {
  const [form, setForm] = useState({
    customer: '',
    channel: 'phone',
    description: '',
    sourceTeamId: '',
    csat: '',
  });

  // reset when opened
  React.useEffect(() => {
    if (open) {
      setForm({ customer: '', channel: 'phone', description: '', sourceTeamId: '', csat: '' });
    }
  }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.customer.trim()) return toast.error('Customer is required');
    if (!form.description.trim()) return toast.error('Description is required');
    if (!form.sourceTeamId) return toast.error('Source team is required');
    const team = departments.find((d) => String(d.id) === String(form.sourceTeamId));
    const body = {
      customer: form.customer.trim(),
      channel: form.channel,
      description: form.description.trim(),
      sourceTeamId: form.sourceTeamId,
      sourceTeamName: team?.name || '',
    };
    if (form.csat) body.csat = Number(form.csat);
    onSubmit(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Complaint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Input
              value={form.customer}
              onChange={(e) => set('customer', e.target.value)}
              placeholder="Customer name or phone"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => set('channel', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>CSAT (1–5, optional)</Label>
              <Select value={form.csat} onValueChange={(v) => set('csat', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Source Team</Label>
            <Select value={form.sourceTeamId} onValueChange={(v) => set('sourceTeamId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select the team this complaint came from" />
              </SelectTrigger>
              <SelectContent>
                {departments.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-slate-500">No teams available</div>
                ) : (
                  departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What went wrong?"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            {submitting ? 'Saving…' : 'Log Complaint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageComplaintDialog({ complaint, onOpenChange, submitting, onSubmit }) {
  const [form, setForm] = useState({
    status: 'open',
    rootCause: '',
    fix: '',
    resolutionTime: '',
    csat: '',
  });

  React.useEffect(() => {
    if (complaint) {
      setForm({
        status: complaint.status || 'open',
        rootCause: complaint.rootCause || '',
        fix: complaint.fix || '',
        resolutionTime: complaint.resolutionTime != null ? String(complaint.resolutionTime) : '',
        csat: complaint.csat != null ? String(complaint.csat) : '',
      });
    }
  }, [complaint]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const body = {
      id: complaint.id,
      status: form.status,
      rootCause: form.rootCause.trim(),
      fix: form.fix.trim(),
    };
    if (form.resolutionTime !== '') body.resolutionTime = Number(form.resolutionTime);
    if (form.csat !== '') body.csat = Number(form.csat);
    onSubmit(body);
  };

  return (
    <Dialog open={!!complaint} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Complaint</DialogTitle>
        </DialogHeader>
        {complaint && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-sm space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{complaint.customer || '—'}</span>
                {complaint.sourceTeamName && (
                  <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                    {complaint.sourceTeamName}
                  </Badge>
                )}
                {complaint.isRepeat && (
                  <Badge className="bg-red-100 text-red-800 border-red-200">Repeat</Badge>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-300">{complaint.description || '—'}</p>
              <p className="text-xs text-slate-400">{fmtDate(complaint.date)}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Root Cause</Label>
              <Textarea
                value={form.rootCause}
                onChange={(e) => set('rootCause', e.target.value)}
                placeholder="Why did this happen?"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fix</Label>
              <Textarea
                value={form.fix}
                onChange={(e) => set('fix', e.target.value)}
                placeholder="What was done to resolve / prevent it?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Resolution Time (hrs)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.resolutionTime}
                  onChange={(e) => set('resolutionTime', e.target.value)}
                  placeholder="e.g. 4"
                />
              </div>
              <div className="space-y-1.5">
                <Label>CSAT (1–5)</Label>
                <Select value={form.csat} onValueChange={(v) => set('csat', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

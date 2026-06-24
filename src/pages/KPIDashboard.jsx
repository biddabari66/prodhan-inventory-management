import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Target, TrendingUp, AlertTriangle, Award, Plus, Pencil, Trash2, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { StatGridSkeleton, TableSkeleton, ErrorState } from '@/components/common/Skeletons';

const PERIODS = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
const scoreColor = (s) => (s >= 80 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-rose-600');
const scoreBar = (s) => (s >= 80 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-rose-500');

const emptyForm = { name: '', metric: '', employeeId: '', target: 0, actual: 0, weight: 1, period: 'MONTHLY', description: '' };

export default function KPIDashboard() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const params = period === 'all' ? {} : { period };

  const { data: dashboard, isLoading: dashLoading, isError, refetch } = useQuery({
    queryKey: ['kpi-dashboard', period],
    queryFn: () => api.get('/kpis/dashboard', { params }).then((r) => r.data.data),
  });
  const { data: kpis = [], isLoading: listLoading } = useQuery({
    queryKey: ['kpis', period],
    queryFn: () => api.get('/kpis', { params }).then((r) => r.data.data || []),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['kpi-employees'],
    queryFn: () => User.list(),
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['kpi-dashboard'] });
    qc.invalidateQueries({ queryKey: ['kpis'] });
  };

  const saveMut = useMutation({
    mutationFn: (payload) =>
      editing ? api.patch(`/kpis/${editing.id}`, payload) : api.post('/kpis', payload),
    onSuccess: () => { toast.success(editing ? 'KPI updated' : 'KPI created'); setDialogOpen(false); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to save KPI'),
  });
  const recordMut = useMutation({
    mutationFn: ({ id, actual }) => api.post(`/kpis/${id}/record`, { actual }),
    onSuccess: () => { toast.success('Progress recorded'); invalidate(); },
    onError: () => toast.error('Failed to record progress'),
  });
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/kpis/${id}`),
    onSuccess: () => { toast.success('KPI deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete'),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (k) => {
    setEditing(k);
    setForm({ name: k.name, metric: k.metric || '', employeeId: k.employeeId || '', target: k.target, actual: k.actual, weight: k.weight, period: k.period, description: k.description || '' });
    setDialogOpen(true);
  };
  const submit = () => {
    if (!form.name.trim()) return toast.error('KPI name is required');
    const emp = employees.find((e) => e.id === form.employeeId);
    saveMut.mutate({
      ...form,
      target: Number(form.target) || 0,
      actual: Number(form.actual) || 0,
      weight: Number(form.weight) || 1,
      employeeId: form.employeeId || null,
      employeeName: emp ? (emp.full_name || emp.display_name || emp.name || emp.email) : null,
    });
  };

  const firstLoad = dashLoading && !dashboard;

  return (
    <div className="space-y-5 p-1">
      <PageHeader
        icon={Gauge}
        title="Employee KPI Tracking"
        subtitle="Set targets, record progress, and track performance across your team"
        actions={
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All periods</SelectItem>
                {PERIODS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-1" /> New KPI</Button>
          </div>
        }
      />

      {isError ? (
        <ErrorState message="Couldn't load KPI data." onRetry={refetch} />
      ) : firstLoad ? (
        <StatGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={Award} label="Overall Score" value={`${dashboard?.overallScore ?? 0}%`} sub="weighted attainment" tone="orange" index={0} />
          <StatCard icon={Target} label="Total KPIs" value={dashboard?.totalKpis ?? 0} sub="being tracked" tone="blue" index={1} />
          <StatCard icon={TrendingUp} label="On Track" value={dashboard?.onTrack ?? 0} sub="≥ 80% attainment" tone="green" index={2} />
          <StatCard icon={AlertTriangle} label="At Risk" value={dashboard?.atRisk ?? 0} sub="< 80% attainment" tone="red" index={3} />
        </div>
      )}

      {/* Employee scorecards */}
      {!firstLoad && dashboard?.employees?.length > 0 && (
        <Card className="border-2 border-slate-200">
          <CardHeader><CardTitle className="text-base">Team Scorecards</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboard.employees.map((e) => (
              <div key={e.employeeId || 'unassigned'} className="rounded-xl border-2 border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 truncate">{e.employeeName}</p>
                  <span className={`text-lg font-extrabold ${scoreColor(e.score)}`}>{e.score}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${scoreBar(e.score)}`} style={{ width: `${Math.min(e.score, 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{e.count} KPIs · {e.onTrack} on track · {e.atRisk} at risk</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* KPI list */}
      <Card className="border-2 border-slate-200">
        <CardHeader><CardTitle className="text-base">All KPIs</CardTitle></CardHeader>
        <CardContent>
          {listLoading && kpis.length === 0 ? (
            <TableSkeleton rows={6} cols={5} />
          ) : kpis.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No KPIs yet. Click “New KPI” to add your first target.</div>
          ) : (
            <div className="space-y-2">
              {kpis.map((k) => (
                <div key={k.id} className="flex flex-col md:flex-row md:items-center gap-3 rounded-xl border-2 border-slate-100 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 truncate">{k.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{k.period}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{k.employeeName || 'Unassigned'}{k.metric ? ` · ${k.metric}` : ''}</p>
                  </div>
                  <div className="w-full md:w-56">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">{k.actual} / {k.target}</span>
                      <span className={`font-bold ${scoreColor(k.attainment)}`}>{k.attainment}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${scoreBar(k.attainment)}`} style={{ width: `${Math.min(k.attainment, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      defaultValue={k.actual}
                      className="w-20 h-8"
                      onKeyDown={(ev) => { if (ev.key === 'Enter') recordMut.mutate({ id: k.id, actual: Number(ev.target.value) }); }}
                      title="Type a value and press Enter to record progress"
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(k)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm('Delete this KPI?')) delMut.mutate(k.id); }}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit KPI' : 'New KPI'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">KPI Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly Sales Target" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Employee</label>
                <Select value={form.employeeId || 'none'} onValueChange={(v) => setForm({ ...form, employeeId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name || e.display_name || e.name || e.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Period</label>
                <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Target</label>
                <Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Actual</label>
                <Input type="number" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Weight</label>
                <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Metric / unit</label>
              <Input value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} placeholder="e.g. BDT, calls, deals" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={submit} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving…' : 'Save KPI'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

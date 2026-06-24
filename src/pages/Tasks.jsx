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
import { ClipboardList, Plus, CheckCircle2, Clock, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { StatGridSkeleton, ErrorState, TableSkeleton } from '@/components/common/Skeletons';

const STATUSES = [
  { key: 'TODO', label: 'To Do', tone: 'bg-slate-100 text-slate-700' },
  { key: 'IN_PROGRESS', label: 'In Progress', tone: 'bg-blue-100 text-blue-700' },
  { key: 'IN_REVIEW', label: 'In Review', tone: 'bg-amber-100 text-amber-700' },
  { key: 'DONE', label: 'Done', tone: 'bg-emerald-100 text-emerald-700' },
];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const prioTone = { LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-sky-100 text-sky-700', HIGH: 'bg-amber-100 text-amber-700', URGENT: 'bg-rose-100 text-rose-700' };
const nextStatus = (s) => ({ TODO: 'IN_PROGRESS', IN_PROGRESS: 'IN_REVIEW', IN_REVIEW: 'DONE', DONE: 'DONE' }[s]);

const emptyForm = { title: '', description: '', assigneeId: '', priority: 'MEDIUM', dueDate: '' };

export default function Tasks() {
  const qc = useQueryClient();
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const params = filterAssignee === 'all' ? {} : { assigneeId: filterAssignee };

  const { data: tasks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks', filterAssignee],
    queryFn: () => api.get('/tasks', { params }).then((r) => r.data.data || []),
  });
  const { data: stats } = useQuery({
    queryKey: ['task-stats', filterAssignee],
    queryFn: () => api.get('/tasks/stats', { params }).then((r) => r.data.data),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['task-employees'],
    queryFn: () => User.list(),
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['task-stats'] });
  };

  const saveMut = useMutation({
    mutationFn: (payload) => api.post('/tasks', payload),
    onSuccess: () => { toast.success('Task created'); setDialogOpen(false); setForm(emptyForm); invalidate(); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to create task'),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}`, { status }),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update task'),
  });
  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => { toast.success('Task deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete'),
  });

  const submit = () => {
    if (!form.title.trim()) return toast.error('Task title is required');
    const emp = employees.find((e) => e.id === form.assigneeId);
    saveMut.mutate({
      ...form,
      assigneeId: form.assigneeId || null,
      assigneeName: emp ? (emp.full_name || emp.display_name || emp.name || emp.email) : null,
      dueDate: form.dueDate || null,
    });
  };

  const overdue = (t) => t.dueDate && t.status !== 'DONE' && t.status !== 'CANCELLED' && new Date(t.dueDate) < new Date();
  const firstLoad = isLoading && tasks.length === 0;

  return (
    <div className="space-y-5 p-1">
      <PageHeader
        icon={ClipboardList}
        title="Task Management"
        subtitle="Create, assign and track tasks across your team"
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All assignees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name || e.display_name || e.name || e.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-1" /> New Task</Button>
          </div>
        }
      />

      {isError ? (
        <ErrorState message="Couldn't load tasks." onRetry={refetch} />
      ) : !stats ? (
        <StatGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={ClipboardList} label="Total Tasks" value={stats.total} sub={`${stats.active} active`} tone="blue" index={0} />
          <StatCard icon={CheckCircle2} label="Completed" value={stats.done} sub={`${stats.completionRate}% completion`} tone="green" index={1} />
          <StatCard icon={Clock} label="In Progress" value={stats.byStatus?.IN_PROGRESS ?? 0} sub="being worked on" tone="orange" index={2} />
          <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} sub="past due date" tone="red" index={3} />
        </div>
      )}

      {/* Board */}
      {firstLoad ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {STATUSES.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${col.tone}`}>{col.label}</span>
                  <span className="text-xs text-slate-400">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {colTasks.map((t) => (
                    <div key={t.id} className="rounded-lg border-2 border-slate-100 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-slate-800">{t.title}</p>
                        <Badge className={`text-[10px] ${prioTone[t.priority] || ''}`} variant="secondary">{t.priority}</Badge>
                      </div>
                      {t.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{t.description}</p>}
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate">{t.assigneeName || 'Unassigned'}</span>
                        {t.dueDate && (
                          <span className={`flex items-center gap-1 ${overdue(t) ? 'text-rose-600 font-semibold' : ''}`}>
                            <Calendar className="w-3 h-3" />{new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        {t.status !== 'DONE' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
                            onClick={() => statusMut.mutate({ id: t.id, status: nextStatus(t.status) })}>
                            Move to {STATUSES.find((s) => s.key === nextStatus(t.status))?.label}
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm('Delete this task?')) delMut.mutate(t.id); }}>
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No tasks</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-assignee report */}
      {stats?.assignees?.length > 0 && (
        <Card className="border-2 border-slate-200">
          <CardHeader><CardTitle className="text-base">Per-Employee Report</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.assignees.map((a) => (
              <div key={a.assigneeId || 'unassigned'} className="flex items-center gap-3 rounded-lg border-2 border-slate-100 p-3">
                <span className="flex-1 font-medium text-slate-800 truncate">{a.assigneeName}</span>
                <span className="text-xs text-slate-500">{a.total} tasks</span>
                <span className="text-xs text-emerald-600">{a.done} done</span>
                {a.overdue > 0 && <span className="text-xs text-rose-600">{a.overdue} overdue</span>}
                <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${a.completionRate}%` }} />
                </div>
                <span className="text-xs font-bold w-10 text-right">{a.completionRate}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500">Assign to</label>
                <Select value={form.assigneeId || 'none'} onValueChange={(v) => setForm({ ...form, assigneeId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name || e.display_name || e.name || e.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Priority</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Due date</label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={submit} disabled={saveMut.isPending}>{saveMut.isPending ? 'Creating…' : 'Create Task'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

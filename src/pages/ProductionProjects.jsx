import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/common/PageHeader';
import { TableSkeleton, StatGridSkeleton, ErrorState } from '@/components/common/Skeletons';
import {
  ClipboardList, Plus, Palette, Video, Camera, PenLine, Globe, Layers,
  ChevronLeft, ChevronRight, ExternalLink, Trash2, Pencil, CalendarDays,
  User, Clock, CheckCircle2, Eye, ListTodo, LayoutGrid, RotateCcw, Award,
} from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPES = [
  { value: 'graphic', label: 'Graphic', icon: Palette },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'photo', label: 'Photo', icon: Camera },
  { value: 'copywriting', label: 'Copywriting', icon: PenLine },
  { value: 'web', label: 'Web', icon: Globe },
  { value: 'other', label: 'Other', icon: Layers },
];

const TYPE_MAP = TYPES.reduce((acc, t) => { acc[t.value] = t; return acc; }, {});

const STATUSES = [
  { value: 'submitted', label: 'Submitted', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200', col: 'border-t-slate-400' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200', col: 'border-t-blue-500' },
  { value: 'review', label: 'Review', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', col: 'border-t-amber-500' },
  { value: 'revision', label: 'Revision', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200', col: 'border-t-orange-500' },
  { value: 'approved', label: 'Approved', dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 border-violet-200', col: 'border-t-violet-500' },
  { value: 'done', label: 'Done', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 border-green-200', col: 'border-t-green-500' },
];

const STATUS_MAP = STATUSES.reduce((acc, s) => { acc[s.value] = s; return acc; }, {});
const STATUS_ORDER = STATUSES.map((s) => s.value);

/* ------------------------------------------------------------------ */
/* Date helpers (local YYYY-MM-DD)                                    */
/* ------------------------------------------------------------------ */

const toISODate = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

const presetRange = (preset) => {
  const now = new Date();
  if (preset === 'today') {
    const t = toISODate(now);
    return { from: t, to: t };
  }
  if (preset === 'week') {
    const day = now.getDay(); // 0=Sun
    const diff = (day + 6) % 7; // Monday start
    const start = new Date(now); start.setDate(now.getDate() - diff);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { from: toISODate(start), to: toISODate(end) };
  }
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toISODate(start), to: toISODate(end) };
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const isOverdue = (project) =>
  project.dueDate &&
  project.status !== 'done' &&
  project.status !== 'approved' &&
  new Date(project.dueDate) < new Date(new Date().toDateString());

/* Defensive shape readers */
const userName = (u) => u?.displayName || u?.full_name || u?.name || u?.email || 'Unknown';
const asArray = (x) => (Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : []);

/* ------------------------------------------------------------------ */
/* New / Edit project dialog                                          */
/* ------------------------------------------------------------------ */

function ProjectFormDialog({ open, onOpenChange, users, onSubmit, submitting, initial }) {
  const blank = {
    title: '', type: 'graphic', assigneeId: '',
    workDate: toISODate(new Date()), dueDate: '',
    deliverableUrl: '', description: '',
  };
  const [form, setForm] = useState(blank);

  // Re-seed the form whenever the dialog opens.
  React.useEffect(() => {
    if (open) {
      setForm(initial ? {
        title: initial.title || '',
        type: initial.type || 'graphic',
        assigneeId: initial.assigneeId ? String(initial.assigneeId) : '',
        workDate: initial.workDate ? toISODate(new Date(initial.workDate)) : toISODate(new Date()),
        dueDate: initial.dueDate ? toISODate(new Date(initial.dueDate)) : '',
        deliverableUrl: initial.deliverableUrl || '',
        description: initial.description || '',
      } : blank);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.assigneeId) { toast.error('Please choose an assignee'); return; }
    const assignee = users.find((u) => String(u.id) === String(form.assigneeId));
    onSubmit({
      ...form,
      title: form.title.trim(),
      assigneeId: form.assigneeId,
      assigneeName: assignee ? userName(assignee) : undefined,
      dueDate: form.dueDate || null,
      deliverableUrl: form.deliverableUrl.trim() || null,
      description: form.description.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-orange-600" />
            {initial ? 'Edit Project' : 'New Project'}
          </DialogTitle>
          <DialogDescription>
            {initial ? 'Update the project details.' : 'Submit a new production project / work item.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => set('title')(e.target.value)}
              placeholder="e.g. Eid campaign hero banner"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={set('type')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2"><t.icon className="w-4 h-4" />{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assignee *</Label>
              <Select value={form.assigneeId} onValueChange={set('assigneeId')}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {users.length === 0 && <SelectItem value="__none" disabled>No members found</SelectItem>}
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{userName(u)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Work Date</Label>
              <Input type="date" value={form.workDate} onChange={(e) => set('workDate')(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate')(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Deliverable URL</Label>
            <Input
              value={form.deliverableUrl}
              onChange={(e) => set('deliverableUrl')(e.target.value)}
              placeholder="https://drive.google.com/…"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              placeholder="Brief, references, requirements…"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
            {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Detail / manage dialog (status, progress, revision notes, delete)  */
/* ------------------------------------------------------------------ */

function ProjectDetailDialog({ project, onOpenChange, onPatch, onEdit, onDelete, patching }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('submitted');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (project) {
      setProgress(Number(project.progress) || 0);
      setStatus(project.status || 'submitted');
      setRevisionNotes(project.revisionNotes || '');
    }
  }, [project]);

  if (!project) return null;
  const type = TYPE_MAP[project.type] || TYPE_MAP.other;
  const TypeIcon = type.icon;

  const save = () => onPatch(project.id, { status, progress, revisionNotes: revisionNotes || null });

  return (
    <>
      <Dialog open={!!project} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <TypeIcon className="w-5 h-5 text-orange-600 shrink-0" />
              <span className="truncate">{project.title}</span>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline">{type.label}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <User className="w-3 h-3" />{project.assigneeName || '—'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays className="w-3 h-3" />Due {fmtDate(project.dueDate)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {project.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                {project.description}
              </p>
            )}

            {project.deliverableUrl && (
              <a
                href={project.deliverableUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" /> Open deliverable
              </a>
            )}

            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Progress</Label>
                <span className="text-sm font-semibold text-orange-600">{progress}%</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Slider
                  value={[progress]} min={0} max={100} step={5}
                  onValueChange={(v) => setProgress(v[0])} className="flex-1"
                />
                <Input
                  type="number" min={0} max={100} value={progress}
                  onChange={(e) => setProgress(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <Label>Revision Notes</Label>
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Feedback for the review → revision loop…"
                rows={3} className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 sm:mr-auto">
              <Button variant="outline" size="sm" onClick={() => onEdit(project)}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
            <Button onClick={save} disabled={patching} className="bg-orange-600 hover:bg-orange-700">
              {patching ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              “{project.title}” will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmDelete(false); onDelete(project.id); }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Kanban card                                                       */
/* ------------------------------------------------------------------ */

function KanbanCard({ project, onOpen, onMove }) {
  const type = TYPE_MAP[project.type] || TYPE_MAP.other;
  const TypeIcon = type.icon;
  const idx = STATUS_ORDER.indexOf(project.status);
  const progress = Number(project.progress) || 0;
  const overdue = isOverdue(project);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md transition-shadow">
      <button onClick={() => onOpen(project)} className="w-full text-left">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-md bg-orange-50 dark:bg-orange-950/40 p-1 text-orange-600">
            <TypeIcon className="w-4 h-4" />
          </span>
          <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">{project.title}</p>
        </div>
      </button>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <User className="w-3 h-3" />
        <span className="truncate">{project.assigneeName || '—'}</span>
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-xs">
        <CalendarDays className="w-3 h-3 text-slate-400" />
        <span className={overdue ? 'font-semibold text-rose-600' : 'text-slate-500'}>
          {fmtDate(project.dueDate)}{overdue ? ' • overdue' : ''}
        </span>
      </div>

      <div className="mt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${progress}%` }} />
        </div>
        <span className="mt-0.5 block text-[10px] text-slate-400">{progress}%</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-1">
        {project.deliverableUrl ? (
          <a
            href={project.deliverableUrl} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Link
          </a>
        ) : <span />}
        <div className="flex items-center gap-1">
          <Button
            size="icon" variant="ghost" className="h-6 w-6"
            disabled={idx <= 0} title="Revert"
            onClick={() => onMove(project, STATUS_ORDER[idx - 1])}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-6 w-6"
            disabled={idx >= STATUS_ORDER.length - 1} title="Advance"
            onClick={() => onMove(project, STATUS_ORDER[idx + 1])}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                         */
/* ------------------------------------------------------------------ */

export default function ProductionProjects() {
  const queryClient = useQueryClient();

  const [range, setRange] = useState(() => presetRange('month'));
  const [activePreset, setActivePreset] = useState('month');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [mine, setMine] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [detailProject, setDetailProject] = useState(null);

  const applyPreset = (preset) => { setActivePreset(preset); setRange(presetRange(preset)); };
  const setRangeField = (field) => (e) => {
    setActivePreset(null);
    setRange((r) => ({ ...r, [field]: e.target.value }));
  };

  /* ---- Users ---- */
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'production-projects'],
    queryFn: async () => {
      try {
        const res = await api.get('/users', { params: { limit: 200 } });
        return asArray(res?.data);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  /* ---- Filter params shared by list + stats ---- */
  const listParams = useMemo(() => {
    const p = { dateFrom: range.from, dateTo: range.to };
    if (statusFilter !== 'all') p.status = statusFilter;
    if (typeFilter !== 'all') p.type = typeFilter;
    if (assigneeFilter !== 'all') p.assigneeId = assigneeFilter;
    if (mine) p.mine = true;
    return p;
  }, [range, statusFilter, typeFilter, assigneeFilter, mine]);

  /* ---- Projects list ---- */
  const projectsQuery = useQuery({
    queryKey: ['production-projects', listParams],
    queryFn: async () => {
      try {
        const res = await api.get('/production-projects', { params: listParams });
        return { data: asArray(res?.data), total: res?.data?.total ?? 0 };
      } catch (err) {
        if (err?.response?.status === 404) return { data: [], total: 0, __missing: true };
        throw err;
      }
    },
    keepPreviousData: true,
  });

  /* ---- Stats ---- */
  const statsQuery = useQuery({
    queryKey: ['production-projects-stats', range.from, range.to],
    queryFn: async () => {
      try {
        const res = await api.get('/production-projects/stats', {
          params: { dateFrom: range.from, dateTo: range.to },
        });
        return res?.data?.data || res?.data || {};
      } catch {
        return {};
      }
    },
  });

  const projects = projectsQuery.data?.data || [];
  const stats = statsQuery.data || {};

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['production-projects'] });
    queryClient.invalidateQueries({ queryKey: ['production-projects-stats'] });
  }, [queryClient]);

  /* ---- Mutations ---- */
  const createMut = useMutation({
    mutationFn: (payload) => api.post('/production-projects', payload),
    onSuccess: () => { toast.success('Project created'); setShowNew(false); invalidate(); },
    onError: (e) => toast.error('Failed to create: ' + (e?.response?.data?.message || e.message)),
  });

  const patchMut = useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/production-projects/${id}`, patch),
    onSuccess: () => { toast.success('Updated'); invalidate(); },
    onError: (e) => toast.error('Failed to update: ' + (e?.response?.data?.message || e.message)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/production-projects/${id}`),
    onSuccess: () => { toast.success('Deleted'); setDetailProject(null); invalidate(); },
    onError: (e) => toast.error('Failed to delete: ' + (e?.response?.data?.message || e.message)),
  });

  const handlePatch = (id, patch) => {
    patchMut.mutate({ id, patch }, { onSuccess: () => setDetailProject(null) });
  };
  const handleMove = (project, nextStatus) => {
    if (!nextStatus) return;
    patchMut.mutate({ id: project.id, patch: { status: nextStatus } });
  };

  /* ---- Derived stats (fall back to client-side computation) ---- */
  const byStatusCount = useMemo(() => {
    const fromApi = stats.byStatus && typeof stats.byStatus === 'object';
    const counts = {};
    STATUS_ORDER.forEach((s) => { counts[s] = fromApi ? (stats.byStatus[s] || 0) : 0; });
    if (!fromApi) projects.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [stats, projects]);

  const totalCount = stats.total ?? projectsQuery.data?.total ?? projects.length;
  const inProgressCount = byStatusCount.in_progress || 0;
  const inReviewCount = (byStatusCount.review || 0) + (byStatusCount.revision || 0);
  const doneCount = (byStatusCount.approved || 0) + (byStatusCount.done || 0);

  const byAssignee = Array.isArray(stats.byAssignee) ? stats.byAssignee : [];

  /* ---- Group projects into columns ---- */
  const columns = useMemo(() => {
    const map = {};
    STATUS_ORDER.forEach((s) => { map[s] = []; });
    projects.forEach((p) => { (map[p.status] || (map[p.status] = [])).push(p); });
    return map;
  }, [projects]);

  const isMissing = projectsQuery.data?.__missing;

  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        <PageHeader
          icon={ClipboardList}
          title="Production Projects"
          subtitle="Submit and track daily design, video, photo & copy work"
          actions={
            <Button onClick={() => setShowNew(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-1.5" /> New Project
            </Button>
          }
        />

        {/* Filters */}
        <Card className="border-orange-100 dark:border-orange-900/40">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs text-slate-500">From</Label>
                <Input type="date" value={range.from} onChange={setRangeField('from')} className="mt-1 w-40" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">To</Label>
                <Input type="date" value={range.to} onChange={setRangeField('to')} className="mt-1 w-40" />
              </div>
              <div className="flex gap-1.5">
                {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(([k, label]) => (
                  <Button
                    key={k} size="sm"
                    variant={activePreset === k ? 'default' : 'outline'}
                    className={activePreset === k ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    onClick={() => applyPreset(k)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs text-slate-500">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Assignee</Label>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="mt-1 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{userName(u)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant={mine ? 'default' : 'outline'}
                className={mine ? 'bg-orange-600 hover:bg-orange-700' : ''}
                onClick={() => setMine((m) => !m)}
              >
                <User className="w-4 h-4 mr-1.5" /> My work
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {statsQuery.isLoading ? (
          <StatGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="grid grid-cols-2 lg:col-span-2 gap-3 md:gap-4">
              <StatTile icon={ListTodo} label="Total" value={totalCount} tint="slate" />
              <StatTile icon={Clock} label="In Progress" value={inProgressCount} tint="blue" />
              <StatTile icon={Eye} label="In Review" value={inReviewCount} tint="amber" />
              <StatTile icon={CheckCircle2} label="Approved / Done" value={doneCount} tint="green" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-orange-600" /> Productivity by member
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 max-h-44 overflow-y-auto">
                {byAssignee.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No data for this range</p>
                ) : (
                  <ul className="space-y-2">
                    {byAssignee.map((a) => {
                      const done = a.done || 0;
                      const tot = a.total || 0;
                      const pct = tot ? Math.round((done / tot) * 100) : 0;
                      return (
                        <li key={a.assigneeId || a.assigneeName} className="text-xs">
                          <div className="flex justify-between">
                            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{a.assigneeName || 'Unknown'}</span>
                            <span className="text-slate-500">{done}/{tot}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Board / List */}
        {projectsQuery.isError && !isMissing ? (
          <ErrorState message="Failed to load projects." onRetry={() => projectsQuery.refetch()} />
        ) : projectsQuery.isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : projects.length === 0 ? (
          <EmptyState onNew={() => setShowNew(true)} missing={isMissing} />
        ) : (
          <Tabs defaultValue="board" className="space-y-4">
            <TabsList>
              <TabsTrigger value="board"><LayoutGrid className="w-4 h-4 mr-1.5" /> Board</TabsTrigger>
              <TabsTrigger value="list"><ListTodo className="w-4 h-4 mr-1.5" /> List</TabsTrigger>
            </TabsList>

            {/* Kanban */}
            <TabsContent value="board">
              <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 overflow-x-auto pb-2">
                {STATUSES.map((s) => (
                  <div key={s.value} className={`rounded-xl border-t-4 ${s.col} border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 flex flex-col`}>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
                      </span>
                      <Badge variant="secondary" className="text-xs">{columns[s.value]?.length || 0}</Badge>
                    </div>
                    <div className="flex-1 space-y-2 px-2 pb-2 min-h-[60px]">
                      {(columns[s.value] || []).map((p) => (
                        <KanbanCard key={p.id} project={p} onOpen={setDetailProject} onMove={handleMove} />
                      ))}
                      {(columns[s.value] || []).length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-4">—</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* List */}
            <TabsContent value="list">
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-40">Progress</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((p) => {
                        const type = TYPE_MAP[p.type] || TYPE_MAP.other;
                        const TypeIcon = type.icon;
                        const st = STATUS_MAP[p.status] || STATUS_MAP.submitted;
                        const progress = Number(p.progress) || 0;
                        const overdue = isOverdue(p);
                        return (
                          <TableRow key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <TableCell className="font-medium max-w-[220px]">
                              <button onClick={() => setDetailProject(p)} className="text-left hover:text-orange-600 truncate block w-full">
                                {p.title}
                              </button>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 text-sm">
                                <TypeIcon className="w-4 h-4 text-slate-500" />{type.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{p.assigneeName || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={st.badge}>{st.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 w-9 text-right">{progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className={`text-sm ${overdue ? 'font-semibold text-rose-600' : ''}`}>
                              {fmtDate(p.dueDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {p.deliverableUrl && (
                                  <a href={p.deliverableUrl} target="_blank" rel="noreferrer" className="text-orange-600" title="Deliverable">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailProject(p)} title="Manage">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* New project */}
      <ProjectFormDialog
        open={showNew}
        onOpenChange={setShowNew}
        users={users}
        submitting={createMut.isPending}
        onSubmit={(payload) => createMut.mutate(payload)}
      />

      {/* Edit project */}
      <ProjectFormDialog
        open={!!editProject}
        onOpenChange={(o) => { if (!o) setEditProject(null); }}
        users={users}
        initial={editProject}
        submitting={patchMut.isPending}
        onSubmit={(payload) =>
          patchMut.mutate(
            { id: editProject.id, patch: payload },
            { onSuccess: () => { setEditProject(null); setDetailProject(null); } },
          )
        }
      />

      {/* Detail / manage */}
      <ProjectDetailDialog
        project={detailProject}
        onOpenChange={(o) => { if (!o) setDetailProject(null); }}
        onPatch={handlePatch}
        onEdit={(p) => { setDetailProject(null); setEditProject(p); }}
        onDelete={(id) => deleteMut.mutate(id)}
        patching={patchMut.isPending}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                      */
/* ------------------------------------------------------------------ */

const TINTS = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  green: 'bg-green-100 text-green-600',
};

function StatTile({ icon: Icon, label, value, tint }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${TINTS[tint] || TINTS.slate}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onNew, missing }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-500">
          <RotateCcw className="w-7 h-7" />
        </div>
        <p className="font-medium text-slate-700 dark:text-slate-200">
          {missing ? 'Production projects are not available yet' : 'No projects in this range'}
        </p>
        <p className="text-sm text-slate-500 max-w-sm">
          {missing
            ? 'The module may still be deploying. Try again shortly, or create the first project.'
            : 'Adjust your filters or date range, or submit a new project to get started.'}
        </p>
        <Button onClick={onNew} className="bg-orange-600 hover:bg-orange-700 mt-1">
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </CardContent>
    </Card>
  );
}

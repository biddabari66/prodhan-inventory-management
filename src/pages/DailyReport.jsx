import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { TableSkeleton, ErrorState, Spinner } from '@/components/common/Skeletons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ClipboardList, Lock, CheckCircle2, Save } from 'lucide-react';

// ---------------------------------------------------------------------------
// Bilingual labels. English is the default and is always complete; bn is the
// Bangla translation. lbl(key) below picks the active language safely.
// ---------------------------------------------------------------------------
const LABELS = {
  pageTitle: { en: 'Daily Progress Report', bn: 'দৈনিক অগ্রগতি রিপোর্ট' },
  pageSubtitle: { en: "Submit today's progress and KPIs", bn: 'আজকের অগ্রগতি ও কেপিআই জমা দিন' },
  bangla: { en: 'বাংলা', bn: 'বাংলা' },
  role: { en: 'Role', bn: 'ভূমিকা' },
  rolePick: { en: 'Select your role', bn: 'আপনার ভূমিকা নির্বাচন করুন' },
  date: { en: 'Date', bn: 'তারিখ' },
  kpis: { en: 'Key Performance Indicators', bn: 'মূল কর্মক্ষমতা সূচক' },
  target: { en: 'Target', bn: 'লক্ষ্যমাত্রা' },
  tasksPlanned: { en: 'Tasks Planned', bn: 'পরিকল্পিত কাজ' },
  tasksCompleted: { en: 'Tasks Completed', bn: 'সম্পন্ন কাজ' },
  blockers: { en: 'Blockers', bn: 'বাধাসমূহ' },
  helpNeeded: { en: 'Help Needed', bn: 'প্রয়োজনীয় সহায়তা' },
  tomorrowPlan: { en: "Tomorrow's Plan", bn: 'আগামীকালের পরিকল্পনা' },
  submit: { en: 'Submit Report', bn: 'রিপোর্ট জমা দিন' },
  update: { en: 'Update Report', bn: 'রিপোর্ট হালনাগাদ করুন' },
  submitting: { en: 'Saving…', bn: 'সংরক্ষণ হচ্ছে…' },
  submittedAt: { en: 'Submitted at', bn: 'জমা দেওয়া হয়েছে' },
  locked: { en: 'Locked', bn: 'লক করা' },
  lockedNotice: {
    en: "This report is locked and can no longer be edited.",
    bn: 'এই রিপোর্টটি লক করা হয়েছে এবং আর সম্পাদনা করা যাবে না।',
  },
  history: { en: 'My Recent Reports', bn: 'আমার সাম্প্রতিক রিপোর্ট' },
  noHistory: { en: 'No reports yet.', bn: 'এখনও কোনো রিপোর্ট নেই।' },
  noKpis: { en: 'No KPIs defined for this role.', bn: 'এই ভূমিকার জন্য কোনো কেপিআই নেই।' },
  status: { en: 'Status', bn: 'অবস্থা' },
  open: { en: 'Open', bn: 'খোলা' },
  saved: { en: 'Report saved.', bn: 'রিপোর্ট সংরক্ষিত হয়েছে।' },
  saveError: { en: 'Failed to save report.', bn: 'রিপোর্ট সংরক্ষণ ব্যর্থ হয়েছে।' },
};

// Role options shown in the picker.
const ROLE_OPTIONS = [
  { key: 'admission_sales', label: 'Admission / Sales' },
  { key: 'marketing_production', label: 'Marketing Production' },
  { key: 'organic_marketing', label: 'Organic Marketing' },
  { key: 'service', label: 'Service' },
  { key: 'rnd', label: 'R&D' },
  { key: 'one_stop', label: 'One Stop / Support' },
  { key: 'boibari', label: 'Boibari' },
  { key: 'prodhan', label: 'Prodhan' },
];

// Map a job_role string to a default roleKey.
function jobRoleToRoleKey(jobRole) {
  if (!jobRole) return 'admission_sales';
  const r = String(jobRole).toUpperCase();
  if (r.startsWith('SALES') || r.includes('ADMISSION')) return 'admission_sales';
  if (r === 'MARKETING_MANAGER' || r === 'MARKETING_EXECUTIVE' || r.startsWith('MARKETING')) return 'marketing_production';
  if (r.includes('SERVICE')) return 'service';
  if (r.includes('R&D') || r.includes('RND') || r === 'RESEARCH') return 'rnd';
  if (r.includes('SUPPORT') || r.includes('ONE_STOP') || r.includes('ONESTOP')) return 'one_stop';
  return 'admission_sales';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

const EMPTY_FORM = {
  tasksPlanned: '',
  tasksCompleted: '',
  blockers: '',
  helpNeeded: '',
  tomorrowPlan: '',
};

export default function DailyReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [lang, setLang] = useState('en'); // 'en' default; toggle to 'bn'
  const lbl = (key) => {
    const entry = LABELS[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  };

  const [roleKey, setRoleKey] = useState(() => jobRoleToRoleKey(user?.job_role));
  const [form, setForm] = useState(EMPTY_FORM);
  const [kpiValues, setKpiValues] = useState({}); // { [kpiKey]: string }

  const today = todayISO();

  // -- KPI definitions for the chosen role --------------------------------
  const kpiQuery = useQuery({
    queryKey: ['kpi-definitions', roleKey],
    queryFn: async () => {
      const res = await api.get('/kpi-definitions', { params: { roleKey } });
      return res?.data?.data ?? [];
    },
    enabled: !!roleKey,
  });
  const kpiDefs = kpiQuery.data ?? [];

  // -- My recent DPRs (history) ------------------------------------------
  const historyQuery = useQuery({
    queryKey: ['dpr', 'mine'],
    queryFn: async () => {
      const res = await api.get('/reporting/dpr', { params: { mine: true } });
      return res?.data?.data ?? [];
    },
  });
  const history = historyQuery.data ?? [];

  // Today's existing report (if any) derived from history.
  const todayReport = useMemo(
    () => history.find((r) => (r.date ? String(r.date).slice(0, 10) : '') === today) || null,
    [history, today],
  );
  const isLocked = !!todayReport?.isLocked;

  // Prefill the form from today's report whenever it loads/changes.
  useEffect(() => {
    if (todayReport) {
      setForm({
        tasksPlanned: todayReport.tasksPlanned || '',
        tasksCompleted: todayReport.tasksCompleted || '',
        blockers: todayReport.blockers || '',
        helpNeeded: todayReport.helpNeeded || '',
        tomorrowPlan: todayReport.tomorrowPlan || '',
      });
    }
  }, [todayReport]);

  // Prefill KPI values from today's report once KPI defs are known.
  useEffect(() => {
    const existing = todayReport?.kpiValues || {};
    const next = {};
    kpiDefs.forEach((k) => {
      const v = existing[k.kpiKey];
      next[k.kpiKey] = v === undefined || v === null ? '' : String(v);
    });
    setKpiValues(next);
  }, [todayReport, kpiDefs]);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const setKpi = (kpiKey, value) => setKpiValues((v) => ({ ...v, [kpiKey]: value }));

  // -- Submit / upsert ----------------------------------------------------
  const mutation = useMutation({
    mutationFn: async () => {
      const numericKpis = {};
      Object.entries(kpiValues).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          const n = Number(v);
          numericKpis[k] = Number.isNaN(n) ? 0 : n;
        }
      });
      const body = {
        date: today,
        tasksPlanned: form.tasksPlanned,
        tasksCompleted: form.tasksCompleted,
        kpiValues: numericKpis,
        blockers: form.blockers,
        helpNeeded: form.helpNeeded,
        tomorrowPlan: form.tomorrowPlan,
      };
      const res = await api.post('/reporting/dpr', body);
      return res?.data;
    },
    onSuccess: () => {
      toast.success(lbl('saved'));
      queryClient.invalidateQueries({ queryKey: ['dpr', 'mine'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || lbl('saveError'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLocked) return;
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title={lbl('pageTitle')}
        subtitle={lbl('pageSubtitle')}
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="lang-toggle" className="text-xs text-slate-600 dark:text-slate-300">
              {lbl('bangla')}
            </Label>
            <Switch
              id="lang-toggle"
              checked={lang === 'bn'}
              onCheckedChange={(v) => setLang(v ? 'bn' : 'en')}
            />
          </div>
        }
      />

      {/* ---------------- Today's form ---------------- */}
      <Card className="border-orange-100 dark:border-orange-900/40">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>{lbl('pageTitle')}</CardTitle>
              <CardDescription>{today}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {todayReport?.submitTimestamp && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {lbl('submittedAt')} {fmtTime(todayReport.submitTimestamp)}
                </Badge>
              )}
              {isLocked && (
                <Badge variant="destructive">
                  <Lock className="mr-1 h-3 w-3" />
                  {lbl('locked')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLocked && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <Lock className="h-4 w-4 shrink-0" />
              {lbl('lockedNotice')}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role + date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{lbl('role')}</Label>
                <Select value={roleKey} onValueChange={setRoleKey} disabled={isLocked}>
                  <SelectTrigger>
                    <SelectValue placeholder={lbl('rolePick')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{lbl('date')}</Label>
                <Input type="date" value={today} readOnly disabled />
              </div>
            </div>

            {/* KPIs */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{lbl('kpis')}</h3>
              {kpiQuery.isLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                  <Spinner size={18} /> {lbl('submitting')}
                </div>
              ) : kpiQuery.isError ? (
                <ErrorState message={lbl('saveError')} onRetry={() => kpiQuery.refetch()} />
              ) : kpiDefs.length === 0 ? (
                <p className="text-sm text-slate-500">{lbl('noKpis')}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {kpiDefs.map((k) => (
                    <div key={k.id ?? k.kpiKey} className="space-y-1.5">
                      <Label htmlFor={`kpi-${k.kpiKey}`} className="flex items-center justify-between gap-2">
                        <span>
                          {k.label}
                          {k.unit ? <span className="ml-1 text-xs text-slate-400">({k.unit})</span> : null}
                        </span>
                      </Label>
                      <Input
                        id={`kpi-${k.kpiKey}`}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={kpiValues[k.kpiKey] ?? ''}
                        onChange={(e) => setKpi(k.kpiKey, e.target.value)}
                        disabled={isLocked}
                        placeholder={k.target != null ? `${lbl('target')}: ${k.target}` : ''}
                      />
                      {k.target != null && (
                        <p className="text-xs text-slate-400">
                          {lbl('target')}: {k.target}
                          {k.unit ? ` ${k.unit}` : ''}
                          {k.direction ? ` (${k.direction})` : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Free-text fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['tasksPlanned', 'tasksPlanned'],
                ['tasksCompleted', 'tasksCompleted'],
                ['blockers', 'blockers'],
                ['helpNeeded', 'helpNeeded'],
              ].map(([name, key]) => (
                <div key={name} className="space-y-1.5">
                  <Label htmlFor={name}>{lbl(key)}</Label>
                  <Textarea
                    id={name}
                    rows={3}
                    value={form[name]}
                    onChange={(e) => setField(name, e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              ))}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tomorrowPlan">{lbl('tomorrowPlan')}</Label>
                <Textarea
                  id="tomorrowPlan"
                  rows={3}
                  value={form.tomorrowPlan}
                  onChange={(e) => setField('tomorrowPlan', e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLocked || mutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {mutation.isPending ? (
                  <><Spinner size={16} className="mr-2" /> {lbl('submitting')}</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {todayReport ? lbl('update') : lbl('submit')}</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------------- History ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{lbl('history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : historyQuery.isError ? (
            <ErrorState message={lbl('saveError')} onRetry={() => historyQuery.refetch()} />
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{lbl('noHistory')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lbl('date')}</TableHead>
                    <TableHead>{lbl('tasksCompleted')}</TableHead>
                    <TableHead>{lbl('submittedAt')}</TableHead>
                    <TableHead>{lbl('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id ?? r.date}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {r.date ? String(r.date).slice(0, 10) : '—'}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-slate-600 dark:text-slate-300">
                        {r.tasksCompleted || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-500">
                        {r.submitTimestamp ? fmtTime(r.submitTimestamp) : '—'}
                      </TableCell>
                      <TableCell>
                        {r.isLocked ? (
                          <Badge variant="destructive">
                            <Lock className="mr-1 h-3 w-3" /> {lbl('locked')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {lbl('open')}
                          </Badge>
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
    </div>
  );
}

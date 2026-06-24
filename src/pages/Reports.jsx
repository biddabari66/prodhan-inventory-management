import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, FileDown, FileSpreadsheet, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { REPORTS } from '@/components/reports/reports.config';
import { StatRow, ReportTable, ReportShell } from '@/components/reports/reportShared';

// ---- Date helpers ----
const iso = (d) => d.toISOString().slice(0, 10);
const today = () => new Date();

function presetRange(preset) {
  const now = today();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'today':
      return { from: iso(now), to: iso(now), label: 'Today' };
    case 'last7': {
      const f = new Date(now); f.setDate(now.getDate() - 6);
      return { from: iso(f), to: iso(now), label: 'Last 7 days' };
    }
    case 'thisMonth':
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)), label: 'This Month' };
    case 'lastMonth':
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)), label: 'Last Month' };
    case 'thisYear':
      return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)), label: 'This Year' };
    default:
      return null;
  }
}

// Single panel that owns exactly one report hook. Remounted (via key) when the
// active report changes, so hook order stays stable.
function ReportPanel({ report, range, registerExport }) {
  const r = report.useReport(range);

  // Expose current columns/rows/summary upward for the toolbar export buttons.
  React.useEffect(() => {
    registerExport({
      columns: r.columns,
      rows: r.rows,
      summary: r.summary,
      stats: r.stats,
      label: report.label,
    });
  }, [r.columns, r.rows, r.summary, r.stats, report.label, registerExport]);

  return (
    <ReportShell
      isLoading={r.isLoading}
      isError={r.isError}
      onRetry={r.refetch}
      softEmpty={r.softEmpty}
      softEmptyLabel={r.softEmptyLabel}
      statCount={r.stats?.length || 4}
    >
      <StatRow stats={r.stats} />
      <ReportTable columns={r.columns || []} rows={r.rows || []} />
    </ReportShell>
  );
}

export default function ReportsPage() {
  const [activeId, setActiveId] = useState(REPORTS[0].id);
  const [preset, setPreset] = useState('thisMonth');
  const initial = presetRange('thisMonth');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  // Live snapshot of the visible report for export.
  const exportRef = React.useRef({ columns: [], rows: [], summary: [], label: '' });
  const registerExport = useCallback((snap) => { exportRef.current = snap; }, []);

  const activeReport = useMemo(() => REPORTS.find((x) => x.id === activeId), [activeId]);

  const range = useMemo(() => {
    const labelMap = {
      today: 'Today', last7: 'Last 7 days', thisMonth: 'This Month',
      lastMonth: 'Last Month', thisYear: 'This Year', custom: 'Custom',
    };
    return { from, to, label: labelMap[preset] || 'Custom' };
  }, [from, to, preset]);

  const applyPreset = (p) => {
    setPreset(p);
    const r = presetRange(p);
    if (r) { setFrom(r.from); setTo(r.to); }
  };

  const companyName = (() => {
    try { return localStorage.getItem('activeCompanyName') || ''; } catch { return ''; }
  })();

  const rangeText = `${from || '—'}  to  ${to || '—'}`;

  const doExportPDF = () => {
    const snap = exportRef.current;
    if (!snap.columns?.length || !snap.rows?.length) {
      toast.error('Nothing to export — no rows in the current report.');
      return;
    }
    try {
      exportToPDF({
        title: `${snap.label} Report`,
        subtitle: `Prodhan ERP — ${range.label}`,
        columns: snap.columns.map((c) => ({ header: c.header, key: c.key, align: c.align, format: c.format })),
        rows: snap.rows,
        meta: {
          companyName,
          dateRange: `Period: ${rangeText}`,
          summary: snap.summary,
          filename: `${snap.label}_Report_${from}_${to}`,
        },
      });
      toast.success('PDF exported');
    } catch (e) {
      toast.error('PDF export failed');
    }
  };

  const doExportExcel = () => {
    const snap = exportRef.current;
    if (!snap.columns?.length || !snap.rows?.length) {
      toast.error('Nothing to export — no rows in the current report.');
      return;
    }
    try {
      // Map rows through formatters so the sheet matches what is shown on screen.
      const cols = snap.columns.map((c) => ({ header: c.header, key: c.key }));
      const rows = snap.rows.map((row) => {
        const out = {};
        snap.columns.forEach((c) => {
          const raw = row?.[c.key];
          out[c.key] = typeof c.format === 'function' ? c.format(raw, row) : raw;
        });
        return out;
      });
      const summarySheet = {
        name: 'Summary',
        columns: [{ header: 'Metric', key: 'label' }, { header: 'Value', key: 'value' }],
        rows: [
          { label: 'Report', value: `${snap.label} Report` },
          { label: 'Period', value: rangeText },
          ...(companyName ? [{ label: 'Sub-company', value: companyName }] : []),
          { label: 'Generated', value: new Date().toLocaleString() },
          ...(snap.summary || []),
        ],
      };
      exportToExcel(`${snap.label}_Report_${from}_${to}`, [
        summarySheet,
        { name: snap.label, columns: cols, rows },
      ]);
      toast.success('Excel exported');
    } catch (e) {
      toast.error('Excel export failed');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Reports Hub"
        subtitle="Comprehensive business reports with PDF & Excel export"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={doExportPDF} variant="outline" className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50">
              <FileDown className="w-4 h-4" /> Export PDF
            </Button>
            <Button onClick={doExportExcel} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </Button>
          </div>
        }
      />

      {/* Global toolbar */}
      <Card className="border-2 border-orange-100 dark:border-orange-900/40">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Report</label>
              <Select value={activeId} onValueChange={setActiveId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORTS.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id}>{rep.label} Report</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Quick Range</label>
              <Select value={preset} onValueChange={applyPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }} className="w-[150px]" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset('custom'); }} className="w-[150px]" />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 lg:ml-auto">
              <CalendarRange className="w-4 h-4 text-orange-500" />
              <span>{range.label}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {REPORTS.map((rep) => {
          const Icon = rep.icon;
          const active = rep.id === activeId;
          return (
            <button
              key={rep.id}
              onClick={() => setActiveId(rep.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-orange-500 bg-orange-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-700 dark:bg-slate-900 dark:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {rep.label}
            </button>
          );
        })}
      </div>

      {/* Active report — keyed so its hook remounts on report/range change */}
      <ReportPanel
        key={`${activeReport.id}`}
        report={activeReport}
        range={range}
        registerExport={registerExport}
      />
    </div>
  );
}

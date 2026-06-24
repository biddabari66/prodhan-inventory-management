// Shared building blocks for every report tab in the Reports hub.
// Keeps each report component small and consistent.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { StatGridSkeleton, TableSkeleton, ErrorState } from '@/components/common/Skeletons';
import api from '@/api/client';

// ---- Formatting helpers ----
export const bdt = (n) =>
  `৳${Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

export const num = (n) => Number(n || 0).toLocaleString('en-BD');

export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-GB');
};

// Normalize a list response: { data:[...], total } | [...] | { results:[...] }
export function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

/**
 * Defensive data hook. When `softFail` is true, a 404 / network error resolves
 * to `null` (empty state) instead of throwing — for endpoints not yet deployed.
 */
export function useReportData(key, fetcher, { softFail = false, enabled = true } = {}) {
  return useQuery({
    queryKey: key,
    enabled,
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetcher();
        return res?.data ?? res ?? null;
      } catch (err) {
        if (softFail) return null;
        throw err;
      }
    },
  });
}

// Convenience GET wrapper.
export const get = (url, params) => api.get(url, { params }).then((r) => r.data);

// ---- KPI stat row ----
export function StatRow({ stats = [] }) {
  if (!stats.length) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((s, i) => (
        <Card key={i} className="border-2 border-orange-100 dark:border-orange-900/40">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
              {s.icon ? <s.icon className="w-4 h-4 text-orange-500" /> : null}
            </div>
            <p className="mt-2 text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            {s.sub ? <p className="mt-1 text-xs text-slate-500">{s.sub}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---- Generic detail table driven by the same `columns` used for export ----
export function ReportTable({ columns = [], rows = [], emptyLabel = 'No records found for this period.' }) {
  if (!rows.length) {
    return (
      <Card className="border-2 border-dashed border-slate-200 dark:border-slate-700">
        <CardContent className="py-12 text-center text-sm text-slate-500">{emptyLabel}</CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-2 border-orange-100 dark:border-orange-900/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-orange-50/70 dark:bg-orange-950/30">
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={c.align === 'right' ? 'text-right font-semibold text-slate-700' : 'font-semibold text-slate-700'}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow key={row.id ?? ri}>
              {columns.map((c) => {
                const raw = row?.[c.key];
                const display = c.render ? c.render(raw, row) : (typeof c.format === 'function' ? c.format(raw, row) : raw);
                return (
                  <TableCell key={c.key} className={c.align === 'right' ? 'text-right tabular-nums' : ''}>
                    {display === undefined || display === null || display === '' ? '—' : display}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// Small colored badge for statuses.
export function StatusBadge({ value }) {
  const v = String(value || '').toUpperCase();
  const map = {
    DELIVERED: 'bg-emerald-100 text-emerald-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    PRESENT: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    PROCESSING: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    LATE: 'bg-amber-100 text-amber-700',
    RETURNED: 'bg-rose-100 text-rose-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
    DAMAGED: 'bg-rose-100 text-rose-700',
    ABSENT: 'bg-rose-100 text-rose-700',
    COD: 'bg-orange-100 text-orange-700',
  };
  return (
    <Badge variant="secondary" className={`${map[v] || 'bg-slate-100 text-slate-700'} border-0`}>
      {value || '—'}
    </Badge>
  );
}

// Wrapper handling loading / error / empty around any report body.
export function ReportShell({ isLoading, isError, onRetry, statCount = 4, children, softEmpty, softEmptyLabel }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <StatGridSkeleton count={statCount} />
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }
  if (isError) return <ErrorState message="Failed to load this report." onRetry={onRetry} />;
  if (softEmpty) {
    return (
      <Card className="border-2 border-dashed border-slate-200 dark:border-slate-700">
        <CardContent className="py-16 text-center text-sm text-slate-500">
          {softEmptyLabel || 'This report is not available yet for the current scope.'}
        </CardContent>
      </Card>
    );
  }
  return <div className="space-y-4">{children}</div>;
}

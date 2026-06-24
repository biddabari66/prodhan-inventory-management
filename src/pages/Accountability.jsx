import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ShieldCheck, RefreshCw, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { TableSkeleton, ErrorState } from '@/components/common/Skeletons';
import AccountabilitySummary from '@/components/reporting/AccountabilitySummary';

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const bandStyles = {
  A: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  B: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  C: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  D: 'bg-rose-100 text-rose-800 hover:bg-rose-100',
};

function BandBadge({ band }) {
  return (
    <Badge variant="secondary" className={bandStyles[band] || 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
      {band || '—'}
    </Badge>
  );
}

export default function Accountability() {
  const qc = useQueryClient();
  const [periodMonth, setPeriodMonth] = useState(currentMonth());

  const { data: scorecards = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['reporting-scorecards', periodMonth],
    queryFn: () =>
      api
        .get('/reporting/scorecards', { params: { periodMonth, band: '' } })
        .then((r) => r.data?.data || []),
  });

  const computeMut = useMutation({
    mutationFn: () => api.post('/reporting/scorecards/compute', { periodMonth }),
    onSuccess: () => {
      toast.success('Scorecards recomputed');
      qc.invalidateQueries({ queryKey: ['reporting-scorecards', periodMonth] });
      qc.invalidateQueries({ queryKey: ['reporting-summary'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to recompute scorecards'),
  });

  const ranked = [...scorecards].sort(
    (a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0),
  );

  return (
    <div className="space-y-5 p-1">
      <PageHeader
        icon={ShieldCheck}
        title="Team Accountability"
        subtitle="Daily reporting compliance, complaints, and monthly performance scorecards"
      />

      <AccountabilitySummary />

      <Card className="border-2 border-amber-200">
        <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle className="text-base">Monthly Scorecards</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value || currentMonth())}
              className="w-40 bg-white"
            />
            <Button
              onClick={() => computeMut.mutate()}
              disabled={computeMut.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${computeMut.isPending ? 'animate-spin' : ''}`} />
              {computeMut.isPending ? 'Recomputing…' : 'Recompute'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState message="Couldn't load scorecards." onRetry={refetch} />
          ) : isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : ranked.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No scorecards for {periodMonth}. Click “Recompute” to generate them.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">KPI</TableHead>
                  <TableHead className="text-right">Reliability</TableHead>
                  <TableHead className="text-center">Band</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map((s, i) => (
                  <TableRow key={s.subjectId} className={s.isCutCandidate ? 'bg-rose-50/60' : ''}>
                    <TableCell className="font-semibold text-slate-500">{i + 1}</TableCell>
                    <TableCell className="font-medium text-slate-800">{s.subjectName}</TableCell>
                    <TableCell className="text-right font-bold">{Number(s.totalScore) || 0}</TableCell>
                    <TableCell className="text-right text-slate-600">{Number(s.kpiScore) || 0}</TableCell>
                    <TableCell className="text-right text-slate-600">{Number(s.reliabilityScore) || 0}</TableCell>
                    <TableCell className="text-center"><BandBadge band={s.band} /></TableCell>
                    <TableCell className="text-center">
                      {s.isCutCandidate ? (
                        <Badge variant="destructive" className="bg-rose-600 hover:bg-rose-600">
                          <Scissors className="w-3 h-3 mr-1" /> Cut candidate
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

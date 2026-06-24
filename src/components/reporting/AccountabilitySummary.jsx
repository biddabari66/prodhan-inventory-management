import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, AlertTriangle, Flame, Scissors, Users } from 'lucide-react';
import { StatGridSkeleton, ErrorState } from '@/components/common/Skeletons';

// RAG colour per team.
// green: no complaints this month AND a DPR submitted today
// red:   5+ complaints this month OR no DPR today
// amber: anything in between
function teamRag(t) {
  const complaints = Number(t?.complaintsThisMonth) || 0;
  const dprs = Number(t?.dprSubmittedToday) || 0;
  if (complaints >= 5 || dprs === 0) return 'red';
  if (complaints === 0 && dprs > 0) return 'green';
  return 'amber';
}

const ragStyles = {
  green: 'border-emerald-200 bg-emerald-50',
  amber: 'border-amber-200 bg-amber-50',
  red: 'border-rose-200 bg-rose-50',
};
const ragDot = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
};

export default function AccountabilitySummary() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reporting-summary'],
    queryFn: () => api.get('/reporting/summary').then((r) => r.data?.data || {}),
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" /> Team Accountability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatGridSkeleton count={4} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-2 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" /> Team Accountability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState message="Couldn't load accountability summary." onRetry={refetch} />
        </CardContent>
      </Card>
    );
  }

  const teams = data?.teams || [];
  const redFlags = data?.redFlags || [];
  const cutList = data?.cutList || [];
  const complaintFactory = data?.complaintFactory || null;
  const totalComplaints = Number(data?.totalComplaintsMonth) || 0;

  const isEmpty =
    teams.length === 0 &&
    redFlags.length === 0 &&
    cutList.length === 0 &&
    !complaintFactory;

  return (
    <Card className="border-2 border-amber-200">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" /> Team Accountability
        </CardTitle>
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          {totalComplaints} complaints (mo)
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No accountability data yet.
          </div>
        ) : (
          <>
            {/* Complaint-factory team of the month */}
            {complaintFactory && (
              <div className="flex items-center gap-3 rounded-xl border-2 border-rose-200 bg-rose-50 p-3">
                <Flame className="w-5 h-5 shrink-0 text-rose-600" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                    Complaint-factory team of the month
                  </p>
                  <p className="truncate text-sm font-bold text-rose-800">
                    {complaintFactory.name}
                    <span className="ml-2 font-medium text-rose-600">
                      {Number(complaintFactory.complaintsThisMonth) || 0} complaints
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Team scoreboard */}
            {teams.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Users className="w-3.5 h-3.5" /> Team scoreboard
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {teams.map((t) => {
                    const rag = teamRag(t);
                    return (
                      <div
                        key={t.departmentId}
                        className={`flex items-center gap-3 rounded-xl border-2 p-3 ${ragStyles[rag]}`}
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ragDot[rag]}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{t.name}</p>
                          <p className="text-xs text-slate-500">
                            DPRs today: {Number(t.dprSubmittedToday) || 0} · Complaints (mo):{' '}
                            {Number(t.complaintsThisMonth) || 0}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Red flags */}
            {redFlags.length > 0 && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" /> Red flags
                </p>
                <ul className="space-y-1">
                  {redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cut-list candidates */}
            {cutList.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Scissors className="w-3.5 h-3.5" /> Cut-list candidates
                </p>
                <div className="flex flex-wrap gap-2">
                  {cutList.map((c) => (
                    <Badge
                      key={c.subjectId}
                      variant="destructive"
                      className="bg-rose-600 hover:bg-rose-600"
                    >
                      {c.name}
                      {c.band ? ` · ${c.band}` : ''}
                      {c.score != null ? ` (${c.score})` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

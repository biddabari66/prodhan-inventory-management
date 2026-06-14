import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award } from 'lucide-react';

const RANK_ICONS = [
  { Icon: Trophy, cls: 'text-amber-500' },
  { Icon: Medal, cls: 'text-slate-400' },
  { Icon: Award, cls: 'text-orange-400' },
];

export default function Leaderboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm-leaderboard'],
    queryFn: async () => {
      const res = await api.get('/crm/leads/leaderboard');
      const payload = res.data?.data ?? res.data;
      return Array.isArray(payload) ? payload : payload?.leaderboard || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <Card className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Agent Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}
        {isError && (
          <p className="p-6 text-sm text-slate-500">Could not load leaderboard.</p>
        )}
        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800">
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Conversion %</TableHead>
                <TableHead className="text-right">Pipeline Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((row, i) => {
                const leadsCount = row.leads ?? row.total_leads ?? row.leadCount ?? 0;
                const converted = row.converted ?? row.converted_leads ?? 0;
                const rate = row.conversion_rate ?? row.conversionRate ??
                  (leadsCount > 0 ? ((converted / leadsCount) * 100).toFixed(1) : 0);
                const value = row.pipeline_value ?? row.pipelineValue ?? row.total_value ?? 0;
                const name = row.agent_name ?? row.name ?? row.full_name ?? row.agent ?? 'Unknown';
                const rank = RANK_ICONS[i];
                return (
                  <motion.tr
                    key={row.id ?? name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
                  >
                    <TableCell>
                      {rank ? <rank.Icon className={`w-5 h-5 ${rank.cls}`} /> : <span className="text-sm text-slate-500 pl-1.5">{i + 1}</span>}
                    </TableCell>
                    <TableCell className="font-semibold">{name}</TableCell>
                    <TableCell className="text-right tabular-nums">{leadsCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 font-semibold">{converted}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={Number(rate) >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                        {Number(rate).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">৳{Number(value).toLocaleString()}</TableCell>
                  </motion.tr>
                );
              })}
              {(data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    No leaderboard data yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

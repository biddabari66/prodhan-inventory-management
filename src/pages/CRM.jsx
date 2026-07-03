import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { erp } from '@/api/erpClient';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Plus, Search, TrendingUp, Phone, Mail, Target,
  CheckCircle, BarChart3, PieChart, Flame, Trophy, Banknote, PhoneCall,
} from 'lucide-react';
import { toast } from 'sonner';
import { withPermission } from '../components/common/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { StatGridSkeleton, TableSkeleton } from '@/components/common/Skeletons';
import LeadExcelUpload from '../components/crm/LeadExcelUpload';
import KanbanBoard from '../components/crm/KanbanBoard';
import Leaderboard from '../components/crm/Leaderboard';
import { scoreLead, scoreTier } from '../components/crm/leadScore';
import { format, subDays } from 'date-fns';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#F59E0B', '#FB923C', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6'];

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'FOLLOW_UP', 'INTERESTED', 'NOT_INTERESTED', 'CONVERTED', 'LOST'];
const SOURCES = ['WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'PHONE', 'WALK_IN', 'REFERRAL', 'WHATSAPP', 'GOOGLE_ADS'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_BADGES = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  QUALIFIED: 'bg-purple-100 text-purple-800',
  PROPOSAL_SENT: 'bg-indigo-100 text-indigo-800',
  FOLLOW_UP: 'bg-cyan-100 text-cyan-800',
  INTERESTED: 'bg-orange-100 text-orange-800',
  NOT_INTERESTED: 'bg-slate-100 text-slate-600',
  CONVERTED: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
};

const titleCase = (s) => String(s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const toBDTDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);

const leadSchema = z.object({
  student_name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().optional(),
  lead_source: z.string(),
  priority: z.string(),
  value: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

function CRMPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLeadDetailsOpen, setIsLeadDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [lostLead, setLostLead] = useState(null); // lead pending a lost-reason
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      student_name: '', phone: '', email: '', lead_source: 'WEBSITE', priority: 'MEDIUM', value: '', notes: ''
    }
  });
  const [lostReason, setLostReason] = useState('');

  // ---- Data ----
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: () => erp.entities.Lead.filter({}, '-created_date', 1000),
    staleTime: 2 * 60 * 1000,
  });

  const { data: serverStats } = useQuery({
    queryKey: ['crm-lead-stats'],
    queryFn: async () => {
      const res = await api.get('/crm/leads/stats');
      return res.data?.data ?? res.data;
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // ---- Mutations ----
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    queryClient.invalidateQueries({ queryKey: ['crm-lead-stats'] });
    queryClient.invalidateQueries({ queryKey: ['crm-leaderboard'] });
  };

  const createLeadMutation = useMutation({
    mutationFn: (data) => erp.entities.Lead.create(data),
    onSuccess: () => {
      invalidate();
      toast.success('Lead created successfully');
      setIsAddLeadOpen(false);
      reset();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to create lead'),
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => erp.entities.Lead.update(id, data),
    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['crm-leads'] });
      const previous = queryClient.getQueryData(['crm-leads']);
      queryClient.setQueryData(['crm-leads'], (old = []) =>
        old.map((l) => (l.id === id ? { ...l, ...data } : l))
      );
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['crm-leads'], ctx.previous);
      toast.error(e?.response?.data?.message || 'Update failed — reverted');
    },
    onSuccess: () => toast.success('Lead updated'),
    onSettled: invalidate,
  });

  const convertLeadMutation = useMutation({
    mutationFn: (id) => api.post(`/crm/leads/${id}/convert`),
    onSuccess: () => {
      invalidate();
      toast.success('Lead converted to customer');
      setIsLeadDetailsOpen(false);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Conversion failed'),
  });

  const handleStatusChange = (lead, newStatus) => {
    if (newStatus === 'LOST') {
      setLostLead(lead);
      setLostReason('');
      return;
    }
    updateLeadMutation.mutate({
      id: lead.id,
      data: { lead_status: newStatus, last_contact_date: toBDTDate() },
    });
  };

  const confirmLost = () => {
    if (!lostLead) return;
    const noteLine = `[LOST ${toBDTDate()}] ${lostReason || 'No reason given'}`;
    updateLeadMutation.mutate({
      id: lostLead.id,
      data: {
        lead_status: 'LOST',
        last_contact_date: toBDTDate(),
        notes: lostLead.notes ? `${lostLead.notes}\n${noteLine}` : noteLine,
      },
    });
    setLostLead(null);
    setLostReason('');
  };

  // ---- Stats ----
  const stats = useMemo(() => {
    const today = toBDTDate();
    const last7Days = toBDTDate(subDays(new Date(), 7));

    const byStatus = (s) => leads.filter((l) => l.lead_status === s).length;
    const converted = byStatus('CONVERTED');
    const lost = byStatus('LOST');
    const active = leads.length - converted - lost - byStatus('NOT_INTERESTED');
    const hotLeads = leads.filter((l) => !['CONVERTED', 'LOST'].includes(l.lead_status) && scoreLead(l) >= 70).length;
    const pipelineValue = leads
      .filter((l) => !['CONVERTED', 'LOST', 'NOT_INTERESTED'].includes(l.lead_status))
      .reduce((s, l) => s + (Number(l.value) || 0), 0);
    const todayLeads = leads.filter((l) => l.created_date?.split('T')[0] === today).length;
    const weekLeads = leads.filter((l) => l.created_date?.split('T')[0] >= last7Days).length;
    const conversionRate = leads.length > 0 ? ((converted / leads.length) * 100).toFixed(1) : '0.0';

    const sourceStats = {};
    leads.forEach((l) => {
      const source = l.lead_source || 'UNKNOWN';
      if (!sourceStats[source]) sourceStats[source] = { count: 0, converted: 0 };
      sourceStats[source].count++;
      if (l.lead_status === 'CONVERTED') sourceStats[source].converted++;
    });

    return {
      total: serverStats?.total ?? leads.length,
      converted: serverStats?.converted ?? converted,
      lost,
      active,
      hotLeads,
      pipelineValue,
      todayLeads,
      weekLeads,
      conversionRate: serverStats?.conversion_rate ?? conversionRate,
      sourceStats,
    };
  }, [leads, serverStats]);

  const pipelineData = useMemo(
    () =>
      STATUSES.map((s, i) => ({
        name: titleCase(s),
        value: leads.filter((l) => l.lead_status === s).length,
        color: COLORS[i % COLORS.length],
      })).filter((d) => d.value > 0),
    [leads]
  );

  // ---- Filtering ----
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.student_name?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.email?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter((l) => l.lead_status === statusFilter);
    if (sourceFilter !== 'all') filtered = filtered.filter((l) => l.lead_source === sourceFilter);
    if (dateFilter !== 'all') {
      const today = toBDTDate();
      const last7Days = toBDTDate(subDays(new Date(), 7));
      const last30Days = toBDTDate(subDays(new Date(), 30));
      filtered = filtered.filter((l) => {
        const d = l.created_date?.split('T')[0];
        if (!d) return false;
        if (dateFilter === 'today') return d === today;
        if (dateFilter === 'week') return d >= last7Days;
        if (dateFilter === 'month') return d >= last30Days;
        return true;
      });
    }
    return filtered;
  }, [leads, searchTerm, statusFilter, sourceFilter, dateFilter]);

  const getStatusBadge = (status) => (
    <Badge className={STATUS_BADGES[status] || STATUS_BADGES.NEW}>{titleCase(status || 'NEW')}</Badge>
  );

  const onAddLeadSubmit = (data) => {
    createLeadMutation.mutate({
      ...data,
      lead_status: 'NEW',
      value: data.value || 0,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <PageHeader
          icon={Target}
          title="CRM Dashboard"
          subtitle="Lead management & sales pipeline"
          actions={
            <>
              <LeadExcelUpload onComplete={invalidate} />
              <Button onClick={() => setIsAddLeadOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </>
          }
        />

        {/* Stats */}
        {leadsLoading ? (
          <StatGridSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <StatCard icon={Users} label="Total Leads" value={stats.total} sub={`+${stats.todayLeads} today`} tone="blue" index={0} />
            <StatCard icon={TrendingUp} label="Active Pipeline" value={stats.active} sub={`${stats.weekLeads} new this week`} tone="orange" index={1} />
            <StatCard icon={Flame} label="Hot Leads" value={stats.hotLeads} sub="Score 70+" tone="red" index={2} />
            <StatCard icon={CheckCircle} label="Converted" value={stats.converted} sub={`${stats.conversionRate}% conversion`} tone="green" index={3} />
            <StatCard icon={Banknote} label="Pipeline Value" value={`৳${(stats.pipelineValue / 1000).toFixed(0)}K`} sub="Open opportunities" tone="violet" index={4} />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white dark:bg-slate-900 border shadow-sm h-12 p-1 rounded-xl w-full sm:w-auto overflow-x-auto justify-start">
            <TabsTrigger value="pipeline" className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
              <PieChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Kanban pipeline */}
          <TabsContent value="pipeline" className="mt-6">
            <div className="mb-4 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search pipeline..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {leadsLoading ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading pipeline…</div>
            ) : (
              <KanbanBoard
                leads={filteredLeads}
                onStatusChange={handleStatusChange}
                onLeadClick={(lead) => { setSelectedLead(lead); setIsLeadDetailsOpen(true); }}
              />
            )}
          </TabsContent>

          {/* List view */}
          <TabsContent value="list" className="mt-6 space-y-4">
            <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {SOURCES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Date" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm overflow-hidden">
              {leadsLoading ? (
                <div className="p-4"><TableSkeleton rows={8} cols={8} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800">
                        <TableHead>Lead</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.slice(0, 100).map((lead) => {
                        const score = scoreLead(lead);
                        const tier = scoreTier(score);
                        return (
                          <TableRow key={lead.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20">
                            <TableCell>
                              <p className="font-medium">{lead.student_name}</p>
                              {lead.priority && (
                                <p className="text-[10px] text-slate-400">{titleCase(lead.priority)} priority</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="w-3 h-3" />
                                  {lead.phone}
                                </div>
                                {lead.email && (
                                  <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Mail className="w-3 h-3" />
                                    {lead.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{titleCase(lead.lead_source)}</Badge></TableCell>
                            <TableCell className="font-semibold tabular-nums">৳{(Number(lead.value) || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Select value={lead.lead_status} onValueChange={(val) => handleStatusChange(lead, val)}>
                                <SelectTrigger className="w-36 h-8">{getStatusBadge(lead.lead_status)}</SelectTrigger>
                                <SelectContent>
                                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${tier.badge}`}>{score}</span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-500">
                              {lead.created_date ? format(new Date(lead.created_date), 'dd MMM yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedLead(lead); setIsLeadDetailsOpen(true); }}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredLeads.length === 0 && !leadsLoading && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                            No leads match your filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard" className="mt-6">
            <Leaderboard />
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Pipeline Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {pipelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={pipelineData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pipelineData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-slate-400">No data yet</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Lead Sources Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.sourceStats)
                      .sort((a, b) => b[1].count - a[1].count)
                      .slice(0, 8)
                      .map(([source, data], idx) => {
                        const convRate = data.count > 0 ? (data.converted / data.count) * 100 : 0;
                        return (
                          <motion.div
                            key={source}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="font-medium">{titleCase(source)}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{data.count} leads</p>
                              <p className="text-xs text-green-600">{data.converted} converted ({convRate.toFixed(1)}%)</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    {Object.keys(stats.sourceStats).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white dark:bg-slate-900 border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Key Metrics Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.weekLeads}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Leads This Week</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.conversionRate}%</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Conversion Rate</p>
                  </div>
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-center">
                    <p className="text-2xl font-bold text-rose-600">{stats.hotLeads}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Hot Leads</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-center">
                    <p className="text-2xl font-bold text-amber-600">৳{(stats.pipelineValue / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Pipeline Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAddLeadSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  {...register('student_name')}
                  placeholder="Full name"
                />
                {errors.student_name && <span className="text-xs text-red-500">{errors.student_name.message}</span>}
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  {...register('phone')}
                  placeholder="01XXXXXXXXX"
                />
                {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                {...register('email')}
                placeholder="email@example.com"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Source</Label>
                <Controller
                  name="lead_source"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>Value (৳)</Label>
                <Input
                  type="number"
                  min="0"
                  {...register('value')}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                {...register('notes')}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddLeadOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLeadMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
                Add Lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lost Reason Dialog */}
      <Dialog open={!!lostLead} onOpenChange={(open) => { if (!open) setLostLead(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Why was <span className="font-semibold text-slate-800 dark:text-slate-100">{lostLead?.student_name}</span> lost?
            </p>
            <Textarea
              autoFocus
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="e.g. Price too high, went with competitor, not reachable..."
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLostLead(null)}>Cancel</Button>
              <Button onClick={confirmLost} className="bg-rose-600 hover:bg-rose-700 text-white">
                Mark Lost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <Dialog open={isLeadDetailsOpen} onOpenChange={setIsLeadDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center font-bold">
                    {selectedLead.student_name?.charAt(0).toUpperCase()}
                  </div>
                  {selectedLead.student_name}
                  {getStatusBadge(selectedLead.lead_status)}
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${scoreTier(scoreLead(selectedLead)).badge}`}>
                    Score {scoreLead(selectedLead)}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                    <p className="font-medium">{selectedLead.phone}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="font-medium">{selectedLead.email || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Source</p>
                    <Badge variant="outline">{titleCase(selectedLead.lead_source)}</Badge>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Value</p>
                    <p className="font-bold text-amber-600">৳{(Number(selectedLead.value) || 0).toLocaleString()}</p>
                  </div>
                </div>

                {selectedLead.notes && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
                  </div>
                )}

                <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t">
                  <p className="text-xs text-slate-500">
                    Created: {selectedLead.created_date ? format(new Date(selectedLead.created_date), 'dd MMM yyyy HH:mm') : '-'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${selectedLead.phone}`}>
                          <PhoneCall className="w-4 h-4 mr-1" />
                          Call
                        </a>
                      </Button>
                    )}
                    {selectedLead.lead_status !== 'CONVERTED' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={convertLeadMutation.isPending}
                        onClick={() => convertLeadMutation.mutate(selectedLead.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Convert to Customer
                      </Button>
                    )}
                    <Select
                      value={selectedLead.lead_status}
                      onValueChange={(val) => {
                        handleStatusChange(selectedLead, val);
                        if (val !== 'LOST') setSelectedLead({ ...selectedLead, lead_status: val });
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withPermission(CRMPage, 'customer_management', 'can_view');

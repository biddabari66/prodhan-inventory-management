import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  Users, Plus, Search, TrendingUp, Phone, Mail, Target, Calendar, 
  MessageSquare, ArrowRight, Clock, CheckCircle, XCircle, AlertCircle,
  Filter, BarChart3, PieChart, UserPlus, Zap, Star, PhoneCall
} from 'lucide-react';
import { toast } from 'sonner';
import { withPermission } from '../components/common/PermissionGuard';
import { format, subDays, differenceInDays } from 'date-fns';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const COLORS = ['#DC2626', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

const toBDTDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);
};

function CRMPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLeadDetailsOpen, setIsLeadDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');
  
  const [newLead, setNewLead] = useState({
    student_name: '',
    phone: '',
    email: '',
    lead_source: 'website',
    course_interest: '',
    department: 'prodhan_com_e_commerce',
    lead_status: 'new',
    notes: ''
  });

  // Fetch leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: () => base44.entities.Lead.filter({ department: 'prodhan_com_e_commerce' }, '-created_date', 1000),
    staleTime: 2 * 60 * 1000
  });

  // Fetch customers for conversion tracking
  const { data: customers = [] } = useQuery({
    queryKey: ['crm-customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 500),
    staleTime: 5 * 60 * 1000
  });

  // Fetch orders for revenue tracking
  const { data: orders = [] } = useQuery({
    queryKey: ['crm-orders'],
    queryFn: () => base44.entities.Order.filter({ department: 'prodhan_com_e_commerce' }, '-order_date', 2000),
    staleTime: 5 * 60 * 1000
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['crm-leads']);
      toast.success('Lead created successfully');
      setIsAddLeadOpen(false);
      setNewLead({
        student_name: '',
        phone: '',
        email: '',
        lead_source: 'website',
        course_interest: '',
        department: 'prodhan_com_e_commerce',
        lead_status: 'new',
        notes: ''
      });
    }
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['crm-leads']);
      toast.success('Lead updated');
    }
  });

  // Calculate stats
  const stats = useMemo(() => {
    const today = toBDTDate();
    const last7Days = toBDTDate(subDays(new Date(), 7));
    const last30Days = toBDTDate(subDays(new Date(), 30));

    const newLeads = leads.filter(l => l.lead_status === 'new').length;
    const contacted = leads.filter(l => l.lead_status === 'contacted').length;
    const qualified = leads.filter(l => l.lead_status === 'qualified').length;
    const converted = leads.filter(l => l.lead_status === 'converted').length;
    const lost = leads.filter(l => l.lead_status === 'lost').length;

    const todayLeads = leads.filter(l => l.created_date?.split('T')[0] === today).length;
    const weekLeads = leads.filter(l => l.created_date?.split('T')[0] >= last7Days).length;
    const monthLeads = leads.filter(l => l.created_date?.split('T')[0] >= last30Days).length;

    const conversionRate = leads.length > 0 ? ((converted / leads.length) * 100).toFixed(1) : 0;

    // Revenue from converted leads
    const convertedCustomerPhones = leads.filter(l => l.lead_status === 'converted').map(l => l.phone);
    const convertedRevenue = orders
      .filter(o => convertedCustomerPhones.includes(o.customer_phone) && !['cancelled', 'returned'].includes(o.order_status))
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Source breakdown
    const sourceStats = {};
    leads.forEach(l => {
      const source = l.lead_source || 'unknown';
      if (!sourceStats[source]) sourceStats[source] = { count: 0, converted: 0 };
      sourceStats[source].count++;
      if (l.lead_status === 'converted') sourceStats[source].converted++;
    });

    return {
      total: leads.length,
      newLeads,
      contacted,
      qualified,
      converted,
      lost,
      todayLeads,
      weekLeads,
      monthLeads,
      conversionRate,
      convertedRevenue,
      sourceStats
    };
  }, [leads, orders]);

  // Pipeline data
  const pipelineData = [
    { name: 'New', value: stats.newLeads, color: '#3B82F6' },
    { name: 'Contacted', value: stats.contacted, color: '#F59E0B' },
    { name: 'Qualified', value: stats.qualified, color: '#8B5CF6' },
    { name: 'Converted', value: stats.converted, color: '#10B981' },
    { name: 'Lost', value: stats.lost, color: '#EF4444' }
  ].filter(d => d.value > 0);

  // Filter leads
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];
    
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.student_name?.toLowerCase().includes(query) ||
        l.phone?.includes(query) ||
        l.email?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.lead_status === statusFilter);
    }
    
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(l => l.lead_source === sourceFilter);
    }
    
    return filtered;
  }, [leads, searchTerm, statusFilter, sourceFilter]);

  const handleStatusChange = (lead, newStatus) => {
    updateLeadMutation.mutate({
      id: lead.id,
      data: { lead_status: newStatus, last_contact_date: toBDTDate() }
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      new: { label: 'New', class: 'bg-blue-100 text-blue-800' },
      contacted: { label: 'Contacted', class: 'bg-yellow-100 text-yellow-800' },
      qualified: { label: 'Qualified', class: 'bg-purple-100 text-purple-800' },
      proposal_sent: { label: 'Proposal Sent', class: 'bg-indigo-100 text-indigo-800' },
      negotiation: { label: 'Negotiation', class: 'bg-orange-100 text-orange-800' },
      converted: { label: 'Converted', class: 'bg-green-100 text-green-800' },
      lost: { label: 'Lost', class: 'bg-red-100 text-red-800' },
      nurturing: { label: 'Nurturing', class: 'bg-slate-100 text-slate-800' }
    };
    const { label, class: className } = config[status] || config.new;
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">CRM Dashboard</h1>
              <p className="text-slate-500 text-sm">Lead management & sales pipeline</p>
            </div>
          </div>
          <Button 
            onClick={() => setIsAddLeadOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs text-slate-400">Today: {stats.todayLeads}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Total Leads</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.newLeads + stats.contacted}</p>
              <p className="text-xs text-slate-500">Active Pipeline</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.converted}</p>
              <p className="text-xs text-slate-500">Converted</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.conversionRate}%</p>
              <p className="text-xs text-slate-500">Conversion Rate</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600">৳{(stats.convertedRevenue / 1000).toFixed(0)}K</p>
              <p className="text-xs text-slate-500">Lead Revenue</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border shadow-sm h-12 p-1 rounded-xl">
            <TabsTrigger value="pipeline" className="gap-2 rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2 rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              All Leads
            </TabsTrigger>
            <TabsTrigger value="conversion" className="gap-2 rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <ArrowRight className="w-4 h-4" />
              Conversion
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <PieChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Pipeline View */}
          <TabsContent value="pipeline" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {['new', 'contacted', 'qualified', 'negotiation', 'converted'].map((status, idx) => {
                const statusLeads = leads.filter(l => l.lead_status === status);
                const colors = ['bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500', 'bg-green-500'];
                const labels = ['New', 'Contacted', 'Qualified', 'Negotiation', 'Converted'];
                
                return (
                  <Card key={status} className="bg-white border-0 shadow-sm">
                    <CardHeader className={`py-3 ${colors[idx]} rounded-t-lg`}>
                      <CardTitle className="text-sm text-white flex justify-between items-center">
                        {labels[idx]}
                        <Badge className="bg-white/20 text-white">{statusLeads.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 max-h-96 overflow-y-auto space-y-2">
                      {statusLeads.slice(0, 10).map(lead => (
                        <div 
                          key={lead.id}
                          onClick={() => { setSelectedLead(lead); setIsLeadDetailsOpen(true); }}
                          className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <p className="font-medium text-sm text-slate-900 truncate">{lead.student_name}</p>
                          <p className="text-xs text-slate-500">{lead.phone}</p>
                          <div className="flex justify-between items-center mt-2">
                            <Badge variant="outline" className="text-xs">{lead.lead_source}</Badge>
                            {lead.lead_score && (
                              <span className="text-xs text-purple-600 font-medium">{lead.lead_score}%</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {statusLeads.length === 0 && (
                        <p className="text-center text-slate-400 text-sm py-4">No leads</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* All Leads View */}
          <TabsContent value="leads" className="mt-6 space-y-4">
            {/* Filters */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
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
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                      <SelectItem value="google_ads">Google Ads</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Leads Table */}
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Lead</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.slice(0, 50).map(lead => (
                    <TableRow key={lead.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.student_name}</p>
                          <p className="text-xs text-slate-500">{lead.course_interest}</p>
                        </div>
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
                      <TableCell>
                        <Badge variant="outline">{lead.lead_source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.lead_status}
                          onValueChange={(val) => handleStatusChange(lead, val)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            {getStatusBadge(lead.lead_status)}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {lead.lead_score ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="font-medium">{lead.lead_score}%</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {lead.created_date ? format(new Date(lead.created_date), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedLead(lead); setIsLeadDetailsOpen(true); }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Lead to Customer Conversion View */}
          <TabsContent value="conversion" className="mt-6 space-y-6">
            {/* Conversion Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {[
                { stage: 'New Leads', count: stats.newLeads, color: 'bg-blue-500', percentage: 100 },
                { stage: 'Contacted', count: stats.contacted, color: 'bg-yellow-500', percentage: stats.total > 0 ? ((stats.contacted / stats.total) * 100) : 0 },
                { stage: 'Qualified', count: stats.qualified, color: 'bg-purple-500', percentage: stats.total > 0 ? ((stats.qualified / stats.total) * 100) : 0 },
                { stage: 'Negotiation', count: leads.filter(l => l.lead_status === 'negotiation').length, color: 'bg-orange-500', percentage: stats.total > 0 ? ((leads.filter(l => l.lead_status === 'negotiation').length / stats.total) * 100) : 0 },
                { stage: 'Converted', count: stats.converted, color: 'bg-green-500', percentage: stats.total > 0 ? ((stats.converted / stats.total) * 100) : 0 },
              ].map((item, idx) => (
                <Card key={idx} className="bg-white border-0 shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${item.color}`}></div>
                  <CardContent className="p-5 text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full ${item.color} bg-opacity-20 flex items-center justify-center mb-3`}>
                      <span className="text-xl font-bold">{item.count}</span>
                    </div>
                    <p className="font-semibold text-slate-800">{item.stage}</p>
                    <p className="text-xs text-slate-500">{item.percentage.toFixed(1)}% of total</p>
                    {idx < 4 && (
                      <ArrowRight className="w-5 h-5 text-slate-300 absolute right-2 top-1/2 -translate-y-1/2 hidden lg:block" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Conversions */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Recently Converted to Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leads.filter(l => l.lead_status === 'converted').slice(0, 10).map(lead => {
                    const customerOrders = orders.filter(o => o.customer_phone === lead.phone);
                    const totalRevenue = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                    return (
                      <div key={lead.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{lead.student_name}</p>
                            <p className="text-sm text-slate-500">{lead.phone}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{lead.lead_source}</Badge>
                              <Badge className="bg-green-100 text-green-800 text-xs">{customerOrders.length} orders</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">৳{totalRevenue.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">Total Revenue</p>
                        </div>
                      </div>
                    );
                  })}
                  {leads.filter(l => l.lead_status === 'converted').length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Target className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p>No conversions yet. Keep nurturing your leads!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ready to Convert - Hot Leads */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Hot Leads - Ready to Convert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leads.filter(l => ['qualified', 'negotiation'].includes(l.lead_status)).slice(0, 8).map(lead => (
                    <div key={lead.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          {lead.student_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{lead.student_name}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(lead.lead_status)}
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusChange(lead, 'converted')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Convert
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics View */}
          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pipeline Chart */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Pipeline Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
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
                          {pipelineData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Source Performance */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Lead Sources Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.sourceStats).sort((a, b) => b[1].count - a[1].count).slice(0, 6).map(([source, data], idx) => {
                      const convRate = data.count > 0 ? ((data.converted / data.count) * 100) : 0;
                      return (
                        <div key={source} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="font-medium capitalize">{source.replace('_', ' ')}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{data.count} leads</p>
                            <p className="text-xs text-green-600">{data.converted} converted ({convRate.toFixed(1)}%)</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Rate by Time */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Key Metrics Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.weekLeads}</p>
                    <p className="text-xs text-slate-600">Leads This Week</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.conversionRate}%</p>
                    <p className="text-xs text-slate-600">Conversion Rate</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-purple-600">৳{(stats.convertedRevenue / stats.converted || 0).toFixed(0)}</p>
                    <p className="text-xs text-slate-600">Avg Customer Value</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.newLeads + stats.contacted}</p>
                    <p className="text-xs text-slate-600">Active Pipeline</p>
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
          <form onSubmit={(e) => { e.preventDefault(); createLeadMutation.mutate(newLead); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  required
                  value={newLead.student_name}
                  onChange={(e) => setNewLead({...newLead, student_name: e.target.value})}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  required
                  value={newLead.phone}
                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Source</Label>
                <Select value={newLead.lead_source} onValueChange={(val) => setNewLead({...newLead, lead_source: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                    <SelectItem value="google_ads">Google Ads</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="walk_in">Walk In</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Interest</Label>
                <Input
                  value={newLead.course_interest}
                  onChange={(e) => setNewLead({...newLead, course_interest: e.target.value})}
                  placeholder="Product/Category interest"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newLead.notes}
                onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddLeadOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Add Lead</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Details Dialog */}
      <Dialog open={isLeadDetailsOpen} onOpenChange={setIsLeadDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    {selectedLead.student_name?.charAt(0).toUpperCase()}
                  </div>
                  {selectedLead.student_name}
                  {getStatusBadge(selectedLead.lead_status)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                    <p className="font-medium">{selectedLead.phone}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="font-medium">{selectedLead.email || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Source</p>
                    <Badge variant="outline">{selectedLead.lead_source}</Badge>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Interest</p>
                    <p className="font-medium">{selectedLead.course_interest || '-'}</p>
                  </div>
                </div>
                
                {selectedLead.notes && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm">{selectedLead.notes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-xs text-slate-500">
                    Created: {selectedLead.created_date ? format(new Date(selectedLead.created_date), 'dd MMM yyyy HH:mm') : '-'}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <PhoneCall className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Select
                      value={selectedLead.lead_status}
                      onValueChange={(val) => {
                        handleStatusChange(selectedLead, val);
                        setSelectedLead({...selectedLead, lead_status: val});
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
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
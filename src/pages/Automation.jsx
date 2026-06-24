import React, { useState, useMemo } from 'react';
import {
  Zap, Copy, Plus, Trash2, Edit, Send, ShoppingCart, Package, Users,
  Truck, RefreshCw, Globe, Shield, KeyRound, Webhook, Bot,
  CheckCircle2, PlayCircle, PauseCircle, Code2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import PageHeader from '@/components/common/PageHeader';
import { CardGridSkeleton, TableSkeleton, ErrorState } from '@/components/common/Skeletons';
import api from '@/api/client';
import { useScope } from '@/lib/scope';
import { useAuth } from '@/lib/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';
const fullUrl = (path) => `${API_BASE}${path}`;

// ─── Actions Catalog: ERP actions an n8n / AI agent can call ─────────────────
const ACTION_GROUPS = [
  {
    domain: 'Orders',
    icon: ShoppingCart,
    actions: [
      { method: 'POST', path: '/orders', description: 'Create a new order in the ERP (like an employee placing it).' },
      { method: 'POST', path: '/orders/{id}/ship', description: 'Mark an order as shipped and dispatch to the courier.' },
      { method: 'GET', path: '/orders/{id}/delivery-status', description: 'Check the live courier delivery status of an order.' },
      { method: 'PATCH', path: '/orders/{id}', description: 'Update an order status. Body: { order_status }.' },
    ],
  },
  {
    domain: 'Inventory',
    icon: Package,
    actions: [
      { method: 'PATCH', path: '/inventory/{id}', description: 'Update stock level / details for an inventory item.' },
    ],
  },
  {
    domain: 'CRM',
    icon: Users,
    actions: [
      { method: 'POST', path: '/leads', description: 'Create a new CRM lead (from Facebook, chat, forms, etc.).' },
      { method: 'POST', path: '/wholesale', description: 'Add a wholesale order / customer record.' },
    ],
  },
  {
    domain: 'HR',
    icon: Bot,
    actions: [
      { method: 'POST', path: '/tasks', description: 'Create a task assigned to a team member.' },
    ],
  },
];

const METHOD_COLORS = {
  GET: 'bg-blue-100 text-blue-700 border-blue-200',
  POST: 'bg-green-100 text-green-700 border-green-200',
  PATCH: 'bg-amber-100 text-amber-700 border-amber-200',
  PUT: 'bg-purple-100 text-purple-700 border-purple-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

// ─── Outbound webhook events ─────────────────────────────────────────────────
const WEBHOOK_EVENTS = [
  'order.created', 'order.confirmed', 'order.shipped', 'order.delivered',
  'inventory.low', 'lead.created', 'task.created', 'wholesale.created',
];

// ─── Inbound endpoints catalog ───────────────────────────────────────────────
const INBOUND_ENDPOINTS = [
  { title: 'n8n / Generic', path: '/webhooks/n8n', icon: Zap, note: 'Protected by the api_key header. Primary endpoint for n8n automations.' },
  { title: 'Steadfast Courier', path: '/webhooks/steadfast', icon: Truck, note: 'Delivery status callbacks from Steadfast. Signature/secret protected.' },
  { title: 'WooCommerce', path: '/webhooks/woocommerce', icon: Globe, note: 'Native WooCommerce order webhook. Verified by signature header.' },
  { title: 'Facebook', path: '/webhooks/facebook', icon: Users, note: 'Facebook Lead Ads / Messenger webhook. Verified by signature token.' },
];

const SAMPLE_WP_BODY = `{
  "customer_name": "Rahim Ahmed",
  "phone": "01711234567",
  "address": "123 Mirpur Road, Dhaka",
  "city": "Dhaka",
  "products": [
    {
      "name": "Prodhan Honey 500g",
      "sku": "PROD-001",
      "quantity": 2,
      "unit_price": 850,
      "total_price": 1700
    }
  ],
  "grand_total": 1700,
  "payment_method": "cod"
}`;

const copyText = (text) => {
  navigator.clipboard?.writeText(text);
  toast.success('Copied to clipboard!');
};

const companyLabel = (c) => c?.branding?.name || c?.name || c?.id;

export default function Automation() {
  const { companyId: activeCompanyId, departmentId: activeDepartmentId } = useScope();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin =
    user?.role === 'admin' ||
    ['admin', 'super_admin'].includes(String(user?.job_role || '').toLowerCase());

  // ── Sub-companies — only admins need the full list for the company picker ──
  const { data: companies = [] } = useQuery({
    queryKey: ['companies', 'automation'],
    queryFn: async () => {
      const r = await api.get('/companies', { params: { limit: 100 } });
      return Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
    },
    staleTime: 5 * 60 * 1000,
    enabled: isAdmin, // non-admins don't need the company list
  });

  // ── Tab 2: inbound order webhook routing ──
  const [inboundCompanyId, setInboundCompanyId] = useState('');
  const inboundUrl = useMemo(() => {
    const base = fullUrl('/webhooks/n8n');
    return inboundCompanyId ? `${base}?companyId=${inboundCompanyId}` : base;
  }, [inboundCompanyId]);

  // ── Tab 3: outbound webhooks ──
  // Default the filter to the user's active company (locked for non-admins)
  const [outboundFilter, setOutboundFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', events: [], companyId: '' });

  const {
    data: outboundHooks = [],
    isLoading: hooksLoading,
    isError: hooksError,
    refetch: refetchHooks,
  } = useQuery({
    // ✅ Include scope in query key — re-fetches when user switches company
    queryKey: ['automation-webhooks', activeCompanyId, activeDepartmentId],
    queryFn: async () => {
      try {
        const r = await api.get('/automation/webhooks');
        return Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
      } catch (e) {
        if (e?.response?.status === 404) return [];
        throw e;
      }
    },
    retry: false,
  });

  // ✅ For non-admins: auto-lock the filter to their company
  React.useEffect(() => {
    if (!isAdmin && activeCompanyId) setOutboundFilter(activeCompanyId);
  }, [isAdmin, activeCompanyId]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        const r = await api.patch(`/automation/webhooks/${payload.id}`, payload);
        return r.data;
      }
      const r = await api.post('/automation/webhooks', payload);
      return r.data;
    },
    onSuccess: () => {
      toast.success(editing ? 'Webhook updated' : 'Webhook created');
      queryClient.invalidateQueries({ queryKey: ['automation-webhooks'] });
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to save webhook'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/automation/webhooks/${id}`),
    onSuccess: () => {
      toast.success('Webhook deleted');
      queryClient.invalidateQueries({ queryKey: ['automation-webhooks'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to delete webhook'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (hook) => api.patch(`/automation/webhooks/${hook.id}`, { isActive: !hook.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-webhooks'] }),
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to update webhook'),
  });

  const testMutation = useMutation({
    mutationFn: async (id) => api.post(`/automation/webhooks/${id}/test`),
    onSuccess: () => toast.success('Test event sent'),
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to send test event'),
  });


  const toggleEvent = (ev) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }
    saveMutation.mutate({
      ...form,
      companyId: form.companyId || activeCompanyId || undefined,
    });
  };

  const visibleHooks = outboundHooks.filter(
    (h) => outboundFilter === 'all' || (h.companyId || '') === outboundFilter,
  );

  const nameForCompany = (id) => companyLabel(companies.find((c) => c.id === id)) || 'All sub-companies';

  // For the dialog form: new webhooks default to the user's active company
  const openDialog = (hook = null) => {
    setEditing(hook);
    setForm(hook
      ? { id: hook.id, name: hook.name || '', url: hook.url || '', events: hook.events || [], companyId: hook.companyId || '' }
      : { name: '', url: '', events: [], companyId: activeCompanyId || '' });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <PageHeader
        icon={Webhook}
        title="Automation Hub"
        subtitle="Per-sub-company control center for n8n & AI-agent integrations — actions your agents can call, plus inbound and outbound webhooks."
      />

      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-orange-50 dark:bg-slate-900 p-1">
          <TabsTrigger value="actions" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
            <Bot className="w-4 h-4 mr-2" /> Actions Catalog
          </TabsTrigger>
          <TabsTrigger value="inbound-order" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
            <Globe className="w-4 h-4 mr-2" /> Inbound Order Webhook
          </TabsTrigger>
          <TabsTrigger value="outbound" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
            <Send className="w-4 h-4 mr-2" /> Outbound Webhooks
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="data-[state=active]:bg-white data-[state=active]:text-orange-700">
            <Shield className="w-4 h-4 mr-2" /> Inbound Endpoints
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: ACTIONS CATALOG ═══ */}
        <TabsContent value="actions" className="space-y-6 mt-6">
          <p className="text-sm text-slate-500">
            ERP actions your n8n workflows or AI agents can call — acting like an employee. Each Copy button gives the full URL
            (prefixed with <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">VITE_API_URL</code>). Active sub-company is auto-applied by the API layer.
          </p>
          {ACTION_GROUPS.map((group) => (
            <div key={group.domain}>
              <div className="flex items-center gap-2 mb-3">
                <group.icon className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{group.domain}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.actions.map((action) => (
                  <Card key={action.method + action.path} className="border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`font-bold ${METHOD_COLORS[action.method] || ''}`}>
                          {action.method}
                        </Badge>
                        <code className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{action.path}</code>
                      </div>
                      <CardDescription className="pt-2">{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[11px] font-mono px-2 py-1.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 truncate text-slate-500">
                          {fullUrl(action.path)}
                        </code>
                        <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={() => copyText(fullUrl(action.path))}>
                          <Copy className="w-3.5 h-3.5" /> Copy URL
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ═══ TAB 2: INBOUND ORDER WEBHOOK ═══ */}
        <TabsContent value="inbound-order" className="space-y-6 mt-6">
          <Card className="border-2 border-orange-200 dark:border-orange-900/50">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Globe className="w-5 h-5 text-orange-500" />
                WordPress / WooCommerce → n8n → ERP
              </CardTitle>
              <CardDescription>
                Point your n8n workflow to this endpoint to auto-create orders in the ERP. Authenticate with the{' '}
                <code className="bg-white dark:bg-slate-800 px-1 rounded">api_key</code> header. Optionally append{' '}
                <code className="bg-white dark:bg-slate-800 px-1 rounded">?companyId=&lt;sub-company&gt;</code> to route the order to a specific sub-company.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Endpoint + method */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`font-bold ${METHOD_COLORS.POST}`}>POST</Badge>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Inbound endpoint</span>
              </div>

              {/* Sub-company routing select */}
              <div className="grid sm:grid-cols-[260px_1fr] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Route to sub-company (optional)</Label>
                  <Select value={inboundCompanyId || 'none'} onValueChange={(v) => setInboundCompanyId(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="No specific sub-company" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific sub-company</SelectItem>
                      {companies.map((c) => <SelectItem key={c.id} value={c.id}>{companyLabel(c)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs">Copy this exact URL into n8n</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 truncate text-slate-700 dark:text-slate-300">
                      {inboundUrl}
                    </code>
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 flex-shrink-0" onClick={() => copyText(inboundUrl)}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                </div>
              </div>

              {/* Required header */}
              <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3">
                <KeyRound className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Required header:</span>{' '}
                  <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">api_key: &lt;your-secret&gt;</code>
                </div>
              </div>

              {/* Sample body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" /> Sample WordPress JSON body
                  </p>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => copyText(SAMPLE_WP_BODY)}>
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                </div>
                <pre className="text-xs font-mono bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto whitespace-pre">{SAMPLE_WP_BODY}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 3: OUTBOUND WEBHOOKS ═══ */}
        <TabsContent value="outbound" className="space-y-4 mt-6">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Outbound Webhooks (ERP → n8n)</h2>
              <p className="text-xs text-slate-500">Push real-time events to n8n / Zapier / Make when things happen in the ERP.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* ✅ Company filter only shown to admins — non-admins are auto-scoped */}
              {isAdmin && companies.length > 0 && (
                <Select value={outboundFilter} onValueChange={setOutboundFilter}>
                  <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Filter by sub-company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sub-companies</SelectItem>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{companyLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => openDialog()}>
                <Plus className="w-4 h-4 mr-2" /> New Webhook
              </Button>
            </div>
          </div>

          {hooksLoading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : hooksError ? (
            <ErrorState message="Failed to load outbound webhooks." onRetry={refetchHooks} />
          ) : visibleHooks.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                  <Send className="w-7 h-7 text-orange-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">No outbound webhooks yet</h3>
                <p className="text-sm text-slate-500 max-w-md mt-2">
                  Create one to push ERP events (orders, leads, low stock, etc.) to your n8n workflows.
                </p>
                <Button variant="outline" className="mt-5 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => openDialog()}>
                  Create First Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Sub-company</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleHooks.map((hook) => (
                    <TableRow key={hook.id} className={hook.isActive === false ? 'opacity-60' : ''}>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {hook.isActive === false
                            ? <PauseCircle className="w-4 h-4 text-amber-500" />
                            : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {hook.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 max-w-[220px]">
                          <code className="text-xs font-mono truncate text-slate-500">{hook.url}</code>
                          <button onClick={() => copyText(hook.url)} className="text-slate-400 hover:text-slate-700 flex-shrink-0">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(hook.events || []).slice(0, 3).map((ev) => (
                            <Badge key={ev} variant="outline" className="text-[10px] font-mono">{ev}</Badge>
                          ))}
                          {(hook.events || []).length > 3 && (
                            <Badge variant="outline" className="text-[10px]">+{hook.events.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                          {hook.companyId ? nameForCompany(hook.companyId) : 'All'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Test"
                            disabled={testMutation.isPending} onClick={() => testMutation.mutate(hook.id)}>
                            <Send className="w-4 h-4 text-orange-500" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title={hook.isActive === false ? 'Activate' : 'Pause'}
                            disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(hook)}>
                            {hook.isActive === false
                              ? <PlayCircle className="w-4 h-4 text-emerald-500" />
                              : <PauseCircle className="w-4 h-4 text-amber-500" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => openDialog(hook)}>
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Delete"
                            disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(hook.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ═══ TAB 4: INBOUND ENDPOINTS CATALOG ═══ */}
        <TabsContent value="endpoints" className="space-y-4 mt-6">
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4 rounded-xl">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Reference endpoints the ERP listens on for inbound integrations. Each is protected by an API key or a provider signature —
              never expose secrets in client-side code.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INBOUND_ENDPOINTS.map((ep) => (
              <Card key={ep.path} className="border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ep.icon className="w-5 h-5 text-orange-500" /> {ep.title}
                  </CardTitle>
                  <CardDescription>{ep.note}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`font-bold ${METHOD_COLORS.POST}`}>POST</Badge>
                    <code className="text-xs font-mono text-slate-600 dark:text-slate-300">{ep.path}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono px-2 py-1.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 truncate text-slate-500">
                      {fullUrl(ep.path)}
                    </code>
                    <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={() => copyText(fullUrl(ep.path))}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Outbound webhook create/edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-orange-500" />
              {editing ? 'Edit Outbound Webhook' : 'New Outbound Webhook'}
            </DialogTitle>
            <DialogDescription>Send ERP events to your n8n / external workflow URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Sync new orders to n8n" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Destination URL</Label>
              <Input className="font-mono text-sm" placeholder="https://your-n8n.app/webhook/..." value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sub-company</Label>
              {isAdmin ? (
                <Select value={form.companyId || 'none'} onValueChange={(v) => setForm({ ...form, companyId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select sub-company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All sub-companies</SelectItem>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{companyLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 px-3 flex items-center text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-600">
                  {companyLabel(companies.find(c => c.id === (form.companyId || activeCompanyId))) || 'Your company (auto-assigned)'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Trigger Events</Label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((ev) => {
                  const on = form.events.includes(ev);
                  return (
                    <button key={ev} type="button" onClick={() => toggleEvent(ev)}
                      className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-all ${
                        on ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                      }`}>
                      {ev}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

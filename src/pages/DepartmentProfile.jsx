import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Save, Image as ImageIcon, LayoutTemplate, MapPin, Phone, Mail, Palette, Plus, Loader2, Network, Trash2, Truck,
  Globe, Plug, Webhook, Facebook, ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

const EMPTY_BRANDING = {
  name: '', logo: '', primaryColor: '#EA580C', secondaryColor: '#FFEDD5',
  phone: '', email: '', address: '', tagline: '', invoice_template: 'design_1_modern',
  shipping: { webhookUrl: '', provider: 'steadfast' },
  integrations: {
    wordpressUrl: '', wordpressKey: '', woocommerceUrl: '', woocommerceKey: '', woocommerceSecret: '',
    n8nWebhookBase: '', facebookPageId: '', facebookToken: '', websiteUrl: '', customWebhook: '',
  },
};
const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Mirror branding to localStorage so invoice/receipt components keep working.
function mirrorToLocalStorage(companies) {
  try {
    const map = JSON.parse(localStorage.getItem('department_branding') || '{}');
    for (const c of companies) {
      const b = c.branding || {};
      const entry = { ...EMPTY_BRANDING, ...b, name: b.name || c.name };
      map[slugify(c.name)] = entry;
      map[c.name] = entry;
    }
    localStorage.setItem('department_branding', JSON.stringify(map));
  } catch { /* non-fatal */ }
}

export default function CompanyProfiles() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_BRANDING);
  const [isAddOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');

  // ── Sub-companies ────────────────────────────────────────────────────────
  const { data: compResp, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies', { params: { limit: 100 } }).then((r) => r.data?.data ?? r.data ?? []),
  });
  const companies = useMemo(() => (Array.isArray(compResp) ? compResp : []), [compResp]);

  // Departments of the selected company
  const { data: deptResp } = useQuery({
    queryKey: ['company-departments', selectedId],
    queryFn: () => api.get('/departments', { params: { companyId: selectedId, limit: 100 } }).then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!selectedId,
  });
  const departments = useMemo(() => (Array.isArray(deptResp) ? deptResp : []), [deptResp]);

  useEffect(() => {
    if (!companies.length) { setSelectedId(null); return; }
    mirrorToLocalStorage(companies);
    const current = companies.find((c) => c.id === selectedId) || companies[0];
    if (!selectedId || !companies.find((c) => c.id === selectedId)) setSelectedId(current.id);
    setFormData({ ...EMPTY_BRANDING, name: current.name, ...(current.branding || {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, selectedId]);

  const selected = companies.find((c) => c.id === selectedId);

  const save = useMutation({
    mutationFn: () => api.patch(`/companies/${selectedId}`, { name: formData.name, branding: formData }),
    onSuccess: () => { toast.success(`${formData.name} saved`); qc.invalidateQueries({ queryKey: ['companies'] }); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Could not save'),
  });

  const addCompany = useMutation({
    mutationFn: () => api.post('/companies', { name: newName.trim(), branding: { ...EMPTY_BRANDING, name: newName.trim() } }),
    onSuccess: (res) => {
      toast.success('Company created'); setAddOpen(false); setNewName('');
      qc.invalidateQueries({ queryKey: ['companies'] });
      const created = res.data?.data ?? res.data;
      if (created?.id) setSelectedId(created.id);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Could not create company'),
  });

  const addDept = useMutation({
    mutationFn: () => api.post('/departments', { name: newDeptName.trim(), companyId: selectedId }),
    onSuccess: () => { toast.success('Department added'); setNewDeptName(''); qc.invalidateQueries({ queryKey: ['company-departments', selectedId] }); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Could not add department (name may exist)'),
  });

  const delDept = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => { toast.success('Department removed'); qc.invalidateQueries({ queryKey: ['company-departments', selectedId] }); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Could not remove'),
  });

  const set = (k, v) => setFormData((f) => ({ ...f, [k]: v }));
  const setShip = (k, v) => setFormData((f) => ({ ...f, shipping: { ...(f.shipping || {}), [k]: v } }));
  const setIntg = (k, v) => setFormData((f) => ({ ...f, integrations: { ...(f.integrations || {}), [k]: v } }));

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        icon={Building2}
        title="Company Profiles"
        subtitle="Mother company → sub-companies → departments. Each sub-company has its own logo, colors, contacts, invoice design and departments."
        actions={
          <div className="flex items-center gap-2">
            <div className="w-48">
              <Select value={selectedId || ''} onValueChange={setSelectedId}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-900">
                  <SelectValue placeholder={isLoading ? 'Loading…' : 'Select company'} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.branding?.name || c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" /> Company</Button>
          </div>
        }
      />

      {!isLoading && companies.length === 0 && (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="p-10 text-center space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-medium text-slate-700">No sub-companies yet</p>
            <p className="text-sm text-slate-500">Create your first sub-company (e.g. Prodhan.com or Boibari.com).</p>
            <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Company</Button>
          </CardContent>
        </Card>
      )}

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Branding form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b bg-slate-50/60 dark:bg-slate-900/40 pb-4">
                <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="w-4 h-4 text-orange-500" /> Branding</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label>Company Name</Label><Input value={formData.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Tagline</Label><Input value={formData.tagline || ''} onChange={(e) => set('tagline', e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Logo Image URL</Label>
                  <div className="flex gap-4 items-start">
                    <Input className="flex-1" placeholder="https://… logo link" value={formData.logo || ''} onChange={(e) => set('logo', e.target.value)} />
                    {formData.logo && <div className="w-12 h-12 rounded-lg border flex items-center justify-center p-1 bg-white shrink-0"><img src={formData.logo} alt="logo" className="max-w-full max-h-full object-contain" /></div>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label className="flex items-center gap-2"><Palette className="w-3 h-3" /> Primary Color</Label>
                    <div className="flex gap-2"><Input type="color" className="w-12 p-1 h-10" value={formData.primaryColor || '#000000'} onChange={(e) => set('primaryColor', e.target.value)} /><Input className="flex-1 font-mono uppercase" value={formData.primaryColor || ''} onChange={(e) => set('primaryColor', e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label className="flex items-center gap-2"><Palette className="w-3 h-3" /> Secondary Color</Label>
                    <div className="flex gap-2"><Input type="color" className="w-12 p-1 h-10" value={formData.secondaryColor || '#ffffff'} onChange={(e) => set('secondaryColor', e.target.value)} /><Input className="flex-1 font-mono uppercase" value={formData.secondaryColor || ''} onChange={(e) => set('secondaryColor', e.target.value)} /></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b bg-slate-50/60 dark:bg-slate-900/40 pb-4">
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500" /> Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label className="flex items-center gap-2"><Phone className="w-3 h-3" /> Phone</Label><Input value={formData.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="flex items-center gap-2"><Mail className="w-3 h-3" /> Email</Label><Input value={formData.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Head Office Address</Label><Textarea rows={3} value={formData.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
              </CardContent>
            </Card>

            {/* Courier / Shipping — per sub-company webhook (no Supabase needed) */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 border-t-4 border-t-cyan-500">
              <CardHeader className="border-b bg-slate-50/60 dark:bg-slate-900/40 pb-4">
                <CardTitle className="text-base flex items-center gap-2"><Truck className="w-4 h-4 text-cyan-500" /> Courier / Shipping</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <p className="text-sm text-slate-500">
                  When an order for <span className="font-medium">{formData.name || 'this sub-company'}</span> is shipped, it's sent to this courier webhook (n8n / Steadfast). Each sub-company can have its own.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Courier Webhook URL</Label>
                    <Input
                      placeholder="https://…/webhook/…"
                      value={formData.shipping?.webhookUrl || ''}
                      onChange={(e) => setShip('webhookUrl', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={formData.shipping?.provider || 'steadfast'} onValueChange={(v) => setShip('provider', v)}>
                      <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="steadfast">Steadfast</SelectItem>
                        <SelectItem value="pathao">Pathao</SelectItem>
                        <SelectItem value="redx">RedX</SelectItem>
                        <SelectItem value="custom">Custom / n8n</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Tip: changes here save when you press “Save Company”.</p>
              </CardContent>
            </Card>

            {/* Integrations — per sub-company connections (WordPress / WooCommerce / n8n / Facebook) */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 border-t-4 border-t-violet-500">
              <CardHeader className="border-b bg-slate-50/60 dark:bg-slate-900/40 pb-4">
                <CardTitle className="text-base flex items-center gap-2"><Plug className="w-4 h-4 text-violet-500" /> Integrations</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <p className="text-sm text-slate-500">
                  These settings apply only to <span className="font-medium">{formData.name || 'this sub-company'}</span>. Each sub-company can connect to its own WordPress/WooCommerce/n8n/Facebook.
                </p>

                {/* Website / WordPress */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Globe className="w-4 h-4 text-violet-500" /> Website / WordPress
                  </div>
                  <div className="space-y-2">
                    <Label>Website URL</Label>
                    <Input placeholder="https://example.com" value={formData.integrations?.websiteUrl || ''} onChange={(e) => setIntg('websiteUrl', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label>WordPress URL</Label>
                      <Input placeholder="https://example.com/wp-json" value={formData.integrations?.wordpressUrl || ''} onChange={(e) => setIntg('wordpressUrl', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>WordPress API Key</Label>
                      <Input type="password" placeholder="••••••••" value={formData.integrations?.wordpressKey || ''} onChange={(e) => setIntg('wordpressKey', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* WooCommerce */}
                <div className="space-y-4 pt-2 border-t border-dashed">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <ShoppingCart className="w-4 h-4 text-violet-500" /> WooCommerce
                  </div>
                  <div className="space-y-2">
                    <Label>Store URL</Label>
                    <Input placeholder="https://shop.example.com" value={formData.integrations?.woocommerceUrl || ''} onChange={(e) => setIntg('woocommerceUrl', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label>Consumer Key</Label>
                      <Input type="password" placeholder="ck_••••••••" value={formData.integrations?.woocommerceKey || ''} onChange={(e) => setIntg('woocommerceKey', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Consumer Secret</Label>
                      <Input type="password" placeholder="cs_••••••••" value={formData.integrations?.woocommerceSecret || ''} onChange={(e) => setIntg('woocommerceSecret', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Automation (n8n) */}
                <div className="space-y-4 pt-2 border-t border-dashed">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Webhook className="w-4 h-4 text-violet-500" /> Automation (n8n)
                  </div>
                  <div className="space-y-2">
                    <Label>n8n Webhook Base URL</Label>
                    <Input placeholder="https://n8n.example.com/webhook" value={formData.integrations?.n8nWebhookBase || ''} onChange={(e) => setIntg('n8nWebhookBase', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Webhook URL</Label>
                    <Input placeholder="https://…/webhook/…" value={formData.integrations?.customWebhook || ''} onChange={(e) => setIntg('customWebhook', e.target.value)} />
                  </div>
                </div>

                {/* Facebook */}
                <div className="space-y-4 pt-2 border-t border-dashed">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Facebook className="w-4 h-4 text-violet-500" /> Facebook
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label>Page ID</Label>
                      <Input placeholder="1234567890" value={formData.integrations?.facebookPageId || ''} onChange={(e) => setIntg('facebookPageId', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input type="password" placeholder="••••••••" value={formData.integrations?.facebookToken || ''} onChange={(e) => setIntg('facebookToken', e.target.value)} />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400">Tip: changes here save when you press “Save Company”.</p>
              </CardContent>
            </Card>
          </div>

          {/* Invoice + Departments */}
          <div className="space-y-6">
            <Card className="border-2 border-slate-200 dark:border-slate-700 border-t-4 border-t-orange-500">
              <CardHeader className="pb-4"><CardTitle className="text-base flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-orange-500" /> Invoice Template</CardTitle></CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                <Select value={formData.invoice_template || 'design_1_modern'} onValueChange={(v) => set('invoice_template', v)}>
                  <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design_1_modern">Design 1: Modern & Clean</SelectItem>
                    <SelectItem value="design_2_classic">Design 2: Classic Tabular</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full h-11">
                  {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Company
                </Button>
              </CardContent>
            </Card>

            {/* Departments under this sub-company */}
            <Card className="border-2 border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Network className="w-4 h-4 text-orange-500" /> Departments <Badge variant="secondary" className="ml-1">{departments.length}</Badge></CardTitle></CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {departments.length === 0 && <p className="text-sm text-slate-500 px-1">No departments yet for {selected.name}.</p>}
                {departments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="font-medium">{d.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => delDept.mutate(d.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="New department name" onKeyDown={(e) => e.key === 'Enter' && newDeptName.trim() && addDept.mutate()} />
                  <Button onClick={() => addDept.mutate()} disabled={!newDeptName.trim() || addDept.isPending}><Plus className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Sub-Company</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Boibari.com" onKeyDown={(e) => e.key === 'Enter' && newName.trim() && addCompany.mutate()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addCompany.mutate()} disabled={!newName.trim() || addCompany.isPending}>
              {addCompany.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

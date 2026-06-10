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
import {
  Building2, Save, Image as ImageIcon, LayoutTemplate, MapPin, Phone, Mail, Palette, Plus, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_BRANDING = {
  name: '', logo: '', primaryColor: '#EA580C', secondaryColor: '#FFEDD5',
  phone: '', email: '', address: '', tagline: '', invoice_template: 'design_1_modern',
};

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Mirror branding to localStorage so existing invoice components keep working
// offline/instantly. Keyed by both the department slug and raw name.
function mirrorToLocalStorage(departments) {
  try {
    const map = {};
    for (const d of departments) {
      const b = d.branding || {};
      const entry = { ...EMPTY_BRANDING, ...b, name: b.name || d.name };
      map[slugify(d.name)] = entry;
      map[d.name] = entry;
    }
    const prev = JSON.parse(localStorage.getItem('department_branding') || '{}');
    localStorage.setItem('department_branding', JSON.stringify({ ...prev, ...map }));
  } catch { /* non-fatal cache */ }
}

export default function DepartmentProfile() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_BRANDING);
  const [isAddOpen, setAddOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  const { data: resp, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', { params: { limit: 100 } }).then((r) => r.data?.data ?? r.data ?? []),
  });
  const departments = useMemo(() => (Array.isArray(resp) ? resp : []), [resp]);

  // Keep selection + form in sync with loaded data.
  useEffect(() => {
    if (!departments.length) return;
    mirrorToLocalStorage(departments);
    const current = departments.find((d) => d.id === selectedId) || departments[0];
    if (!selectedId) setSelectedId(current.id);
    setFormData({ ...EMPTY_BRANDING, name: current.name, ...(current.branding || {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, selectedId]);

  const selectedDept = departments.find((d) => d.id === selectedId);

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/departments/${selectedId}`, { branding: formData }),
    onSuccess: () => {
      toast.success(`${formData.name || selectedDept?.name} profile saved!`);
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Could not save profile'),
  });

  const addMutation = useMutation({
    mutationFn: () => api.post('/departments', { name: newDeptName.trim(), branding: { ...EMPTY_BRANDING, name: newDeptName.trim() } }),
    onSuccess: (res) => {
      toast.success('Department created');
      setAddOpen(false);
      setNewDeptName('');
      qc.invalidateQueries({ queryKey: ['departments'] });
      const created = res.data?.data ?? res.data;
      if (created?.id) setSelectedId(created.id);
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Could not create department (name may already exist)'),
  });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Department Profiles</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Each department (sub-company) gets its own logo, colors, contacts and invoice design — saved for the whole team.
            </p>
          </div>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="flex-1 sm:w-64">
            <Select value={selectedId || ''} onValueChange={setSelectedId}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 shadow-sm h-11">
                <SelectValue placeholder={isLoading ? 'Loading…' : 'Select Department'} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.branding?.name || d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="h-11" onClick={() => setAddOpen(true)} title="Add department">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isLoading && departments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-slate-600 font-medium">No departments yet</p>
            <p className="text-sm text-slate-500">Create your first department (e.g. your main brand or a sub-company).</p>
            <Button onClick={() => setAddOpen(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-2" /> Add Department
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedDept && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:bg-slate-900/40 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-orange-500" /> General Info & Branding
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Company/Brand Name</Label>
                    <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline / Slogan</Label>
                    <Input value={formData.tagline || ''} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Logo Image URL</Label>
                  <div className="flex gap-4 items-start">
                    <Input
                      className="flex-1"
                      placeholder="https://… (paste a logo image link)"
                      value={formData.logo || ''}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    />
                    {formData.logo && (
                      <div className="w-12 h-12 rounded-lg border border-slate-200 flex items-center justify-center p-1 bg-white shrink-0">
                        <img src={formData.logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Palette className="w-3 h-3" /> Primary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 p-1 h-10 cursor-pointer"
                        value={formData.primaryColor || '#000000'}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })} />
                      <Input className="flex-1 font-mono uppercase"
                        value={formData.primaryColor || ''}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Palette className="w-3 h-3" /> Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 p-1 h-10 cursor-pointer"
                        value={formData.secondaryColor || '#ffffff'}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })} />
                      <Input className="flex-1 font-mono uppercase"
                        value={formData.secondaryColor || ''}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 dark:bg-slate-900/40 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" /> Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Phone className="w-3 h-3" /> Phone Number</Label>
                    <Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="w-3 h-3" /> Email Address</Label>
                    <Input value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Head Office Address</Label>
                  <Textarea rows={3} value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Settings & Preview Sidebar */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm border-t-4 border-t-orange-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-orange-500" /> Invoice Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-5">
                <div className="space-y-2">
                  <Label>Invoice Design Template</Label>
                  <Select
                    value={formData.invoice_template || 'design_1_modern'}
                    onValueChange={(val) => setFormData({ ...formData, invoice_template: val })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design_1_modern">Design 1: Modern & Clean</SelectItem>
                      <SelectItem value="design_2_classic">Design 2: Classic Tabular</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-2">
                    This layout is used for all invoices generated in this department.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="w-full h-11"
                  >
                    {saveMutation.isPending
                      ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      : <Save className="w-4 h-4 mr-2" />}
                    Save Department Profile
                  </Button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Saved to your workspace — visible to your whole team.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mini Preview Box */}
            <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-900/40">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Invoice Header Preview</p>
                <div className="bg-white p-4 rounded border shadow-sm flex gap-3">
                  {formData.logo && (
                    <img src={formData.logo} alt="Logo" className="w-12 h-12 object-contain" />
                  )}
                  <div>
                    <h3 className="font-bold text-lg leading-tight" style={{ color: formData.primaryColor }}>
                      {formData.name || 'Company Name'}
                    </h3>
                    <p className="text-[10px] text-slate-500">{formData.tagline || 'Your Tagline Here'}</p>
                    <p className="text-[9px] mt-1 text-slate-400">{formData.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add department dialog */}
      <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Department / Sub-company name</Label>
            <Input
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="e.g. Boibari.com"
              onKeyDown={(e) => e.key === 'Enter' && newDeptName.trim() && addMutation.mutate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!newDeptName.trim() || addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

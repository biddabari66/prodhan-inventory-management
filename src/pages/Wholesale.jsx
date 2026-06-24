import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Trash2, Pencil, Truck, Library, BookOpen, Wallet, AlertCircle,
  Package, Receipt, Users, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { TableSkeleton, StatGridSkeleton, ErrorState } from '@/components/common/Skeletons';

const bdt = (n) => '৳' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 });
const num = (n) => Number(n || 0).toLocaleString('en-BD');

const BUYER_TYPES = [
  { value: 'library', label: 'Library' },
  { value: 'publication', label: 'Publication' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'other', label: 'Other' },
];
const BUYER_TYPE_LABEL = Object.fromEntries(BUYER_TYPES.map((t) => [t.value, t.label]));
const BUYER_TYPE_STYLE = {
  library: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  publication: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  distributor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const STATUS_STYLE = {
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  due: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};
const STATUS_LABEL = { paid: 'Paid', partial: 'Partial', due: 'Due' };

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
const lastOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

function suggestStatus(paid, total) {
  const p = Number(paid || 0);
  const t = Number(total || 0);
  if (t > 0 && p >= t) return 'paid';
  if (p > 0) return 'partial';
  return 'due';
}

const emptyItem = () => ({ bookTitle: '', quantity: '', unitPrice: '' });
const emptyForm = () => ({
  id: null,
  date: todayISO(),
  buyerType: 'library',
  buyerName: '',
  items: [emptyItem()],
  paidAmount: '',
  paymentStatus: 'due',
  statusTouched: false,
  notes: '',
});

export default function Wholesale() {
  const qc = useQueryClient();

  // --- Date range + filters (drive query params) ---
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(todayISO());
  const [buyerType, setBuyerType] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  const listParams = useMemo(() => {
    const p = { dateFrom, dateTo };
    if (buyerType !== 'all') p.buyerType = buyerType;
    if (paymentStatus !== 'all') p.paymentStatus = paymentStatus;
    return p;
  }, [dateFrom, dateTo, buyerType, paymentStatus]);

  const statsParams = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);

  const setPreset = (preset) => {
    if (preset === 'today') {
      setDateFrom(todayISO());
      setDateTo(todayISO());
    } else if (preset === 'thisMonth') {
      setDateFrom(firstOfMonth());
      setDateTo(todayISO());
    } else if (preset === 'lastMonth') {
      const d = new Date();
      const lm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      setDateFrom(firstOfMonth(lm));
      setDateTo(lastOfMonth(lm));
    }
  };

  // --- Queries ---
  const listQuery = useQuery({
    queryKey: ['wholesale', listParams],
    queryFn: () => api.get('/wholesale', { params: listParams }).then((r) => r.data),
    retry: false,
  });

  const statsQuery = useQuery({
    queryKey: ['wholesale-stats', statsParams],
    queryFn: () => api.get('/wholesale/stats', { params: statsParams }).then((r) => r.data),
    retry: false,
  });

  const entries = Array.isArray(listQuery.data?.data) ? listQuery.data.data : [];
  const stats = statsQuery.data?.data || {};
  const byBuyer = Array.isArray(stats.byBuyer) ? stats.byBuyer : [];

  // --- Dialog / form ---
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const formTotals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    for (const it of form.items) {
      const q = Number(it.quantity || 0);
      const u = Number(it.unitPrice || 0);
      qty += q;
      amount += q * u;
    }
    return { qty, amount };
  }, [form.items]);

  const openCreate = () => {
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (e) => {
    setForm({
      id: e.id,
      date: e.date ? String(e.date).slice(0, 10) : todayISO(),
      buyerType: e.buyerType || 'library',
      buyerName: e.buyerName || '',
      items:
        Array.isArray(e.items) && e.items.length
          ? e.items.map((it) => ({
              bookTitle: it.bookTitle || '',
              quantity: it.quantity ?? '',
              unitPrice: it.unitPrice ?? '',
            }))
          : [emptyItem()],
      paidAmount: e.paidAmount ?? '',
      paymentStatus: e.paymentStatus || 'due',
      statusTouched: true,
      notes: e.notes || '',
    });
    setOpen(true);
  };

  const setItem = (idx, key, value) => {
    setForm((f) => {
      const items = f.items.map((it, i) => (i === idx ? { ...it, [key]: value } : it));
      const next = { ...f, items };
      if (!f.statusTouched) {
        let amount = 0;
        for (const it of items) amount += Number(it.quantity || 0) * Number(it.unitPrice || 0);
        next.paymentStatus = suggestStatus(f.paidAmount, amount);
      }
      return next;
    });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) =>
    setForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items,
    }));

  const setPaid = (value) =>
    setForm((f) => ({
      ...f,
      paidAmount: value,
      paymentStatus: f.statusTouched ? f.paymentStatus : suggestStatus(value, formTotals.amount),
    }));

  const buildPayload = () => {
    const items = form.items
      .filter((it) => it.bookTitle.trim() || it.quantity || it.unitPrice)
      .map((it) => {
        const quantity = Number(it.quantity || 0);
        const unitPrice = Number(it.unitPrice || 0);
        return { bookTitle: it.bookTitle.trim(), quantity, unitPrice, subtotal: quantity * unitPrice };
      });
    const totalQuantity = items.reduce((s, it) => s + it.quantity, 0);
    const totalAmount = items.reduce((s, it) => s + it.subtotal, 0);
    return {
      date: form.date,
      buyerType: form.buyerType,
      buyerName: form.buyerName.trim(),
      items,
      totalQuantity,
      totalAmount,
      paidAmount: Number(form.paidAmount || 0),
      paymentStatus: form.paymentStatus,
      notes: form.notes.trim(),
    };
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      form.id ? api.patch(`/wholesale/${form.id}`, payload) : api.post('/wholesale', payload),
    onSuccess: () => {
      toast.success(form.id ? 'Wholesale entry updated' : 'Wholesale entry added');
      qc.invalidateQueries({ queryKey: ['wholesale'] });
      qc.invalidateQueries({ queryKey: ['wholesale-stats'] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/wholesale/${id}`),
    onSuccess: () => {
      toast.success('Entry deleted');
      qc.invalidateQueries({ queryKey: ['wholesale'] });
      qc.invalidateQueries({ queryKey: ['wholesale-stats'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete entry');
    },
  });

  const handleSubmit = () => {
    const payload = buildPayload();
    if (!payload.buyerName) return toast.error('Buyer name is required');
    if (!payload.items.length) return toast.error('Add at least one book line');
    if (payload.items.some((it) => !it.bookTitle)) return toast.error('Every line needs a book title');
    saveMutation.mutate(payload);
  };

  const handleDelete = (e) => {
    if (window.confirm(`Delete wholesale entry for "${e.buyerName}"? This cannot be undone.`)) {
      deleteMutation.mutate(e.id);
    }
  };

  const dueOf = (e) => Number(e.totalAmount || 0) - Number(e.paidAmount || 0);

  // --- Stat cards ---
  const statCards = [
    { label: 'Total Distributed', value: bdt(stats.totalAmount), icon: Truck, accent: 'text-orange-600' },
    { label: 'Paid', value: bdt(stats.totalPaid), icon: Wallet, accent: 'text-emerald-600' },
    { label: 'Due', value: bdt(stats.totalDue), icon: AlertCircle, accent: 'text-rose-600' },
    { label: 'Total Books', value: num(stats.totalQuantity), icon: Package, accent: 'text-blue-600' },
    { label: 'Entries', value: num(stats.totalEntries), icon: Receipt, accent: 'text-purple-600' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Truck}
        title="Wholesale / Distribution"
        subtitle="Boibari — books distributed to libraries & publications"
        actions={
          <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> New Entry
          </Button>
        }
      />

      {/* Date range filter */}
      <Card className="border-2 border-orange-100 dark:border-orange-900/40">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">From</Label>
                <Input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">To</Label>
                <Input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreset('today')}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('thisMonth')}>This Month</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('lastMonth')}>Last Month</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3 lg:ml-auto">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Buyer Type</Label>
                <Select value={buyerType} onValueChange={setBuyerType}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {BUYER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Payment</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat row */}
      {statsQuery.isLoading ? (
        <StatGridSkeleton count={5} />
      ) : statsQuery.isError ? (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <ErrorState message="Couldn't load wholesale stats." onRetry={() => statsQuery.refetch()} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border-2 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">{s.label}</p>
                    <Icon className={`w-4 h-4 ${s.accent}`} />
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Entries table */}
        <Card className="xl:col-span-2 border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-600" /> Distribution Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {listQuery.isLoading ? (
              <TableSkeleton rows={6} cols={7} />
            ) : listQuery.isError ? (
              <ErrorState message="Couldn't load wholesale entries." onRetry={() => listQuery.refetch()} />
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <Truck className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-500">No wholesale entries for this period.</p>
                <Button variant="outline" size="sm" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add the first entry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Books</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {e.date ? String(e.date).slice(0, 10) : '—'}
                        </TableCell>
                        <TableCell className="font-medium">{e.buyerName || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={BUYER_TYPE_STYLE[e.buyerType] || BUYER_TYPE_STYLE.other}>
                            {BUYER_TYPE_LABEL[e.buyerType] || e.buyerType || 'Other'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{num(e.totalQuantity)}</TableCell>
                        <TableCell className="text-right font-medium">{bdt(e.totalAmount)}</TableCell>
                        <TableCell className="text-right text-emerald-700 dark:text-emerald-400">{bdt(e.paidAmount)}</TableCell>
                        <TableCell className="text-right text-rose-700 dark:text-rose-400">{bdt(dueOf(e))}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={STATUS_STYLE[e.paymentStatus] || STATUS_STYLE.due}>
                            {STATUS_LABEL[e.paymentStatus] || e.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:text-rose-700"
                              onClick={() => handleDelete(e)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Buyer summary */}
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" /> Top Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : byBuyer.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No buyer activity in this period.</p>
            ) : (
              <ul className="space-y-2">
                {byBuyer.slice(0, 8).map((b, i) => (
                  <li
                    key={`${b.buyerName}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{b.buyerName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{bdt(b.amount)}</div>
                      <div className="text-xs text-slate-500">{num(b.qty)} books</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Wholesale Entry' : 'New Wholesale Entry'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Buyer Type</Label>
                <Select value={form.buyerType} onValueChange={(v) => setForm((f) => ({ ...f, buyerType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUYER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Buyer Name</Label>
                <Input
                  placeholder="e.g. Central Public Library"
                  value={form.buyerName}
                  onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                />
              </div>
            </div>

            {/* Line items editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Books</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, idx) => {
                  const sub = Number(it.quantity || 0) * Number(it.unitPrice || 0);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-5"
                        placeholder="Book title"
                        value={it.bookTitle}
                        onChange={(e) => setItem(idx, 'bookTitle', e.target.value)}
                      />
                      <Input
                        className="col-span-2"
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                      />
                      <Input
                        className="col-span-2"
                        type="number"
                        min="0"
                        placeholder="Unit ৳"
                        value={it.unitPrice}
                        onChange={(e) => setItem(idx, 'unitPrice', e.target.value)}
                      />
                      <div className="col-span-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                        {bdt(sub)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="col-span-1 h-8 w-8 text-rose-600"
                        onClick={() => removeItem(idx)}
                        disabled={form.items.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-end gap-6 rounded-lg bg-orange-50 dark:bg-orange-950/30 px-3 py-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Total books: <b>{num(formTotals.qty)}</b></span>
                <span className="text-slate-900 dark:text-white font-semibold">Total: {bdt(formTotals.amount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Paid Amount (৳)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.paidAmount}
                  onChange={(e) => setPaid(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Payment Status</Label>
                <Select
                  value={form.paymentStatus}
                  onValueChange={(v) => setForm((f) => ({ ...f, paymentStatus: v, statusTouched: true }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                placeholder="Optional notes (delivery details, contact, etc.)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {form.id ? 'Save Changes' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

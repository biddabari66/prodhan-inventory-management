import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus, Check, X, FileText, Printer, Receipt, Stamp, Loader2, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { printExpenseInvoice, printRequisition } from '@/components/finance/expenseDocuments';
import PageHeader from '@/components/common/PageHeader';

const bdt = (n) => '৳' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 });

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
};
const REQ_COLORS = {
  pending_md: 'bg-blue-100 text-blue-800',
  signed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const PAYMENT_METHODS = ['COD', 'BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER', 'CARD'];

export default function Expenses() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [isFormOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    category: '', subCategory: '', amount: '', date: new Date().toISOString().slice(0, 10),
    description: '', departmentId: '', paymentMethod: 'BANK_TRANSFER',
  });

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => erp.auth.me(), staleTime: 300000 });
  const isAdmin = me?.role === 'admin' || ['SUPER_ADMIN', 'ADMIN'].includes(me?.job_role);
  const isMD = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_HEAD'].includes(me?.job_role) || me?.role === 'admin';

  const { data: deptResp } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data?.data ?? r.data ?? []),
    retry: false,
  });
  const departments = Array.isArray(deptResp) ? deptResp : [];

  const { data: resp, isLoading } = useQuery({
    queryKey: ['expenses', tab],
    queryFn: () =>
      api.get('/finance/expenses', { params: tab === 'all' ? { limit: 200 } : { status: tab.toUpperCase(), limit: 200 } })
        .then((r) => r.data),
  });
  const expenses = resp?.data ?? [];

  const submit = useMutation({
    mutationFn: (payload) => api.post('/finance/expenses', payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Expense submitted for approval');
      setFormOpen(false);
      setForm({ category: '', subCategory: '', amount: '', date: new Date().toISOString().slice(0, 10), description: '', departmentId: '', paymentMethod: 'CASH' });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to submit'),
  });

  const act = useMutation({
    mutationFn: ({ id, action, body }) => api.patch(`/finance/expenses/${id}/${action}`, body || {}).then((r) => r.data),
    onSuccess: (_d, v) => {
      toast.success(`Expense ${v.action.replace('-', ' ')} done`);
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Action failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || !form.description) {
      toast.error('Category, amount and description are required');
      return;
    }
    submit.mutate({
      ...form,
      amount: parseFloat(form.amount),
      departmentId: form.departmentId || undefined,
    });
  };

  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        icon={Wallet}
        title="Expenses"
        subtitle="Submit expenses, get admin approval, generate invoices & MD requisitions."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Submit Expense
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Department</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 text-right font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Requisition</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                  )}
                  {!isLoading && expenses.length === 0 && (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No expenses yet</td></tr>
                  )}
                  {expenses.map((ex) => (
                    <tr key={ex.id} className="border-b last:border-0 align-top">
                      <td className="p-3 whitespace-nowrap">{ex.date ? format(new Date(ex.date), 'dd MMM yyyy') : '—'}</td>
                      <td className="p-3">
                        <div className="font-medium">{ex.category}</div>
                        {ex.subCategory && <div className="text-xs text-muted-foreground">{ex.subCategory}</div>}
                      </td>
                      <td className="p-3">{ex.department?.name || deptName(ex.departmentId)}</td>
                      <td className="p-3 max-w-[220px]">{ex.description}</td>
                      <td className="p-3 text-right font-semibold">{bdt(ex.amount)}</td>
                      <td className="p-3">
                        <Badge className={STATUS_COLORS[ex.status] || ''} variant="secondary">{ex.status}</Badge>
                      </td>
                      <td className="p-3">
                        {ex.requisitionStatus && ex.requisitionStatus !== 'none' ? (
                          <Badge className={REQ_COLORS[ex.requisitionStatus] || ''} variant="secondary">
                            {ex.requisitionStatus === 'pending_md' ? 'Awaiting MD' :
                             ex.requisitionStatus === 'signed' ? 'MD Signed' : 'MD Rejected'}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {ex.status === 'PENDING' && isAdmin && (
                            <>
                              <Button size="sm" variant="outline" className="h-8 text-emerald-600"
                                onClick={() => act.mutate({ id: ex.id, action: 'approve' })}>
                                <Check className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-rose-600"
                                onClick={() => act.mutate({ id: ex.id, action: 'reject' })}>
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {ex.status === 'APPROVED' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-8"
                                onClick={() => printExpenseInvoice(ex, me)}>
                                <Receipt className="h-3.5 w-3.5" /> Invoice
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8"
                                onClick={() => printRequisition(ex, me)}>
                                <FileText className="h-3.5 w-3.5" /> Requisition
                              </Button>
                              {ex.requisitionStatus === 'pending_md' && isMD && (
                                <Button size="sm" variant="outline" className="h-8 text-indigo-600"
                                  onClick={() => act.mutate({ id: ex.id, action: 'sign-requisition', body: { action: 'sign' } })}>
                                  <Stamp className="h-3.5 w-3.5" /> MD Sign
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit dialog */}
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Office Supplies" />
              </div>
              <div className="space-y-1">
                <Label>Sub-category</Label>
                <Input value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Amount (৳) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

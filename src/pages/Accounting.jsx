import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Trash2, Check, X, Loader2, BookOpen, Scale, Layers, ListTree,
  TrendingUp, TrendingDown, Wallet, FileText, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PageHeader from '@/components/common/PageHeader';
import SharedStatCard from '@/components/common/StatCard';

const bdt = (n) =>
  '৳' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

const TYPE_BADGE = {
  ASSET: 'bg-amber-100 text-amber-800 border-amber-200',
  LIABILITY: 'bg-rose-100 text-rose-800 border-rose-200',
  EQUITY: 'bg-violet-100 text-violet-800 border-violet-200',
  INCOME: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  EXPENSE: 'bg-orange-100 text-orange-800 border-orange-200',
};

const SOURCE_BADGE = {
  MANUAL: 'bg-slate-100 text-slate-700',
  SALE: 'bg-emerald-100 text-emerald-700',
  PURCHASE: 'bg-blue-100 text-blue-700',
  EXPENSE: 'bg-orange-100 text-orange-700',
  PAYROLL: 'bg-violet-100 text-violet-700',
};

const safeDate = (v) => {
  try {
    return format(new Date(v), 'dd MMM yyyy');
  } catch {
    return String(v ?? '');
  }
};

function fmtDate(v) {
  if (!v) return '';
  return safeDate(v);
}

// ---------- Reusable summary stat (shared design-system StatCard) ----------
const STAT_TONE = { amber: 'orange', emerald: 'green', rose: 'red', slate: 'slate' };
function StatCard({ label, value, icon, tone = 'amber', index = 0 }) {
  return (
    <SharedStatCard
      icon={icon}
      label={label}
      value={value}
      tone={STAT_TONE[tone] || 'orange'}
      index={index}
    />
  );
}

function BalancedPill({ balanced }) {
  return balanced ? (
    <Badge className="gap-1 border-emerald-200 bg-emerald-100 text-emerald-800">
      <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
    </Badge>
  ) : (
    <Badge className="gap-1 border-rose-200 bg-rose-100 text-rose-800">
      <AlertTriangle className="h-3.5 w-3.5" /> Unbalanced
    </Badge>
  );
}

// ======================================================================
// OVERVIEW / REPORTS
// ======================================================================
function OverviewTab() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const pl = useQuery({
    queryKey: ['acc-pl', dateFrom, dateTo],
    queryFn: () =>
      api.get('/accounting/profit-loss', { params: { dateFrom, dateTo } }).then((r) => r.data),
  });

  const bs = useQuery({
    queryKey: ['acc-bs', dateTo],
    queryFn: () =>
      api.get('/accounting/balance-sheet', { params: { dateTo } }).then((r) => r.data),
  });

  const p = pl.data || {};
  const b = bs.data || {};

  return (
    <div className="space-y-5">
      {/* Date filter */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* P&L cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Income" value={bdt(p.totalIncome)} icon={TrendingUp} tone="emerald" />
        <StatCard label="Total Expense" value={bdt(p.totalExpense)} icon={TrendingDown} tone="rose" />
        <StatCard
          label="Net Profit"
          value={bdt(p.netProfit)}
          icon={Wallet}
          tone={Number(p.netProfit) >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* P&L breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income</CardTitle>
            <CardDescription>Profit &amp; loss for the selected range</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownTable rows={p.income} total={p.totalIncome} loading={pl.isLoading} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expense</CardTitle>
            <CardDescription>Profit &amp; loss for the selected range</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownTable rows={p.expense} total={p.totalExpense} loading={pl.isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Balance sheet summary */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Balance Sheet</CardTitle>
            <CardDescription>As of {fmtDate(dateTo)}</CardDescription>
          </div>
          {!bs.isLoading && <BalancedPill balanced={!!b.balanced} />}
        </CardHeader>
        <CardContent className="space-y-4">
          {bs.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-amber-50/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total Assets</p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">{bdt(b.totalAssets)}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Liabilities + Equity</p>
                  <p className="mt-1 text-2xl font-bold text-slate-700">
                    {bdt(Number(b.totalLiabilities || 0) + Number(b.totalEquity || 0))}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <BSGroup title="Assets" rows={b.assets} total={b.totalAssets} />
                <BSGroup title="Liabilities" rows={b.liabilities} total={b.totalLiabilities} />
                <BSGroup
                  title="Equity"
                  rows={b.equity}
                  total={b.totalEquity}
                  footNote={b.retainedEarnings != null ? `Retained earnings: ${bdt(b.retainedEarnings)}` : null}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownTable({ rows, total, loading }) {
  if (loading) return <Skeleton className="h-24 w-full" />;
  const list = Array.isArray(rows) ? rows : [];
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                No data
              </TableCell>
            </TableRow>
          ) : (
            list.map((r) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right tabular-nums">{bdt(r.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{bdt(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function BSGroup({ title, rows, total, footNote }) {
  const list = Array.isArray(rows) ? rows : [];
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="space-y-1.5">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground">No accounts</p>
        ) : (
          list.map((r) => (
            <div key={r.code} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-muted-foreground">
                <span className="font-mono text-xs">{r.code}</span> {r.name}
              </span>
              <span className="tabular-nums">{bdt(r.balance)}</span>
            </div>
          ))
        )}
      </div>
      {footNote && <p className="mt-2 text-xs text-muted-foreground">{footNote}</p>}
      <Separator className="my-2" />
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>Total {title}</span>
        <span className="tabular-nums">{bdt(total)}</span>
      </div>
    </div>
  );
}

// ======================================================================
// TRIAL BALANCE
// ======================================================================
function TrialBalanceTab() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const tb = useQuery({
    queryKey: ['acc-tb', dateFrom, dateTo],
    queryFn: () =>
      api.get('/accounting/trial-balance', { params: { dateFrom, dateTo } }).then((r) => r.data),
  });

  const data = tb.data || {};
  const rows = Array.isArray(data.rows) ? data.rows : [];

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label>From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <Label>To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Trial Balance</CardTitle>
          {!tb.isLoading && <BalancedPill balanced={!!data.balanced} />}
        </CardHeader>
        <CardContent>
          {tb.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.code}>
                        <TableCell className="font-mono text-xs">{r.code}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${TYPE_BADGE[r.type] || ''}`}>
                            {r.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(r.debit) ? bdt(r.debit) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(r.credit) ? bdt(r.credit) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">Totals</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{bdt(data.totalDebit)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{bdt(data.totalCredit)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ======================================================================
// CHART OF ACCOUNTS
// ======================================================================
function ChartOfAccountsTab({ accounts, loading }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'ASSET' });
  const [ledgerAccount, setLedgerAccount] = useState(null);

  const create = useMutation({
    mutationFn: (payload) => api.post('/accounting/accounts', payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Account created');
      qc.invalidateQueries({ queryKey: ['acc-accounts'] });
      setAddOpen(false);
      setForm({ code: '', name: '', type: 'ASSET' });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to create account'),
  });

  const grouped = useMemo(() => {
    const g = {};
    ACCOUNT_TYPES.forEach((t) => (g[t] = []));
    (accounts || []).forEach((a) => {
      (g[a.type] = g[a.type] || []).push(a);
    });
    Object.values(g).forEach((arr) => arr.sort((x, y) => String(x.code).localeCompare(String(y.code))));
    return g;
  }, [accounts]);

  const submit = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    create.mutate({ code: form.code.trim(), name: form.name.trim(), type: form.type });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(accounts || []).length} account{(accounts || []).length === 1 ? '' : 's'}
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Account</DialogTitle>
              <DialogDescription>Create a new chart-of-accounts entry.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Code</Label>
                <Input
                  placeholder="e.g. 1010"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Cash in Hand"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={submit} disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ACCOUNT_TYPES.map((type) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className={TYPE_BADGE[type]}>
                    {type}
                  </Badge>
                  <span className="text-muted-foreground">({grouped[type].length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {grouped[type].length === 0 ? (
                  <p className="text-xs text-muted-foreground">No accounts</p>
                ) : (
                  grouped[type].map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setLedgerAccount(a)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-amber-50"
                    >
                      <span className="truncate">
                        <span className="font-mono text-xs text-muted-foreground">{a.code}</span> {a.name}
                      </span>
                      {a.isActive === false && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          inactive
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GeneralLedgerDrawer account={ledgerAccount} onClose={() => setLedgerAccount(null)} />
    </div>
  );
}

function GeneralLedgerDrawer({ account, onClose }) {
  const open = !!account;
  const gl = useQuery({
    queryKey: ['acc-ledger', account?.id],
    enabled: open,
    queryFn: () =>
      api.get('/accounting/general-ledger', { params: { accountId: account.id } }).then((r) => r.data),
  });
  const rows = Array.isArray(gl.data?.data) ? gl.data.data : [];

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-600" />
            {account ? (
              <>
                <span className="font-mono text-sm text-muted-foreground">{account.code}</span> {account.name}
              </>
            ) : (
              'Ledger'
            )}
          </DrawerTitle>
          <DrawerDescription>General ledger — running balance</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[60vh] overflow-auto px-4 pb-2">
          {gl.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        No transactions
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="block truncate">{r.description}</span>
                          {r.reference && (
                            <span className="text-xs text-muted-foreground">{r.reference}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.source && (
                            <Badge variant="outline" className={`text-[10px] ${SOURCE_BADGE[r.source] || ''}`}>
                              {r.source}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(r.debit) ? bdt(r.debit) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(r.credit) ? bdt(r.credit) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{bdt(r.balance)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ======================================================================
// JOURNAL
// ======================================================================
const emptyLine = () => ({ accountCode: '', debit: '', credit: '', description: '' });

function JournalTab({ accounts }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [header, setHeader] = useState({ date: today(), description: '', reference: '' });
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);

  const journal = useQuery({
    queryKey: ['acc-journal'],
    queryFn: () => api.get('/accounting/journal').then((r) => r.data),
  });
  const entries = Array.isArray(journal.data?.data) ? journal.data.data : [];

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const filledLines = lines.filter((l) => l.accountCode && (parseFloat(l.debit) || parseFloat(l.credit)));
  const balanced =
    filledLines.length >= 2 &&
    totalDebit > 0 &&
    Math.abs(totalDebit - totalCredit) < 0.005;

  const reset = () => {
    setHeader({ date: today(), description: '', reference: '' });
    setLines([emptyLine(), emptyLine()]);
  };

  const create = useMutation({
    mutationFn: (payload) => api.post('/accounting/journal', payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Journal entry posted');
      qc.invalidateQueries({ queryKey: ['acc-journal'] });
      qc.invalidateQueries({ queryKey: ['acc-tb'] });
      qc.invalidateQueries({ queryKey: ['acc-pl'] });
      qc.invalidateQueries({ queryKey: ['acc-bs'] });
      qc.invalidateQueries({ queryKey: ['acc-ledger'] });
      setOpen(false);
      reset();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to post entry'),
  });

  const updateLine = (idx, patch) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (idx) => setLines((ls) => (ls.length <= 2 ? ls : ls.filter((_, i) => i !== idx)));

  const submit = () => {
    if (!balanced) return;
    const payload = {
      date: header.date || undefined,
      description: header.description || undefined,
      reference: header.reference || undefined,
      lines: filledLines.map((l) => ({
        accountCode: l.accountCode,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || undefined,
      })),
    };
    create.mutate(payload);
  };

  const entryTotal = (e) =>
    (e.lines || []).reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{entries.length} recent entries</p>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4" /> New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Journal Entry</DialogTitle>
              <DialogDescription>Debits must equal credits, with at least two lines.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={header.date}
                    onChange={(e) => setHeader((h) => ({ ...h, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Reference</Label>
                  <Input
                    placeholder="optional"
                    value={header.reference}
                    onChange={(e) => setHeader((h) => ({ ...h, reference: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <Label>Description</Label>
                  <Input
                    placeholder="optional"
                    value={header.description}
                    onChange={(e) => setHeader((h) => ({ ...h, description: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Lines editor */}
              <div className="max-h-[40vh] space-y-2 overflow-auto">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      {idx === 0 && <Label className="text-xs">Account</Label>}
                      <Select
                        value={line.accountCode}
                        onValueChange={(v) => updateLine(idx, { accountCode: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {(accounts || []).map((a) => (
                            <SelectItem key={a.id} value={a.code}>
                              <span className="font-mono text-xs">{a.code}</span> {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1">
                      {idx === 0 && <Label className="text-xs">Debit</Label>}
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={line.debit}
                        onChange={(e) =>
                          updateLine(idx, { debit: e.target.value, credit: e.target.value ? '' : line.credit })
                        }
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      {idx === 0 && <Label className="text-xs">Credit</Label>}
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={line.credit}
                        onChange={(e) =>
                          updateLine(idx, { credit: e.target.value, debit: e.target.value ? '' : line.debit })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-rose-500 hover:text-rose-600"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
                <Plus className="h-3.5 w-3.5" /> Add line
              </Button>

              {/* Live totals */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex gap-4">
                  <span>
                    Debit: <strong className="tabular-nums">{bdt(totalDebit)}</strong>
                  </span>
                  <span>
                    Credit: <strong className="tabular-nums">{bdt(totalCredit)}</strong>
                  </span>
                </div>
                {balanced ? (
                  <Badge className="gap-1 border-emerald-200 bg-emerald-100 text-emerald-800">
                    <Check className="h-3.5 w-3.5" /> Balanced
                  </Badge>
                ) : (
                  <Badge className="gap-1 border-rose-200 bg-rose-100 text-rose-800">
                    <X className="h-3.5 w-3.5" /> Not balanced
                  </Badge>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="gap-2 bg-amber-600 hover:bg-amber-700"
                onClick={submit}
                disabled={!balanced || create.isPending}
              >
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Post Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {journal.isLoading ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No journal entries yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap">{fmtDate(e.date)}</TableCell>
                        <TableCell className="max-w-[260px]">
                          <span className="block truncate">{e.description || '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {(e.lines || []).length} lines
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.reference || '—'}</TableCell>
                        <TableCell>
                          {e.source && (
                            <Badge variant="outline" className={`text-[10px] ${SOURCE_BADGE[e.source] || ''}`}>
                              {e.source}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {bdt(entryTotal(e))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ======================================================================
// PAGE
// ======================================================================
export default function Accounting() {
  const [tab, setTab] = useState('overview');

  const accountsQuery = useQuery({
    queryKey: ['acc-accounts'],
    queryFn: () => api.get('/accounting/accounts').then((r) => r.data),
  });
  const accounts = Array.isArray(accountsQuery.data?.data) ? accountsQuery.data.data : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Scale}
        title="Accounting"
        subtitle="Double-entry ledger, journal & financial reports"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="overview" className="gap-1.5">
            <FileText className="h-4 w-4" /> Reports
          </TabsTrigger>
          <TabsTrigger value="trial" className="gap-1.5">
            <Scale className="h-4 w-4" /> Trial Balance
          </TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5">
            <ListTree className="h-4 w-4" /> Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5">
            <Layers className="h-4 w-4" /> Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="trial" className="mt-5">
          <TrialBalanceTab />
        </TabsContent>
        <TabsContent value="chart" className="mt-5">
          <ChartOfAccountsTab accounts={accounts} loading={accountsQuery.isLoading} />
        </TabsContent>
        <TabsContent value="journal" className="mt-5">
          <JournalTab accounts={accounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

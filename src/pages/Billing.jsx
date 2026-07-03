import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Check, Smartphone, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_VARIANTS = {
  ACTIVE: 'default',
  TRIAL: 'secondary',
  PAST_DUE: 'destructive',
  CANCELED: 'outline',
  SUSPENDED: 'destructive',
  PENDING: 'secondary',
  VERIFIED: 'default',
  REJECTED: 'destructive',
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return '—';
  }
};

const taka = (n) => `৳${Number(n || 0).toLocaleString('en-BD')}`;

const paymentSchema = z.object({
  periodMonths: z.string().min(1),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  senderNumber: z.string().optional(),
  trxId: z.string().min(1, 'Transaction ID is required'),
});

export default function Billing() {
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '', senderNumber: '', trxId: '', periodMonths: '1' }
  });

  const { data: plansData } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => (await api.get('/billing/plans')).data,
  });

  const { data: subscription } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: async () => (await api.get('/billing/subscription')).data,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['billing-payments'],
    queryFn: async () => (await api.get('/billing/payments')).data,
  });

  const plans = plansData?.plans || [];
  const bkashNumber = plansData?.bkashNumber || '01XXXXXXXXX';

  const submitMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/billing/payments', payload)).data,
    onSuccess: () => {
      toast.success('Payment submitted — pending verification');
      setPayOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to submit payment');
    },
  });

  const openPayDialog = (plan) => {
    setSelectedPlan(plan);
    setValue('amount', plan.priceBDT);
    setPayOpen(true);
  };

  const onSubmit = (data) => {
    submitMutation.mutate({
      plan: selectedPlan?.id,
      periodMonths: parseInt(data.periodMonths, 10) || 1,
      trxId: data.trxId.trim(),
      senderNumber: data.senderNumber?.trim() || undefined,
      amount: parseFloat(data.amount) || 0,
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and pay with bKash.</p>
      </div>

      {/* Current subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-sm text-muted-foreground">Plan</div>
            <div className="text-lg font-semibold">{subscription?.plan || '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <Badge variant={STATUS_VARIANTS[subscription?.status] || 'secondary'}>
              {subscription?.status || '—'}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              {subscription?.status === 'TRIAL' ? 'Trial ends' : 'Renews / expires'}
            </div>
            <div className="text-lg font-semibold">
              {subscription?.status === 'TRIAL'
                ? fmtDate(subscription?.trialEndsAt)
                : fmtDate(subscription?.subscriptionEnd)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.id;
          return (
            <Card key={plan.id} className={isCurrent ? 'border-primary ring-1 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{taka(plan.priceBDT)}</span>
                  {plan.priceBDT > 0 && <span className="text-muted-foreground"> / month</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.priceBDT > 0 && (
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    onClick={() => openPayDialog(plan)}
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    {isCurrent ? 'Renew with bKash' : 'Upgrade / Pay with bKash'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No payments yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.createdAt)}</TableCell>
                    <TableCell>{p.plan}</TableCell>
                    <TableCell>{taka(p.amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.trxId}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[p.status] || 'secondary'}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay with bKash — {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Send money to bKash: <span className="font-semibold text-foreground">{bkashNumber}</span>,
              then enter the transaction details below for verification.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Billing period</Label>
              <Controller
                name="periodMonths"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="period"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 month</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (৳)</Label>
              <Input
                id="amount"
                type="number"
                {...register('amount')}
              />
              {errors.amount && <span className="text-xs text-red-500">{errors.amount.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender">Your bKash number (sender)</Label>
              <Input
                id="sender"
                {...register('senderNumber')}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trxId">Transaction ID (TrxID)</Label>
              <Input
                id="trxId"
                {...register('trxId')}
                placeholder="e.g. 9HK4XXXXXX"
              />
              {errors.trxId && <span className="text-xs text-red-500">{errors.trxId.message}</span>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Submit payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

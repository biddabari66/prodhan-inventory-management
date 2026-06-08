import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_VARIANTS = {
  PENDING: 'secondary',
  VERIFIED: 'default',
  REJECTED: 'destructive',
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy, HH:mm');
  } catch {
    return '—';
  }
};

const taka = (n) => `৳${Number(n || 0).toLocaleString('en-BD')}`;

export default function BillingAdmin() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [actionDialog, setActionDialog] = useState(null); // { payment, action }
  const [notes, setNotes] = useState('');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter],
    queryFn: async () => {
      const params = statusFilter === 'ALL' ? {} : { status: statusFilter };
      return (await api.get('/billing/admin/payments', { params })).data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, action, notes }) =>
      (await api.patch(`/billing/admin/payments/${id}/verify`, { action, notes })).data,
    onSuccess: (_data, vars) => {
      toast.success(vars.action === 'verify' ? 'Payment verified' : 'Payment rejected');
      setActionDialog(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Action failed');
    },
  });

  const openAction = (payment, action) => {
    setActionDialog({ payment, action });
    setNotes('');
  };

  const confirmAction = () => {
    if (!actionDialog) return;
    verifyMutation.mutate({
      id: actionDialog.payment.id,
      action: actionDialog.action,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Verification</h1>
          <p className="text-muted-foreground">Review and verify tenant bKash payments.</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Months</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>TrxID</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{fmtDate(p.createdAt)}</TableCell>
                    <TableCell>{p.tenant?.name || p.tenantId}</TableCell>
                    <TableCell>{p.plan}</TableCell>
                    <TableCell>{p.periodMonths}</TableCell>
                    <TableCell>{taka(p.amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.trxId}</TableCell>
                    <TableCell>{p.senderNumber || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[p.status] || 'secondary'}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => openAction(p, 'verify')}>
                            <CheckCircle className="mr-1 h-4 w-4" /> Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openAction(p, 'reject')}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'verify' ? 'Verify Payment' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === 'verify'
                ? `Confirm verification of ${actionDialog?.payment?.trxId}. This will activate the ${actionDialog?.payment?.plan} plan for ${actionDialog?.payment?.periodMonths} month(s).`
                : `Reject transaction ${actionDialog?.payment?.trxId}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note for this decision…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={actionDialog?.action === 'reject' ? 'destructive' : 'default'}
              onClick={confirmAction}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionDialog?.action === 'verify' ? 'Confirm Verify' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

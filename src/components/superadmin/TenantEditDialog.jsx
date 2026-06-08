import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const PLANS = ['FREE', 'PRO', 'BUSINESS'];
const STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED'];

// Convert an ISO string (or null) to a yyyy-MM-dd value for a date input.
function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// Convert a yyyy-MM-dd value back to an ISO string or null.
function fromDateInput(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function TenantEditDialog({ tenant, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (tenant) {
      setForm({
        plan: tenant.plan || 'FREE',
        status: tenant.status || 'TRIAL',
        trialEndsAt: toDateInput(tenant.trialEndsAt),
        subscriptionEnd: toDateInput(tenant.subscriptionEnd),
        paymentMethod: tenant.paymentMethod || '',
        paymentNotes: tenant.paymentNotes || '',
        isActive: !!tenant.isActive,
      });
    }
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      api.patch(`/admin/tenants/${tenant.id}`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      toast.success('Tenant updated');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update tenant');
    },
  });

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form) return;
    mutation.mutate({
      plan: form.plan,
      status: form.status,
      trialEndsAt: fromDateInput(form.trialEndsAt),
      subscriptionEnd: fromDateInput(form.subscriptionEnd),
      paymentMethod: form.paymentMethod || null,
      paymentNotes: form.paymentNotes || null,
      isActive: form.isActive,
    });
  }

  if (!tenant || !form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit subscription</DialogTitle>
          <DialogDescription>{tenant.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={form.plan} onValueChange={(v) => update('plan', v)}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trialEndsAt">Trial ends</Label>
              <Input
                id="trialEndsAt"
                type="date"
                value={form.trialEndsAt}
                onChange={(e) => update('trialEndsAt', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriptionEnd">Subscription ends</Label>
              <Input
                id="subscriptionEnd"
                type="date"
                value={form.subscriptionEnd}
                onChange={(e) => update('subscriptionEnd', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment method</Label>
            <Input
              id="paymentMethod"
              value={form.paymentMethod}
              onChange={(e) => update('paymentMethod', e.target.value)}
              placeholder="e.g. bKash, Bank transfer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Payment notes</Label>
            <Textarea
              id="paymentNotes"
              value={form.paymentNotes}
              onChange={(e) => update('paymentNotes', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">
                Toggle workspace access.
              </p>
            </div>
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(v) => update('isActive', v)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

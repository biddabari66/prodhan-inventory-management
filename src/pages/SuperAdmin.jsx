import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Users, Building2, Clock, Ban, CheckCircle2, Pencil } from 'lucide-react';
import api from '@/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import TenantEditDialog from '@/components/superadmin/TenantEditDialog';

const STATUS_VARIANTS = {
  TRIAL: 'secondary',
  ACTIVE: 'default',
  PAST_DUE: 'destructive',
  CANCELED: 'outline',
  SUSPENDED: 'destructive',
};

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value ?? 0}</div>
      </CardContent>
    </Card>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'MMM d, yyyy');
}

export default function SuperAdmin() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce the search input.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const metricsQuery = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => api.get('/admin/metrics').then((r) => r.data),
  });

  const tenantsQuery = useQuery({
    queryKey: ['admin', 'tenants', search],
    queryFn: () =>
      api
        .get('/admin/tenants', { params: search ? { search } : {} })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const metrics = metricsQuery.data || {};
  const tenants = tenantsQuery.data?.data || [];

  function openEdit(tenant) {
    setEditing(tenant);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Admin</h1>
        <p className="text-muted-foreground">
          Manage customer workspaces and subscriptions.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Building2} label="Total Tenants" value={metrics.totalTenants} />
        <StatCard icon={CheckCircle2} label="Active" value={metrics.activeTenants} />
        <StatCard icon={Clock} label="Trial" value={metrics.trialTenants} />
        <StatCard icon={Ban} label="Suspended" value={metrics.suspended} />
        <StatCard icon={Users} label="Total Users" value={metrics.totalUsers} />
      </div>

      {/* By-plan breakdown */}
      {Array.isArray(metrics.byPlan) && metrics.byPlan.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tenants by plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics.byPlan.map((p) => (
                <Badge key={p.plan} variant="outline" className="text-sm">
                  {p.plan}: {p.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search tenants..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSearch(searchInput.trim());
          }}
        />
      </div>

      {/* Tenants table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No tenants found.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      {t.email ? (
                        <div className="text-sm text-muted-foreground">{t.email}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[t.status] || 'secondary'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t._count?.users ?? 0}</TableCell>
                    <TableCell className="text-right">{t._count?.orders ?? 0}</TableCell>
                    <TableCell>{fmtDate(t.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TenantEditDialog
        tenant={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

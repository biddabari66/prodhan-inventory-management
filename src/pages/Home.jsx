import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/api/client';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, TrendingDown, BarChart3, Users, Package, AlertTriangle,
  ShoppingCart, UserPlus, ArrowRight, Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const bdt = (n) =>
  '৳' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 });

function StatCard({ title, value, icon: Icon, accent, to, sub }) {
  const body = (
    <Card className="relative overflow-hidden transition hover:shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-xl p-3 ${accent}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {to && (
          <div className="mt-3 flex items-center text-xs font-medium text-primary">
            View <ArrowRight className="ml-1 h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => erp.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
    retry: false,
  });

  const { data: finance } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => api.get('/finance/dashboard').then((r) => r.data),
    retry: false,
  });

  const { data: leadStats } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => api.get('/crm/leads/stats').then((r) => r.data),
    retry: false,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => erp.entities.Order.list('-created_date', 8),
    retry: false,
  });

  const { data: lowStock = [] } = useQuery({
    queryKey: ['low-stock-home'],
    queryFn: () => api.get('/inventory/low-stock').then((r) => r.data?.data ?? r.data ?? []),
    retry: false,
  });

  // Build a 7-day revenue trend from recent orders (client-side fallback).
  const trend = React.useMemo(() => {
    const days = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: 0 };
    }
    (recentOrders || []).forEach((o) => {
      const key = (o.order_date || o.created_date || '').slice(0, 10);
      if (days[key]) days[key].revenue += Number(o.total_amount || 0);
    });
    return Object.values(days);
  }, [recentOrders]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Greeting banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 p-6 text-white shadow-lg shadow-orange-500/20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 right-24 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.display_name ? `, ${user.display_name}` : ''} 👋
          </h1>
          <p className="mt-1 text-sm text-white/90">
            Here's what's happening across your business today.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={bdt(stats?.todayRevenue)}
          sub={`${stats?.todayOrders ?? 0} orders today`}
          icon={DollarSign}
          accent="bg-gradient-to-br from-emerald-400 to-emerald-600"
          to="/Sales"
        />
        <StatCard
          title="Month Revenue"
          value={bdt(finance?.revenue)}
          sub={`Profit ${bdt(finance?.profit)}`}
          icon={BarChart3}
          accent="bg-gradient-to-br from-amber-400 to-orange-600"
          to="/FinanceDashboard"
        />
        <StatCard
          title="Month Expenses"
          value={bdt(finance?.expenses)}
          sub={`${finance?.pendingExpenses ?? 0} pending approval`}
          icon={TrendingDown}
          accent="bg-gradient-to-br from-rose-400 to-rose-600"
          to="/ExpenseApprovals"
        />
        <StatCard
          title="New Leads"
          value={stats?.newLeads ?? leadStats?.byStatus?.NEW ?? 0}
          sub={`${leadStats?.conversionRate ?? 0}% conversion`}
          icon={UserPlus}
          accent="bg-gradient-to-br from-sky-400 to-blue-600"
          to="/CRM"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip formatter={(v) => bdt(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock
            </CardTitle>
            <Link to="/InventoryOverview" className="text-xs text-primary">All</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 && (
              <p className="text-sm text-muted-foreground">All stock levels healthy ✅</p>
            )}
            {lowStock.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{p.name}</span>
                <span className="font-semibold text-rose-500">{p.stock}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {[
          { to: '/Sales', label: 'New Sale', icon: ShoppingCart },
          { to: '/CRM', label: 'CRM', icon: Users },
          { to: '/Attendance', label: 'Attendance', icon: UserPlus },
          { to: '/Payroll', label: 'Payroll', icon: Wallet },
          { to: '/InventoryOverview', label: 'Inventory', icon: Package },
          { to: '/FinanceDashboard', label: 'Finance', icon: DollarSign },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="transition hover:border-primary hover:shadow">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Link to="/Sales" className="text-xs text-primary">View all</Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Order #</th>
                  <th className="pb-2 pr-4 font-medium">Customer</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No orders yet</td></tr>
                )}
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{o.order_number}</td>
                    <td className="py-2 pr-4">{o.customer_name}</td>
                    <td className="py-2 pr-4">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                        {(o.order_status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold">{bdt(o.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

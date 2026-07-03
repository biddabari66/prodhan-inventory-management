import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/api/client';
import { erp } from '@/api/erpClient';
import {
  DollarSign, TrendingDown, BarChart3, Users, Package, AlertTriangle,
  ShoppingCart, UserPlus, ArrowRight, Wallet, TrendingUp, Zap, Target,
  Clock, CheckCircle2, ChevronRight, Star, Activity, ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import { StatGridSkeleton, TableSkeleton } from '@/components/common/Skeletons';
import AccountabilitySummary from '@/components/reporting/AccountabilitySummary';
import { useScope } from '@/lib/scope';

const bdt = (n) => '৳' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 });

// ── Animated counter hook ──────────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!target) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return value;
}

// ── KPI Card — shared design system StatCard with animated count-up ──────────
function KpiCard({ title, value, rawValue, sub, icon, tone, to, index = 0 }) {
  // No count-up: show the real number instantly (undefined → StatCard skeleton).
  const displayValue =
    rawValue !== undefined && rawValue !== null ? bdt(rawValue) : value;
  return (
    <StatCard
      icon={icon}
      label={title}
      value={displayValue}
      sub={sub}
      tone={tone}
      to={to}
      index={index}
    />
  );
}

// ── Quick Action Button ────────────────────────────────────────────────────────
function QuickAction({ to, label, icon: Icon, color, bg }) {
  return (
    <Link to={to}>
      <div className="erp-card p-4 flex flex-col items-center gap-2.5 text-center cursor-pointer group hover:border-orange-200 dark:hover:border-orange-800 transition-all hover:-translate-y-0.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} group-hover:scale-110 transition-transform`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">{label}</span>
      </div>
    </Link>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="erp-card p-3 shadow-xl">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{bdt(payload[0]?.value)}</p>
    </div>
  );
};

// ── Status pill ────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  PENDING:   'badge-amber',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-rose',
  CONFIRMED: 'badge-blue',
  PROCESSING: 'badge-purple',
};

export default function Home() {
  const { companyId, departmentId } = useScope();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good Morning');
    else if (h < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => erp.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard-stats', companyId, departmentId],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
    retry: false,
  });

  const { data: finance, isLoading: isFinanceLoading } = useQuery({
    queryKey: ['finance-dashboard', companyId, departmentId],
    queryFn: () => api.get('/finance/dashboard').then((r) => r.data),
    retry: false,
  });

  const { data: leadStats, isLoading: isLeadStatsLoading } = useQuery({
    queryKey: ['lead-stats', companyId, departmentId],
    queryFn: () => api.get('/crm/leads/stats').then((r) => r.data),
    retry: false,
  });

  const { data: recentOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['recent-orders', companyId, departmentId],
    queryFn: () => erp.entities.Order.list('-created_date', 8),
    retry: false,
  });

  const { data: lowStock = [], isLoading: isLowStockLoading } = useQuery({
    queryKey: ['low-stock-home', companyId, departmentId],
    queryFn: () => api.get('/inventory/low-stock').then((r) => r.data?.data ?? r.data ?? []),
    retry: false,
  });

  const isDataLoading = isStatsLoading || isFinanceLoading || isLeadStatsLoading;

  // 7-day trend
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

  const displayName = user?.display_name || user?.full_name || 'there';
  const today = new Date().toLocaleDateString('en-BD', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <PageHeader
        icon={BarChart3}
        title={`${greeting}, ${displayName.split(' ')[0] || 'User'}`}
        subtitle={`${today} — here's everything happening at your business today.`}
        actions={
          <Link to="/Sales">
            <Button>
              <ShoppingCart className="w-4 h-4 mr-2" /> New Sale
            </Button>
          </Link>
        }
      />

      {/* ── Team Accountability summary (Reporting Head view) ─────────────── */}
      <AccountabilitySummary />

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      {isDataLoading ? (
        <StatGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiCard
            title="Today's Revenue"
            rawValue={stats?.todayRevenue}
            sub={`${stats?.todayOrders ?? 0} orders`}
            icon={DollarSign}
            tone="green"
            to="/Sales"
            index={0}
          />
          <KpiCard
            title="Month Revenue"
            rawValue={finance?.revenue}
            sub={`Profit ${bdt(finance?.profit)}`}
            icon={TrendingUp}
            tone="orange"
            to="/FinanceDashboard"
            index={1}
          />
          <KpiCard
            title="Month Expenses"
            rawValue={finance?.expenses}
            sub={`${finance?.pendingExpenses ?? 0} pending`}
            icon={TrendingDown}
            tone="red"
            to="/Expenses"
            index={2}
          />
          <KpiCard
            title="New Leads"
            value={stats?.newLeads ?? leadStats?.byStatus?.NEW}
            sub={leadStats ? `${leadStats?.conversionRate ?? 0}% conversion` : undefined}
            icon={UserPlus}
            tone="blue"
            to="/CRM"
            index={3}
          />
        </div>
      )}

      {/* ── Chart + Alerts row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue Chart */}
        <div className="erp-card lg:col-span-2 p-5 animate-fade-up delay-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Revenue Trend</h2>
              <p className="text-xs text-slate-400">Last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
              <Activity className="w-3 h-3" /> Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#f97316', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Low Stock Alerts */}
        <div className="erp-card p-5 animate-fade-up delay-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Low Stock</h2>
                <p className="text-xs text-slate-400">{lowStock.length} items need attention</p>
              </div>
            </div>
            <Link to="/InventoryOverview" className="text-xs text-orange-500 font-semibold hover:underline">View all</Link>
          </div>
          <div className="space-y-2.5">
            {lowStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">All stock healthy!</p>
              </div>
            ) : (
              lowStock.slice(0, 7).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <span className="text-[13px] text-slate-700 dark:text-slate-300 truncate pr-2 font-medium">{p.name}</span>
                  <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full flex-shrink-0">{p.stock} left</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div className="animate-fade-up delay-300">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <QuickAction to="/Sales" label="New Sale" icon={ShoppingCart} color="text-green-600" bg="bg-green-50 dark:bg-green-900/30" />
          <QuickAction to="/CRM" label="Add Lead" icon={Target} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/30" />
          <QuickAction to="/EmployeeAttendance" label="Attendance" icon={Clock} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/30" />
          <QuickAction to="/Payroll" label="Payroll" icon={Wallet} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/30" />
          <QuickAction to="/InventoryOverview" label="Inventory" icon={Package} color="text-teal-600" bg="bg-teal-50 dark:bg-teal-900/30" />
          <QuickAction to="/FinanceDashboard" label="Finance" icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/30" />
        </div>
      </div>

      {/* ── Recent Orders ────────────────────────────────────────────────── */}
      <div className="erp-card overflow-hidden animate-fade-up delay-400">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Orders</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest transactions</p>
          </div>
          <Link to="/Sales" className="flex items-center gap-1 text-xs text-orange-500 font-semibold hover:underline">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {isOrdersLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full erp-table">
              <thead>
                <tr>
                  <th className="text-left">Order #</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left hidden sm:table-cell">Date</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No orders yet — create your first sale!</td></tr>
                )}
                {recentOrders.map((o, i) => (
                  <tr key={o.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="font-mono text-xs text-slate-500">{o.order_number || `#${String(i+1).padStart(4,'0')}`}</td>
                    <td className="font-medium text-slate-800 dark:text-slate-200">{o.customer_name}</td>
                    <td className="text-slate-400 hidden sm:table-cell text-xs">{(o.order_date || o.created_date || '').slice(0,10)}</td>
                    <td>
                      <span className={`status-pill text-[11px] ${STATUS_STYLES[o.order_status] || 'badge-slate'}`}>
                        {(o.order_status || 'PENDING').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-right font-bold text-slate-900 dark:text-white">{bdt(o.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, DollarSign, TrendingUp, TrendingDown, 
  Target, Package, Calendar, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import { CardSkeleton } from '../common/SkeletonLoader';

/**
 * PRODUCTION-READY Optimized Dashboard Stats
 * Efficient caching with minimal re-renders
 */
const OptimizedDashboardStats = ({ entities, currentUser, refreshTrigger }) => {
  const { Admission, Expense, Income, Lead, User: UserEntity, Attendance, Inventory } = entities;

  // Cache each entity separately with appropriate stale times
  const { data: admissions = [], isLoading: loadingAdmissions } = useQuery({
    queryKey: ['admissions', 'stats'],
    queryFn: () => Admission.list('-admission_date', 500),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!currentUser,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', 'stats'],
    queryFn: () => Expense.list('-expense_date', 200),
    staleTime: 2 * 60 * 1000,
    enabled: !!currentUser,
  });

  const { data: incomes = [], isLoading: loadingIncomes } = useQuery({
    queryKey: ['incomes', 'stats'],
    queryFn: () => Income.list('-income_date', 200),
    staleTime: 2 * 60 * 1000,
    enabled: !!currentUser,
  });

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['leads', 'stats'],
    queryFn: () => Lead.list('-created_date', 500),
    staleTime: 3 * 60 * 1000,
    enabled: !!currentUser,
  });

  const { data: inventory = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: () => Inventory.list(),
    staleTime: 5 * 60 * 1000,
    enabled: !!currentUser,
  });

  // Memoized calculations
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthAdmissions = admissions.filter(a => new Date(a.admission_date) >= monthStart);
    const thisMonthExpenses = expenses.filter(e => new Date(e.expense_date) >= monthStart);
    const thisMonthIncomes = incomes.filter(i => new Date(i.income_date) >= monthStart);
    
    const totalRevenue = thisMonthIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExpenses = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    
    const newLeads = leads.filter(l => new Date(l.created_date) >= monthStart).length;
    const convertedLeads = leads.filter(l => l.lead_status === 'converted' && new Date(l.created_date) >= monthStart).length;
    const conversionRate = newLeads > 0 ? (convertedLeads / newLeads * 100).toFixed(1) : 0;
    
    const lowStockItems = inventory.filter(item => 
      (item.current_stock || 0) <= (item.minimum_stock || 0)
    ).length;

    return {
      totalAdmissions: thisMonthAdmissions.length,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0,
      newLeads,
      conversionRate,
      lowStockItems,
      totalInventoryItems: inventory.length,
    };
  }, [admissions, expenses, incomes, leads, inventory]);

  const statCards = useMemo(() => [
    {
      title: 'Total Admissions',
      value: stats.totalAdmissions,
      change: '+12%',
      trend: 'up',
      icon: Users,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-100',
    },
    {
      title: 'Revenue',
      value: `৳${stats.totalRevenue.toLocaleString()}`,
      change: '+8.5%',
      trend: 'up',
      icon: DollarSign,
      colorClass: 'text-green-600',
      bgClass: 'bg-green-100',
    },
    {
      title: 'Net Profit',
      value: `৳${stats.netProfit.toLocaleString()}`,
      change: stats.profitMargin + '%',
      trend: stats.netProfit >= 0 ? 'up' : 'down',
      icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown,
      colorClass: stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600',
      bgClass: stats.netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100',
    },
    {
      title: 'Lead Conversion',
      value: `${stats.conversionRate}%`,
      change: `${stats.newLeads} new`,
      trend: 'neutral',
      icon: Target,
      colorClass: 'text-purple-600',
      bgClass: 'bg-purple-100',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      change: `of ${stats.totalInventoryItems}`,
      trend: stats.lowStockItems > 5 ? 'down' : 'neutral',
      icon: Package,
      colorClass: stats.lowStockItems > 5 ? 'text-orange-600' : 'text-cyan-600',
      bgClass: stats.lowStockItems > 5 ? 'bg-orange-100' : 'bg-cyan-100',
    },
  ], [stats]);

  // Show simplified loading state
  const isLoading = loadingAdmissions || loadingExpenses || loadingIncomes || loadingLeads || loadingInventory;

  if (!currentUser || isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="premium-card hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgClass} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-6 h-6 ${stat.colorClass}`} />
              </div>
              {stat.trend === 'up' && (
                <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.change}
                </div>
              )}
              {stat.trend === 'down' && (
                <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold">
                  <ArrowDownRight className="w-3 h-3" />
                  {stat.change}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">{stat.title}</p>
              <p className={`text-3xl font-bold ${stat.colorClass}`}>{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default React.memo(OptimizedDashboardStats);
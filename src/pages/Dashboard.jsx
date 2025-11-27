import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "@/entities/User";
import { Admission } from "@/entities/Admission";
import { Expense } from "@/entities/Expense";
import { Income } from "@/entities/Income";
import { Inventory } from "@/entities/Inventory";
import { Lead } from "@/entities/Lead";
import { Attendance } from "@/entities/Attendance";
import { Task } from "@/entities/Task";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  TrendingUp as TrendingUpIcon,
  Users,
  DollarSign,
  Target,
  Package,
  AlertTriangle,
  Sparkles,
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  RefreshCw,
  Clock,
  Award,
  CheckCircle,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInMonths, differenceInDays, isToday } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';

// New imports from current file code
import OptimizedDashboardStats from '../components/dashboard/OptimizedDashboardStats';
import { PredictiveAnalytics } from '../components/ai/PredictiveAnalytics';
import { withPermission, PermissionGate } from '../components/common/PermissionGuard';
import { useCachedQuery } from '../components/common/CachedQuery';
import { usePerformanceMonitor } from '../components/common/PerformanceOptimizer';


// OPTIMIZED: Simplified loading spinner without heavy animations
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
  </div>
);

// Enhanced KPI Card Component - STABLE COLORS, NO ANIMATION LOOPS
const KPICard = ({ title, value, change, icon: Icon, colorScheme, trend, description, onClick, expandableContent, isSearchMatch = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isSearchMatch) return null;

  const CardContentInternal = () => (
    <div className="relative z-10 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-4 rounded-2xl ${colorScheme.bgClass} transition-all duration-300`}>
          <Icon className={`w-7 h-7 ${colorScheme.iconClass}`} />
        </div>
        <div className="flex items-center gap-2">
          {change && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' : trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
              {trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
              <span className="text-sm font-bold">{change}</span>
            </div>
          )}
          {expandableContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 h-6 w-6 hover:bg-white/20"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className={`text-4xl font-bold font-display tracking-tight ${colorScheme.textClass}`}>
          {value}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {isExpanded && expandableContent && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {expandableContent}
        </div>
      )}
    </div>
  );

  return (
    <Card
      className="premium-card group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-2"
      style={{
        background: colorScheme.cardBg,
        borderColor: colorScheme.borderColor
      }}
      onClick={onClick}
    >
      <CardContentInternal />
    </Card>
  );
};

// Digital Clock Component
const DigitalClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="premium-card">
      <CardContent className="p-8 text-center">
        <div className="space-y-4">
          <div className="text-6xl font-bold font-display text-gradient tabular-nums">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-lg text-muted-foreground">
            {format(currentTime, 'EEEE, d MMMM yyyy')}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-violet-500" />
            <span className="text-sm text-violet-500 font-medium">Live Time</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function DashboardComponent() {
  usePerformanceMonitor('Dashboard');

  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [kpiSearch, setKpiSearch] = useState('');

  const navigate = useNavigate();

  const { data: users = [] } = useCachedQuery(
    ['users'],
    () => User.list(),
    { cacheTTL: 5 * 60 * 1000 }
  );

  const { data: admissions = [] } = useCachedQuery(
    ['admissions'],
    () => Admission.list('-admission_date', 500),
    { cacheTTL: 3 * 60 * 1000 }
  );

  const { data: expenses = [] } = useCachedQuery(
    ['expenses'],
    () => Expense.list('-expense_date', 200),
    { cacheTTL: 3 * 60 * 1000 }
  );

  const { data: incomes = [] } = useCachedQuery(
    ['incomes'],
    () => Income.list('-income_date', 200),
    { cacheTTL: 3 * 60 * 1000 }
  );

  const { data: inventory = [] } = useCachedQuery(
    ['inventory'],
    () => Inventory.list(),
    { cacheTTL: 5 * 60 * 1000 }
  );

  const { data: leads = [] } = useCachedQuery(
    ['leads'],
    () => Lead.list('-created_date', 500),
    { cacheTTL: 2 * 60 * 1000 }
  );

  const { data: attendanceData = [] } = useCachedQuery(
    ['attendance'],
    () => Attendance.list('-date', 100),
    { cacheTTL: 2 * 60 * 1000 }
  );

  const { data: tasks = [] } = useCachedQuery(
    ['tasks'],
    () => Task.list('-created_date', 100),
    { cacheTTL: 3 * 60 * 1000 }
  );

  const { data: currentUserData } = useCachedQuery(
    ['currentUser'],
    () => User.me(),
    { cacheTTL: 5 * 60 * 1000 }
  );

  // Derive overall loading state
  useEffect(() => {
    if (currentUserData && admissions && expenses && incomes && inventory && leads && attendanceData && tasks) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [currentUserData, admissions, expenses, incomes, inventory, leads, attendanceData, tasks]);

  const dashboardData = useMemo(() => {
    if (isLoading) return {};

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Filter data based on selected period
    const filterByPeriod = (items, dateField) => {
      const start = selectedPeriod === 'weekly' ? weekStart : monthStart;
      const end = selectedPeriod === 'weekly' ? weekEnd : monthEnd;
      return items.filter((item) => {
        const date = new Date(item[dateField]);
        return date >= start && date <= end;
      });
    };

    const periodAdmissions = filterByPeriod(admissions, 'admission_date');
    const periodExpenses = filterByPeriod(expenses, 'expense_date');
    const periodIncomes = filterByPeriod(incomes, 'income_date');
    const periodLeads = filterByPeriod(leads, 'created_date');

    // Calculate New Admissions Today
    const newAdmissionsToday = admissions.filter((a) => {
      const admissionDate = new Date(a.admission_date);
      return admissionDate >= todayStart && admissionDate < todayEnd;
    }).length;

    // Calculate New Admission Rate (per day) - average admissions per day over the selected period
    const periodDays = selectedPeriod === 'weekly' ? 7 : 30; // Approximation for monthly
    const newAdmissionRatePerDay = periodAdmissions.length > 0 ? (periodAdmissions.length / periodDays).toFixed(1) : 0;

    // Enhanced Customer Retention Rate (cohort-based logic)
    const calculateCohortRetention = () => {
      const cohorts = {};
      const retentionPeriod = 90; // 90 days to consider "retained"

      admissions.forEach((admission) => {
        const admissionMonth = format(new Date(admission.admission_date), 'yyyy-MM');
        const daysSinceAdmission = differenceInDays(now, new Date(admission.admission_date));

        if (!cohorts[admissionMonth]) {
          cohorts[admissionMonth] = { total: 0, retained: 0 };
        }

        cohorts[admissionMonth].total++;

        // Consider retained if:
        // 1. Status is still active AND
        // 2. It's been more than retention period days since admission AND
        // 3. No recent "dropped" or "cancelled" status
        if (admission.admission_status === 'active' && daysSinceAdmission >= retentionPeriod) {
          cohorts[admissionMonth].retained++;
        }
      });

      const retentionRates = Object.values(cohorts)
        .filter((c) => c.total > 0)
        .map((c) => c.retained / c.total * 100);

      return retentionRates.length > 0 ?
        (retentionRates.reduce((a, b) => a + b, 0) / retentionRates.length).toFixed(1) :
        0;
    };

    // Calculate advanced KPIs
    const totalRevenue = periodIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    const totalExpenses = periodExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalAdSpend = periodExpenses.filter((e) => e.category === 'page' || e.category === 'post_advertisement_ads').reduce((sum, e) => sum + e.amount, 0);

    // ROAS calculation (Revenue / Ad Spend)
    const roas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend * 100).toFixed(1) : 0;

    // ROI calculation ((Revenue - Investment) / Investment) * 100
    const roi = totalExpenses > 0 ? ((totalRevenue - totalExpenses) / totalExpenses * 100).toFixed(1) : 0;

    // CAC (Customer Acquisition Cost)
    const cac = periodAdmissions.length > 0 ? (totalAdSpend / periodAdmissions.length).toFixed(0) : 0;

    // CLV (Customer Lifetime Value) - enhanced calculation
    const avgOrderValue = periodAdmissions.length > 0 ? (totalRevenue / periodAdmissions.length).toFixed(0) : 0;
    const avgCustomerLifespan = 2; // Assume 2 years average
    const purchaseFrequency = 1.2; // Assume 1.2 purchases per year
    const clv = (avgOrderValue * purchaseFrequency * avgCustomerLifespan).toFixed(0);

    // Conversion Rate
    const convertedLeads = leads.filter((l) => l.lead_status === 'converted').length;
    const conversionRate = periodLeads.length > 0 ? (convertedLeads / periodLeads.length * 100).toFixed(1) : 0;

    // Profit Margin
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0;

    // Pending Approvals
    const pendingApprovals = expenses.filter((e) => e.status === 'pending_manager_approval' || e.status === 'pending_finance_approval').length;

    // Weekly Growth Rate (comparing this week to last week)
    const lastWeekStart = subDays(weekStart, 7);
    const lastWeekEnd = subDays(weekEnd, 7);
    const lastWeekAdmissions = admissions.filter((a) => {
      const date = new Date(a.admission_date);
      return date >= lastWeekStart && date <= lastWeekEnd;
    }).length;
    const thisWeekAdmissions = admissions.filter((a) => {
      const date = new Date(a.admission_date);
      return date >= weekStart && date <= weekEnd;
    }).length;
    const weeklyGrowth = lastWeekAdmissions > 0 ? ((thisWeekAdmissions - lastWeekAdmissions) / lastWeekAdmissions * 100).toFixed(1) : 0;

    // Attendance Miss Rate
    const totalAttendanceRecords = attendanceData.length;
    const missedAttendance = attendanceData.filter((a) => a.status === 'absent' || a.status === 'late').length;
    const attendanceMissRate = totalAttendanceRecords > 0 ? (missedAttendance / totalAttendanceRecords * 100).toFixed(1) : 0;

    // Low Stock Items
    const lowStockItems = inventory.filter((item) => (item.current_stock || 0) <= (item.minimum_stock || 0)).length;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      totalAdmissions: periodAdmissions.length,
      totalLeads: periodLeads.length,
      roas: parseFloat(roas),
      roi: parseFloat(roi),
      cac: parseFloat(cac),
      clv: parseFloat(clv),
      avgOrderValue: parseFloat(avgOrderValue),
      conversionRate: parseFloat(conversionRate),
      profitMargin: parseFloat(profitMargin),
      pendingApprovals,
      weeklyGrowth: parseFloat(weeklyGrowth),
      attendanceMissRate: parseFloat(attendanceMissRate),
      lowStockItems,
      totalInventoryItems: inventory.length,
      customerRetentionRate: parseFloat(calculateCohortRetention()),
      newAdmissionsToday,
      newAdmissionRatePerDay: parseFloat(newAdmissionRatePerDay),
      leadToStudentConversionRate: leads.length > 0 ? (admissions.length / leads.length * 100).toFixed(1) : 0,
    };
  }, [isLoading, selectedPeriod, admissions, expenses, incomes, inventory, leads, attendanceData]);

  // Generate enhanced chart data using resolved arrays
  const chartData = useMemo(() => {
    if (isLoading) return [];

    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(now, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayRevenue = incomes
        .filter((income) => income.income_date === dateStr)
        .reduce((sum, income) => sum + (income.amount || 0), 0);

      const dayExpenses = expenses
        .filter((expense) => expense.expense_date === dateStr)
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);

      const dayAdmissions = admissions
        .filter((admission) => admission.admission_date === dateStr).length;

      const dayLeads = leads
        .filter((lead) => lead.created_date?.startsWith(dateStr)).length;

      return {
        date: format(date, 'MMM dd'),
        revenue: dayRevenue,
        expenses: dayExpenses,
        profit: dayRevenue - dayExpenses,
        admissions: dayAdmissions,
        leads: dayLeads
      };
    });
    return last7Days;
  }, [isLoading, admissions, expenses, incomes, leads]);

  const handleQuickAction = (action) => {
    switch (action) {
      case 'new_admission':
        navigate(createPageUrl('Admissions'));
        break;
      case 'add_lead':
        navigate(createPageUrl('CRM'));
        break;
      case 'record_income':
        navigate(createPageUrl('Income'));
        break;
      case 'view_reports':
        navigate(createPageUrl('Reports'));
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // FIXED: Stable colors for KPI cards - NO color animations
  const advancedKpiCards = useMemo(() => [
    {
      title: 'Total Revenue',
      value: `৳${dashboardData.totalRevenue?.toLocaleString() || 0}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      description: 'Total income generated',
      colorScheme: {
        bgClass: 'bg-emerald-100',
        iconClass: 'text-emerald-600',
        textClass: 'text-emerald-700',
        cardBg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        borderColor: '#6ee7b7'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Course Fees:</span>
            <span>৳{Math.round((dashboardData.totalRevenue || 0) * 0.8).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Books Sales:</span>
            <span>৳{Math.round((dashboardData.totalRevenue || 0) * 0.15).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Other:</span>
            <span>৳{Math.round((dashboardData.totalRevenue || 0) * 0.05).toLocaleString()}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Total Expenses',
      value: `৳${dashboardData.totalExpenses?.toLocaleString() || 0}`,
      change: '+8.2%',
      trend: 'up',
      icon: TrendingDown,
      description: 'Total operational costs',
      colorScheme: {
        bgClass: 'bg-red-100',
        iconClass: 'text-red-600',
        textClass: 'text-red-700',
        cardBg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        borderColor: '#fca5a5'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Marketing:</span>
            <span>৳{Math.round((dashboardData.totalExpenses || 0) * 0.4).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Operations:</span>
            <span>৳{Math.round((dashboardData.totalExpenses || 0) * 0.35).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Other:</span>
            <span>৳{Math.round((dashboardData.totalExpenses || 0) * 0.25).toLocaleString()}</span>
          </div>
        </div>
      )
    },
    {
      title: 'New Admissions Today',
      value: dashboardData.newAdmissionsToday || 0,
      change: `+${dashboardData.newAdmissionsToday || 0}`,
      trend: 'neutral',
      icon: Calendar,
      description: 'Today\'s new enrollments',
      colorScheme: {
        bgClass: 'bg-blue-100',
        iconClass: 'text-blue-600',
        textClass: 'text-blue-700',
        cardBg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        borderColor: '#93c5fd'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="text-sm">
            <span>Daily Rate: {dashboardData.newAdmissionRatePerDay} per day</span>
          </div>
          <div className="text-sm">
            <span>Weekly Target: 35 admissions</span>
          </div>
          <Progress value={(dashboardData.newAdmissionsToday || 0) / 5 * 100} className="h-2" />
        </div>
      )
    },
    {
      title: 'Low Stock Items',
      value: dashboardData.lowStockItems || 0,
      change: dashboardData.lowStockItems > 5 ? '+3' : '0',
      trend: dashboardData.lowStockItems > 5 ? 'up' : 'neutral',
      icon: AlertTriangle,
      description: 'Items below minimum stock',
      colorScheme: {
        bgClass: 'bg-orange-100',
        iconClass: 'text-orange-600',
        textClass: 'text-orange-700',
        cardBg: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
        borderColor: '#fb923c'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="text-sm">
            <span>Total Items: {dashboardData.totalInventoryItems || 0}</span>
          </div>
          <div className="text-sm">
            <span>Stock Health: {dashboardData.lowStockItems > 10 ? 'Critical' : dashboardData.lowStockItems > 5 ? 'Warning' : 'Good'}</span>
          </div>
          <Progress value={Math.max(0, 100 - (dashboardData.lowStockItems || 0) / (dashboardData.totalInventoryItems || 1) * 100)} className="h-2" />
        </div>
      )
    },
    {
      title: 'ROAS',
      value: `${dashboardData.roas || 0}%`,
      change: '+12.5%',
      trend: 'up',
      icon: Target,
      description: 'Return on Ad Spend',
      colorScheme: {
        bgClass: 'bg-emerald-100',
        iconClass: 'text-emerald-600',
        textClass: 'text-emerald-700',
        cardBg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        borderColor: '#6ee7b7'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="text-sm">Industry Average: 400%</div>
          <div className="text-sm">Your Performance: {dashboardData.roas > 400 ? 'Above Average' : 'Below Average'}</div>
          <Progress value={Math.min(100, (dashboardData.roas || 0) / 4)} className="h-2" />
        </div>
      )
    },
    {
      title: 'ROI',
      value: `${dashboardData.roi || 0}%`,
      change: '+8.3%',
      trend: 'up',
      icon: TrendingUpIcon,
      description: 'Return on Investment',
      colorScheme: {
        bgClass: 'bg-violet-100',
        iconClass: 'text-violet-600',
        textClass: 'text-violet-700',
        cardBg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
        borderColor: '#c4b5fd'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="text-sm">Net Profit: ৳{dashboardData.netProfit?.toLocaleString() || 0}</div>
          <div className="text-sm">Profit Margin: {dashboardData.profitMargin || 0}%</div>
        </div>
      )
    },
    {
      title: 'Lead Conversion',
      value: `${dashboardData.leadToStudentConversionRate || 0}%`,
      change: '+1.5%',
      trend: 'up',
      icon: CheckCircle,
      description: 'Leads to Admissions',
      colorScheme: {
        bgClass: 'bg-teal-100',
        iconClass: 'text-teal-600',
        textClass: 'text-teal-700',
        cardBg: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
        borderColor: '#5eead4'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="text-sm">Total Leads: {dashboardData.totalLeads || 0}</div>
          <div className="text-sm">Conversions: {dashboardData.totalAdmissions || 0}</div>
        </div>
      )
    },
    {
      title: 'CAC',
      value: `৳${dashboardData.cac || 0}`,
      change: '-5.2%',
      trend: 'down',
      icon: DollarSign,
      description: 'Customer Acquisition Cost',
      colorScheme: {
        bgClass: 'bg-blue-100',
        iconClass: 'text-blue-600',
        textClass: 'text-blue-700',
        cardBg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        borderColor: '#93c5fd'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="text-sm">Ad Spend: ৳{Math.round(dashboardData.cac * dashboardData.totalAdmissions || 0).toLocaleString()}</div>
          <div className="text-sm">New Customers: {dashboardData.totalAdmissions || 0}</div>
        </div>
      )
    },
    {
      title: 'CLV',
      value: `৳${dashboardData.clv || 0}`,
      change: '+15.7%',
      trend: 'up',
      icon: Users,
      description: 'Customer Lifetime Value',
      colorScheme: {
        bgClass: 'bg-orange-100',
        iconClass: 'text-orange-600',
        textClass: 'text-orange-700',
        cardBg: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
        borderColor: '#fb923c'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="text-sm">AOV: ৳{dashboardData.avgOrderValue || 0}</div>
          <div className="text-sm">CLV:CAC Ratio: {dashboardData.cac ? (dashboardData.clv / dashboardData.cac).toFixed(1) : 'N/A'}</div>
        </div>
      )
    },
    {
      title: 'Avg Order Value',
      value: `৳${dashboardData.avgOrderValue || 0}`,
      change: '+3.1%',
      trend: 'up',
      icon: Award,
      description: 'Average Admission Value',
      colorScheme: {
        bgClass: 'bg-pink-100',
        iconClass: 'text-pink-600',
        textClass: 'text-pink-700',
        cardBg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
        borderColor: '#f9a8d4'
      }
    },
    {
      title: 'Conversion Rate',
      value: `${dashboardData.conversionRate || 0}%`,
      change: '+2.4%',
      trend: 'up',
      icon: Zap,
      description: 'Lead to Admission',
      colorScheme: {
        bgClass: 'bg-cyan-100',
        iconClass: 'text-cyan-600',
        textClass: 'text-cyan-700',
        cardBg: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)',
        borderColor: '#67e8f9'
      }
    },
    {
      title: 'Profit Margin',
      value: `${dashboardData.profitMargin || 0}%`,
      change: '+1.8%',
      trend: 'up',
      icon: BarChart3,
      description: 'Net Profit Margin',
      colorScheme: {
        bgClass: 'bg-indigo-100',
        iconClass: 'text-indigo-600',
        textClass: 'text-indigo-700',
        cardBg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
        borderColor: '#a5b4fc'
      }
    },
    {
      title: 'Customer Retention',
      value: `${dashboardData.customerRetentionRate || 0}%`,
      change: '+0.8%',
      trend: 'up',
      icon: Users,
      description: '90-Day Cohort Retention',
      colorScheme: {
        bgClass: 'bg-rose-100',
        iconClass: 'text-rose-600',
        textClass: 'text-rose-700',
        cardBg: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
        borderColor: '#fda4af'
      },
      expandableContent: (
        <div className="space-y-2">
          <div className="text-sm">Retention Logic: 90-day active cohorts</div>
          <div className="text-sm">Industry Avg: 75%</div>
          <Progress value={dashboardData.customerRetentionRate || 0} className="h-2" />
        </div>
      )
    },
    {
      title: 'Pending Approvals',
      value: dashboardData.pendingApprovals || 0,
      change: dashboardData.pendingApprovals > 5 ? '+3' : '0',
      trend: dashboardData.pendingApprovals > 5 ? 'up' : 'neutral',
      icon: AlertCircle,
      description: 'Expense Approvals',
      colorScheme: {
        bgClass: 'bg-amber-100',
        iconClass: 'text-amber-600',
        textClass: 'text-amber-700',
        cardBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        borderColor: '#fcd34d'
      }
    },
    {
      title: 'Weekly Growth',
      value: `${dashboardData.weeklyGrowth || 0}%`,
      change: '+0.5%',
      trend: dashboardData.weeklyGrowth > 0 ? 'up' : 'down',
      icon: TrendingUpIcon,
      description: 'Admission Growth',
      colorScheme: {
        bgClass: 'bg-green-100',
        iconClass: 'text-green-600',
        textClass: 'text-green-700',
        cardBg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        borderColor: '#86efac'
      }
    },
    {
      title: 'Attendance Rate',
      value: `${(100 - (dashboardData.attendanceMissRate || 0)).toFixed(1)}%`,
      change: '-1.2%',
      trend: dashboardData.attendanceMissRate > 10 ? 'down' : 'up',
      icon: Clock,
      description: 'Employee Attendance',
      colorScheme: {
        bgClass: 'bg-teal-100',
        iconClass: 'text-teal-600',
        textClass: 'text-teal-700',
        cardBg: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
        borderColor: '#5eead4'
      }
    }
  ], [dashboardData]);

  // Filter KPI cards based on search
  const filteredKpiCards = useMemo(() => {
    if (!kpiSearch.trim()) return advancedKpiCards.map((card) => ({ ...card, isSearchMatch: true }));

    return advancedKpiCards.map((card) => ({
      ...card,
      isSearchMatch: card.title.toLowerCase().includes(kpiSearch.toLowerCase()) ||
        card.description.toLowerCase().includes(kpiSearch.toLowerCase())
    }));
  }, [advancedKpiCards, kpiSearch]);

  // OPTIMIZED: Simplified loading state without 3D effects
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-violet-600">
              Loading Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Preparing your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/10 to-purple-50/20">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Premium Dashboard Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 relative">
            <Sparkles className="w-10 h-10 text-white" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-base text-slate-600 mt-2 font-medium">
              Real-time business intelligence and performance metrics
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-indigo-600 font-semibold">
                {format(new Date(), 'EEEE, MMMM do, yyyy')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search KPIs..."
              className="w-56 pl-10 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
              value={kpiSearch}
              onChange={(e) => setKpiSearch(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <Button
            variant={selectedPeriod === 'weekly' ? 'default' : 'ghost'}
            onClick={() => setSelectedPeriod('weekly')}
            className={`px-5 py-2 rounded-xl font-semibold transition-all text-sm ${
              selectedPeriod === 'weekly' ?
                'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' :
                'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Weekly
          </Button>
          <Button
            variant={selectedPeriod === 'monthly' ? 'default' : 'ghost'}
            onClick={() => setSelectedPeriod('monthly')}
            className={`px-5 py-2 rounded-xl font-semibold transition-all text-sm ${
              selectedPeriod === 'monthly' ?
                'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' :
                'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Optimized Stats with Caching */}
      <OptimizedDashboardStats
        entities={{ Admission, Expense, Income, Lead, User, Attendance, Inventory, Task }}
        currentUser={currentUserData}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* Enhanced Revenue & Performance Chart */}
        <div>
          <Card className="premium-card hover:shadow-2xl transition-all duration-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 backdrop-blur-sm border border-emerald-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-display text-gradient">Revenue & Performance Analytics</CardTitle>
                  <p className="text-sm text-muted-foreground">Comprehensive 7-day performance metrics</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748B"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)'
                      }}
                      formatter={(value, name) => [`৳${value.toLocaleString()}`, name]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#revenueGradient)"
                      strokeWidth={3}
                    />
                    <Bar
                      dataKey="expenses"
                      fill="#F59E0B"
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                    <Line
                      type="monotone"
                      dataKey="admissions"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI-Powered Sections - Only for users with reports permission */}
      <PermissionGate module="reports" permission="can_view">
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
          <PredictiveAnalytics
            entities={{ Admission, Expense, Income, Lead, User, Attendance, Inventory, Task }}
            currentUser={currentUserData}
          />
        </div>
      </PermissionGate>

      {/* Digital Clock */}
      <DigitalClock />

      {/* Enhanced KPI Cards Grid with Advanced Metrics - STABLE COLORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredKpiCards.map((card) => (
          <div key={card.title}>
            <KPICard {...card} />
          </div>
        ))}
      </div>

      {/* Enhanced Quick Actions with Navigation */}
      <Card className="premium-card hover:shadow-2xl transition-all duration-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 backdrop-blur-sm border border-violet-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-display text-gradient">Smart Quick Actions</CardTitle>
              <p className="text-sm text-muted-foreground">AI-powered workflow shortcuts</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => handleQuickAction('new_admission')}
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Users className="w-6 h-6" />
              <span className="text-sm font-semibold">New Admission</span>
            </Button>
            <Button
              onClick={() => handleQuickAction('add_lead')}
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Target className="w-6 h-6" />
              <span className="text-sm font-semibold">Add Lead</span>
            </Button>
            <Button
              onClick={() => handleQuickAction('record_income')}
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <DollarSign className="w-6 h-6" />
              <span className="text-sm font-semibold">Record Income</span>
            </Button>
            <Button
              onClick={() => handleQuickAction('view_reports')}
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <BarChart3 className="w-6 h-6" />
              <span className="text-sm font-semibold">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

// CRITICAL FIX: Correct withPermission usage - parameters should be strings, not objects
export default withPermission(DashboardComponent, 'dashboard', 'can_view');
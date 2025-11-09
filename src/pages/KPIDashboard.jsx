import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Admission } from "@/entities/Admission";
import { Expense } from "@/entities/Expense";
import { Income } from "@/entities/Income";
import { Lead } from "@/entities/Lead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  DollarSign,
  Percent,
  Calendar,
  Award,
  Activity
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, AreaChart, Area } from 'recharts';

export default function KPIDashboard() {
  const [kpiData, setKpiData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  useEffect(() => {
    loadKPIData();
  }, [selectedPeriod]);

  const loadKPIData = async () => {
    setIsLoading(true);
    try {
      const [admissions, expenses, incomes, leads, users] = await Promise.all([
        Admission.list('-admission_date', 500),
        Expense.list('-expense_date', 300),
        Income.list('-income_date', 300),
        Lead.list('-created_date', 200),
        User.list()
      ]);

      const processedData = calculateKPIs({
        admissions,
        expenses,
        incomes,
        leads,
        users
      });

      setKpiData(processedData);
    } catch (error) {
      console.error("Error loading KPI data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateKPIs = (data) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthAdmissions = data.admissions.filter(a => {
      const date = new Date(a.admission_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonthAdmissions = data.admissions.filter(a => {
      const date = new Date(a.admission_date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const currentMonthRevenue = data.incomes.filter(i => {
      const date = new Date(i.income_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).reduce((sum, i) => sum + i.amount, 0);

    const lastMonthRevenue = data.incomes.filter(i => {
      const date = new Date(i.income_date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).reduce((sum, i) => sum + i.amount, 0);

    const currentMonthExpenses = data.expenses.filter(e => {
      const date = new Date(e.expense_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).reduce((sum, e) => sum + e.amount, 0);

    const currentMonthLeads = data.leads.filter(l => {
      const date = new Date(l.created_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const convertedLeads = data.leads.filter(l => l.lead_status === 'converted');
    const conversionRate = data.leads.length > 0 ? (convertedLeads.length / data.leads.length) * 100 : 0;

    const avgAdmissionValue = currentMonthAdmissions.length > 0 ? 
      currentMonthAdmissions.reduce((sum, a) => sum + a.admission_fee, 0) / currentMonthAdmissions.length : 0;

    const marketingExpenses = data.expenses.filter(e => e.category === 'marketing' && 
      new Date(e.expense_date).getMonth() === currentMonth).reduce((sum, e) => sum + e.amount, 0);

    const customerAcquisitionCost = marketingExpenses > 0 && currentMonthAdmissions.length > 0 ? 
      marketingExpenses / currentMonthAdmissions.length : 0;

    const roas = marketingExpenses > 0 ? currentMonthRevenue / marketingExpenses : 0;

    // Monthly trends for charts
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStr = month.toISOString().slice(0, 7);

      const monthAdmissions = data.admissions.filter(a => a.admission_date?.startsWith(monthStr));
      const monthRevenue = data.incomes.filter(i => i.income_date?.startsWith(monthStr))
        .reduce((sum, i) => sum + i.amount, 0);
      const monthLeads = data.leads.filter(l => l.created_date?.startsWith(monthStr));

      monthlyTrends.push({
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        admissions: monthAdmissions.length,
        revenue: monthRevenue,
        leads: monthLeads.length,
        conversion: monthLeads.length > 0 ? 
          (monthLeads.filter(l => l.lead_status === 'converted').length / monthLeads.length) * 100 : 0
      });
    }

    return {
      admissions: {
        current: currentMonthAdmissions.length,
        previous: lastMonthAdmissions.length,
        growth: lastMonthAdmissions.length > 0 ? 
          ((currentMonthAdmissions.length - lastMonthAdmissions.length) / lastMonthAdmissions.length) * 100 : 0,
        target: 50,
        achievement: (currentMonthAdmissions.length / 50) * 100
      },
      revenue: {
        current: currentMonthRevenue,
        previous: lastMonthRevenue,
        growth: lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0,
        target: 1000000,
        achievement: (currentMonthRevenue / 1000000) * 100
      },
      leads: {
        current: currentMonthLeads.length,
        converted: convertedLeads.length,
        conversionRate,
        target: 80,
        achievement: (conversionRate / 80) * 100
      },
      costs: {
        customerAcquisitionCost,
        avgAdmissionValue,
        roas,
        profitMargin: currentMonthRevenue > 0 ? ((currentMonthRevenue - currentMonthExpenses) / currentMonthRevenue) * 100 : 0
      },
      trends: monthlyTrends
    };
  };

  const getGrowthColor = (growth) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getGrowthIcon = (growth) => {
    return growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (isLoading) {
    return <div className="p-6">Loading KPI Dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">KPI Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor key performance indicators and business metrics.</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Admissions</p>
                <p className="text-3xl font-bold text-blue-600">{kpiData.admissions?.current || 0}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Target: {kpiData.admissions?.target}</span>
                <div className={`flex items-center gap-1 ${getGrowthColor(kpiData.admissions?.growth || 0)}`}>
                  {getGrowthIcon(kpiData.admissions?.growth || 0)}
                  <span className="text-sm font-medium">
                    {Math.abs(kpiData.admissions?.growth || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Progress value={kpiData.admissions?.achievement || 0} className="h-2" />
              <p className="text-xs text-gray-500">
                {(kpiData.admissions?.achievement || 0).toFixed(1)}% of target achieved
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-green-600">৳{(kpiData.revenue?.current || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Target: ৳{(kpiData.revenue?.target || 0).toLocaleString()}</span>
                <div className={`flex items-center gap-1 ${getGrowthColor(kpiData.revenue?.growth || 0)}`}>
                  {getGrowthIcon(kpiData.revenue?.growth || 0)}
                  <span className="text-sm font-medium">
                    {Math.abs(kpiData.revenue?.growth || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Progress value={kpiData.revenue?.achievement || 0} className="h-2" />
              <p className="text-xs text-gray-500">
                {(kpiData.revenue?.achievement || 0).toFixed(1)}% of target achieved
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Lead Conversion Rate</p>
                <p className="text-3xl font-bold text-purple-600">{(kpiData.leads?.conversionRate || 0).toFixed(1)}%</p>
              </div>
              <Percent className="w-8 h-8 text-purple-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Target: {kpiData.leads?.target}%</span>
                <Badge className="bg-purple-100 text-purple-800">
                  {kpiData.leads?.converted || 0} converted
                </Badge>
              </div>
              <Progress value={kpiData.leads?.achievement || 0} className="h-2" />
              <p className="text-xs text-gray-500">
                From {kpiData.leads?.current || 0} total leads this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Return on Ad Spend</p>
                <p className="text-3xl font-bold text-orange-600">{(kpiData.costs?.roas || 0).toFixed(1)}x</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">CAC: ৳{(kpiData.costs?.customerAcquisitionCost || 0).toLocaleString()}</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {(kpiData.costs?.profitMargin || 0).toFixed(1)}% margin
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Avg. Order Value: ৳{(kpiData.costs?.avgAdmissionValue || 0).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Admission & Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpiData.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="admissions" fill="#3b82f6" name="Admissions" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (৳)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Lead Generation & Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpiData.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area yAxisId="left" type="monotone" dataKey="leads" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Leads" />
                  <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#f59e0b" strokeWidth={3} name="Conversion Rate (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Marketing Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cost per Acquisition</span>
                <span className="font-bold">৳{(kpiData.costs?.customerAcquisitionCost || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Return on Ad Spend</span>
                <span className="font-bold">{(kpiData.costs?.roas || 0).toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg. Order Value</span>
                <span className="font-bold">৳{(kpiData.costs?.avgAdmissionValue || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Profit Margin</span>
                <span className="font-bold text-green-600">{(kpiData.costs?.profitMargin || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Revenue Growth</span>
                <span className={`font-bold ${getGrowthColor(kpiData.revenue?.growth || 0)}`}>
                  {(kpiData.revenue?.growth || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Target Achievement</span>
                <span className="font-bold">{(kpiData.revenue?.achievement || 0).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Admission Target</span>
                <span className="font-bold">{(kpiData.admissions?.achievement || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Lead Quality Score</span>
                <span className="font-bold">{(kpiData.leads?.conversionRate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Monthly Growth</span>
                <span className={`font-bold ${getGrowthColor(kpiData.admissions?.growth || 0)}`}>
                  {(kpiData.admissions?.growth || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
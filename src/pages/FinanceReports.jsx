
import React, { useState, useEffect } from 'react';
import { Income } from '@/entities/Income';
import { Expense } from '@/entities/Expense';
import { Budget } from '@/entities/Budget';
import { Incentive } from '@/entities/Incentive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, DollarSign, FileDown, Calendar, Target } from 'lucide-react'; // Removed Printer icon
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Area, AreaChart } from 'recharts';
import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { generateFinancePDF } from '@/functions/generateFinancePDF'; // New import
import { safeFormatDate } from '@/utils';
import { toast } from 'sonner'; // Use sonner instead of react-hot-toast

const COLORS = ['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

export default function FinanceReports() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadFinanceData();
  }, [selectedPeriod, selectedYear]);

  const loadFinanceData = async () => {
    setIsLoading(true);
    try {
      const [incomes, expenses, budgets, incentives] = await Promise.all([
        Income.list('-income_date', 1000),
        Expense.list('-expense_date', 1000),
        Budget.list('-month', 500),
        Incentive.list('-month', 500)
      ]);

      const processedData = processFinanceData(incomes, expenses, budgets, incentives);
      setReportData(processedData);
    } catch (error) {
      console.error("Error loading finance data:", error);
      toast.error("Failed to load finance data.");
    } finally {
      setIsLoading(false);
    }
  };

  const processFinanceData = (incomes, expenses, budgets, incentives) => {
    const now = new Date();
    let startDate, endDate;

    // Determine date range
    switch (selectedPeriod) {
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(new Date(selectedYear, 0, 1));
        endDate = endOfYear(new Date(selectedYear, 11, 31));
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    // Helper to get BDT date string from any date or string
    const getBDTDateStr = (dateVal) => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
    };

    const startStr = getBDTDateStr(startDate);
    const endStr = getBDTDateStr(endDate);

    // Filter data by period using BDT date strings
    const filteredIncomes = incomes.filter(income => {
      const incDateStr = getBDTDateStr(income.income_date);
      return incDateStr >= startStr && incDateStr <= endStr;
    });

    const filteredExpenses = expenses.filter(expense => {
      const expDateStr = getBDTDateStr(expense.expense_date);
      return expDateStr >= startStr && expDateStr <= endStr && expense.status === 'approved';
    });

    // Calculate totals
    const totalIncome = filteredIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;

    // Revenue breakdown by stream
    const revenueBreakdown = {};
    filteredIncomes.forEach(income => {
      const stream = income.revenue_stream || 'other';
      revenueBreakdown[stream] = (revenueBreakdown[stream] || 0) + (income.amount || 0);
    });

    // Expense breakdown by category
    const expenseBreakdown = {};
    filteredExpenses.forEach(expense => {
      const category = expense.category || 'other';
      expenseBreakdown[category] = (expenseBreakdown[category] || 0) + (expense.amount || 0);
    });

    // Department-wise expenses
    const departmentExpenses = {};
    filteredExpenses.forEach(expense => {
      const dept = expense.department || 'other';
      departmentExpenses[dept] = (departmentExpenses[dept] || 0) + (expense.amount || 0);
    });

    // Daily/Monthly trend data
    const trendData = generateTrendData(filteredIncomes, filteredExpenses, startDate, endDate, selectedPeriod);

    // Budget vs Actual
    const budgetComparison = calculateBudgetComparison(budgets, filteredExpenses, selectedPeriod);

    return {
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        transactionCount: filteredIncomes.length + filteredExpenses.length
      },
      revenueBreakdown: Object.entries(revenueBreakdown).map(([name, value]) => ({ name, value })),
      expenseBreakdown: Object.entries(expenseBreakdown).map(([name, value]) => ({ name, value })),
      departmentExpenses: Object.entries(departmentExpenses).map(([name, value]) => ({ name, value })),
      trendData,
      budgetComparison,
      period: selectedPeriod,
      dateRange: { startDate, endDate }
    };
  };

  const generateTrendData = (incomes, expenses, startDate, endDate, period) => {
    const data = [];
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(currentDate);
      
      const dayIncomes = incomes.filter(income => income.income_date && income.income_date.startsWith(dateStr));
      const dayExpenses = expenses.filter(expense => expense.expense_date && expense.expense_date.startsWith(dateStr));
      
      const dayIncome = dayIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
      const dayExpense = dayExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      data.push({
        date: period === 'year' ? safeFormatDate(currentDate, 'MMM') : safeFormatDate(currentDate, 'MMM dd'),
        income: dayIncome,
        expense: dayExpense,
        profit: dayIncome - dayExpense
      });
    }
    
    return data;
  };

  const calculateBudgetComparison = (budgets, expenses, period) => {
    const currentMonth = safeFormatDate(new Date(), 'yyyy-MM');
    const monthBudgets = budgets.filter(budget => budget.month === currentMonth);
    
    return monthBudgets.map(budget => {
      const actualSpent = expenses
        .filter(expense => 
          expense.department === budget.department && 
          expense.category === budget.category
        )
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      const utilization = budget.allocated_amount > 0 ? (actualSpent / budget.allocated_amount) * 100 : 0;
      
      return {
        department: budget.department,
        category: budget.category,
        budgeted: budget.allocated_amount || 0,
        actual: actualSpent,
        utilization,
        variance: actualSpent - (budget.allocated_amount || 0)
      };
    });
  };

  const exportToCSV = () => {
    if (!reportData) return;
    
    const csvData = [
      ['Finance Report Summary'],
      ['Period', selectedPeriod],
      ['Date Range', `${safeFormatDate(reportData.dateRange.startDate, 'yyyy-MM-dd')} to ${safeFormatDate(reportData.dateRange.endDate, 'yyyy-MM-dd')}`],
      [''],
      ['Summary'],
      ['Total Income', reportData.summary.totalIncome],
      ['Total Expenses', reportData.summary.totalExpenses],
      ['Net Profit', reportData.summary.netProfit],
      ['Profit Margin (%)', reportData.summary.profitMargin.toFixed(2)],
      [''],
      ['Revenue Breakdown'],
      ...reportData.revenueBreakdown.map(item => [item.name, item.value]),
      [''],
      ['Expense Breakdown'],
      ...reportData.expenseBreakdown.map(item => [item.name, item.value])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_report_${selectedPeriod}_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV report downloaded successfully!');
  };

  const handleExportPDF = async () => {
    if (!reportData) {
      toast.error('No report data available to export');
      return;
    }

    try {
      toast.info('Generating PDF report...', {
        duration: 5000
      });
      
      const response = await generateFinancePDF({
        reportData,
        period: selectedPeriod,
        dateRange: {
          startDate: safeFormatDate(reportData.dateRange.startDate, 'yyyy-MM-dd'),
          endDate: safeFormatDate(reportData.dateRange.endDate, 'yyyy-MM-dd')
        }
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_report_${selectedPeriod}_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF report downloaded successfully!');
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading finance reports...</div>;
  }

  if (!reportData) {
    return <div className="p-6 text-foreground">No data available</div>;
  }

  return (
    <div className="p-6 space-y-6 min-h-screen"> {/* Removed printable-area class as it's for window.print() */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"> {/* Removed print-hide class */}
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Finance Reports</h1>
          <p className="text-lg text-muted-foreground mt-1">Comprehensive financial analytics and insights.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedPeriod === 'year' && (
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button onClick={exportToCSV} variant="outline">
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
            <FileDown className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              ৳{reportData.summary.totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current {selectedPeriod}</p>
          </CardContent>
        </Card>
        
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingUp className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              ৳{reportData.summary.totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current {selectedPeriod}</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            <Target className="w-4 h-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${reportData.summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ৳{reportData.summary.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current {selectedPeriod}</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${reportData.summary.profitMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {reportData.summary.profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Of total income</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Trend */}
        <Card className="premium-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Income vs Expense Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <ComposedChart data={reportData.trendData}>
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
                    tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [`৳${value.toLocaleString()}`, name]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.6}
                    name="Income"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expense" 
                    stackId="2"
                    stroke="#EF4444" 
                    fill="#EF4444" 
                    fillOpacity={0.6}
                    name="Expenses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#7C3AED" 
                    strokeWidth={3}
                    name="Profit"
                    dot={{ fill: '#7C3AED', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={reportData.revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={reportData.expenseBreakdown} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number"
                    tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    fontSize={10}
                  />
                  <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, 'Amount']} />
                  <Bar dataKey="value" fill="#EC4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual */}
      {reportData.budgetComparison.length > 0 && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Budget vs Actual Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.budgetComparison.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold capitalize">
                      {item.department} - {item.category}
                    </h4>
                    <Badge className={item.utilization > 100 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {item.utilization.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-muted-foreground">Budgeted:</span>
                      <p className="font-semibold">৳{item.budgeted.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual:</span>
                      <p className="font-semibold">৳{item.actual.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Variance:</span>
                      <p className={`font-semibold ${item.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ৳{item.variance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.utilization > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, item.utilization)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

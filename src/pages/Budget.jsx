import React, { useState, useEffect } from 'react';
import { Budget as BudgetEntity } from '@/entities/Budget';
import { Expense } from '@/entities/Expense';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertTriangle, TrendingUp, DollarSign, Target, Calendar, Clock, FileSignature } from 'lucide-react';
import { format, startOfWeek, endOfWeek, getISOWeek, parseISO, isWithinInterval } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import BudgetForm from '../components/budget/BudgetForm';
import BudgetReportGenerator from '../components/budget/BudgetReportGenerator';

const DEPARTMENTS = [
  { value: 'biddabari_publication', label: 'Biddabari Publication' },
  { value: 'it', label: 'IT' },
  { value: 'boibari', label: 'Boibari' },
  { value: 'admission', label: 'Admission' },
  { value: 'service', label: 'Service' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'prodhan_com_e_commerce', label: 'Prodhan.com (E-commerce)' },
  { value: 'sales', label: 'Sales' },
  { value: 'r_and_d', label: 'R & D' }
];

const getDepartmentDisplayName = (departmentValue) => {
  const dept = DEPARTMENTS.find(d => d.value === departmentValue);
  return dept ? dept.label : departmentValue;
};

const getDepartmentColor = (departmentValue) => {
    const colors = {
        biddabari_publication: "bg-blue-100 text-blue-800",
        it: "bg-indigo-100 text-indigo-800",
        boibari: "bg-purple-100 text-purple-800",
        admission: "bg-pink-100 text-pink-800",
        service: "bg-teal-100 text-teal-800",
        marketing: "bg-orange-100 text-orange-800",
        prodhan_com_e_commerce: "bg-red-100 text-red-800",
        sales: "bg-green-100 text-green-800",
        r_and_d: "bg-yellow-100 text-yellow-800",
    };
    return colors[departmentValue] || "bg-gray-100 text-gray-800";
};

const generateWeekOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i * 7);
        const week = getISOWeek(date);
        const year = date.getFullYear();
        const value = `${year}-W${week.toString().padStart(2, '0')}`;
        options.push({ value: value, label: `Week ${week}, ${year}` });
    }
    return options;
};

const getWeekDateRange = (weekString) => {
    const [year, weekNum] = weekString.split('-W').map(Number);
    const firstDayOfYear = new Date(year, 0, 1);
    const days = (weekNum - 1) * 7 - firstDayOfYear.getDay() + 1;
    const startDate = new Date(year, 0, days);
    return { start: startOfWeek(startDate), end: endOfWeek(startDate) };
};

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const currentYear = new Date().getFullYear();
    const currentWeek = getISOWeek(new Date());
    return `${currentYear}-W${currentWeek.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      const [budgetData, expenseData] = await Promise.all([
        BudgetEntity.list('-created_date', 200),
        Expense.list('-expense_date', 500)
      ]);
      setBudgets(budgetData || []);
      setExpenses(expenseData || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBudgetSpending = (budgets, allExpenses) => {
    return budgets.map(budget => {
      const budgetExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        const isSameDepartment = expense.department === budget.department;
        const isWithinDate = isWithinInterval(expenseDate, {
          start: parseISO(budget.start_date),
          end: parseISO(budget.end_date)
        });
        return isSameDepartment && isWithinDate;
      });

      const spent_amount = budgetExpenses.reduce((sum, e) => sum + e.amount, 0);
      const allocated_amount = budget.allocated_amount || 0;
      const remaining_amount = allocated_amount - spent_amount;
      const utilization_percentage = allocated_amount > 0 ? (spent_amount / allocated_amount) * 100 : 0;

      return { ...budget, spent_amount, remaining_amount, utilization_percentage };
    });
  };

  const handleFormSubmit = async (formData) => {
    if (editingBudget) {
      await BudgetEntity.update(editingBudget.id, formData);
    } else {
      await BudgetEntity.create(formData);
    }
    setIsFormOpen(false);
    setEditingBudget(null);
    loadData();
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };
  
  const getFilteredBudgets = () => {
    const updatedBudgets = updateBudgetSpending(budgets, expenses);
    if (selectedPeriod === 'weekly') {
      return updatedBudgets.filter(b => b.period_type === 'weekly' && b.period === selectedWeek);
    }
    // Monthly
    return updatedBudgets.filter(b => b.period_type === 'monthly' && b.period === selectedMonth);
  };

  const filteredBudgets = getFilteredBudgets();
  const totalAllocated = filteredBudgets.reduce((sum, b) => sum + (b.allocated_amount || 0), 0);
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overbudgetCount = filteredBudgets.filter(budget => (budget.utilization_percentage || 0) > 100).length;

  const getUtilizationColor = (percentage) => {
    if (percentage > 100) return 'text-red-600 bg-red-100';
    if (percentage > 90) return 'text-orange-600 bg-orange-100';
    if (percentage > 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-emerald-600 bg-emerald-100';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      exceeded: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.cancelled;
  };

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading budget data...</div>;
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient">Budgeting & Reporting</h1>
          <p className="text-lg text-muted-foreground mt-1">Plan, track, and submit departmental spending.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {editingBudget ? 'Edit Budget' : 'Create New Budget'}
              </DialogTitle>
            </DialogHeader>
            <BudgetForm 
              budget={editingBudget}
              currentUser={currentUser}
              selectedMonth={selectedMonth}
              onSubmit={handleFormSubmit} 
              onCancel={() => {
                setIsFormOpen(false);
                setEditingBudget(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="tracking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tracking">
             <Target className="w-4 h-4 mr-2" />
             Budget Tracking
          </TabsTrigger>
          <TabsTrigger value="submission">
            <FileSignature className="w-4 h-4 mr-2" />
            Budget Submission
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tracking" className="space-y-6">
          <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod} className="space-y-6">
            <TabsList>
              <TabsTrigger value="monthly" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Monthly Budgets
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Weekly Budgets
              </TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="space-y-6">
              <div className="flex items-center gap-4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date(new Date().getFullYear(), i, 1);
                      const monthValue = date.toISOString().slice(0, 7);
                      return (
                        <SelectItem key={monthValue} value={monthValue}>
                          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="weekly" className="space-y-6">
               <div className="flex items-center gap-4">
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {generateWeekOptions().map(week => (
                      <SelectItem key={week.value} value={week.value}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPeriod === 'weekly' && (
                  <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                    📅 {(() => {
                      const dateRange = getWeekDateRange(selectedWeek);
                      return `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
                    })()}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid gap-6 md:grid-cols-4">
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Allocated</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">৳{totalAllocated.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Current {selectedPeriod === 'weekly' ? 'week' : 'month'} budget
                </p>
              </CardContent>
            </Card>
            
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">৳{totalSpent.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalAllocated > 0 ? `${((totalSpent / totalAllocated) * 100).toFixed(1)}% utilized` : '0% utilized'}
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
                <Target className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${totalRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ৳{totalRemaining.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available to spend</p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Over Budget</CardTitle>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{overbudgetCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Departments exceeded</p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="border-0 shadow-lg">
             <CardHeader>
              <CardTitle className="text-foreground">
                {selectedPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Budget Breakdown - {
                  selectedPeriod === 'weekly' 
                    ? `Week ${selectedWeek.split('-W')[1]}, ${selectedWeek.split('-W')[0]}`
                    : new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredBudgets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No budgets found</h3>
                  <p>Create your first {selectedPeriod} budget to start tracking expenses.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBudgets.map(budget => (
                    <div key={budget.id} className="border rounded-lg p-6 hover:bg-secondary/50 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h3 className="font-semibold text-lg text-foreground capitalize">
                                    {getDepartmentDisplayName(budget.department)} - {budget.category}
                                    </h3>
                                    <Badge className={getDepartmentColor(budget.department)}>
                                    {getDepartmentDisplayName(budget.department)}
                                    </Badge>
                                    <Badge className={getStatusColor(budget.status)}>
                                    {budget.status}
                                    </Badge>
                                    <Badge variant="outline" className="flex items-center gap-1">
                                    {budget.period_type === 'weekly' ? <Clock className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                    {budget.period_type === 'weekly' ? 'Weekly' : 'Monthly'}
                                    </Badge>
                                    {(budget.utilization_percentage || 0) > 100 && (
                                    <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Over Budget
                                    </Badge>
                                    )}
                                </div>
                                
                                {budget.start_date && budget.end_date && (
                                    <div className="text-sm text-muted-foreground mb-2">
                                    📅 {format(parseISO(budget.start_date), 'MMM dd')} - {format(parseISO(budget.end_date), 'MMM dd, yyyy')}
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                    <div>
                                    <span className="text-muted-foreground">Allocated:</span>
                                    <p className="font-semibold text-foreground">৳{budget.allocated_amount?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                    <span className="text-muted-foreground">Spent:</span>
                                    <p className="font-semibold text-orange-600">৳{budget.spent_amount?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                    <span className="text-muted-foreground">Remaining:</span>
                                    <p className={`font-semibold ${(budget.remaining_amount || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        ৳{budget.remaining_amount?.toLocaleString()}
                                    </p>
                                    </div>
                                    <div>
                                    <span className="text-muted-foreground">Utilization:</span>
                                    <p className={`font-semibold ${getUtilizationColor(budget.utilization_percentage || 0).split(' ')[0]}`}>
                                        {(budget.utilization_percentage || 0).toFixed(1)}%
                                    </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Budget Usage</span>
                                    <span className={`font-medium ${getUtilizationColor(budget.utilization_percentage || 0).split(' ')[0]}`}>
                                        {(budget.utilization_percentage || 0).toFixed(1)}%
                                    </span>
                                    </div>
                                    <Progress 
                                    value={Math.min(100, budget.utilization_percentage || 0)} 
                                    className="h-3"
                                    indicatorClassName={
                                        (budget.utilization_percentage || 0) > 100 ? 'bg-red-500' :
                                        (budget.utilization_percentage || 0) > 90 ? 'bg-orange-500' :
                                        (budget.utilization_percentage || 0) > 75 ? 'bg-yellow-500' : 'bg-emerald-500'
                                    }
                                    />
                                    {(budget.utilization_percentage || 0) > 100 && (
                                    <div className="text-xs text-red-600 font-medium">
                                        Exceeded by ৳{((budget.spent_amount || 0) - (budget.allocated_amount || 0)).toLocaleString()}
                                    </div>
                                    )}
                                </div>

                                {budget.notes && (
                                    <div className="mt-3 p-3 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Notes:</strong> {budget.notes}
                                    </p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-2 ml-4">
                                {(currentUser?.role === 'admin' || currentUser?.department === budget.department) && (
                                    <Button size="sm" variant="outline" onClick={() => handleEdit(budget)}>
                                    Edit Budget
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="submission">
          <BudgetReportGenerator currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
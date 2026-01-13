import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  DollarSign, Users, Calculator, TrendingUp, TrendingDown, 
  Download, Settings, Save, Loader2, AlertTriangle, 
  CheckCircle, Gift, Minus, Plus, FileText, PieChart
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { User } from '@/entities/User';
import { Attendance } from '@/entities/Attendance';
import { Order } from '@/entities/Order';
import { Expense } from '@/entities/Expense';
import { Income } from '@/entities/Income';
import { withPermission } from '@/components/common/PermissionGuard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend 
} from 'recharts';

function FinanceManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('payroll');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Salary adjustment state
  const [adjustments, setAdjustments] = useState({
    bonus: 0,
    mercy: 0,
    deduction: 0,
    absent_deduction_per_day: 500,
    late_deduction_per_day: 100,
    notes: ''
  });

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => User.list()
  });

  // Fetch attendance for selected month
  const { data: monthAttendance = [] } = useQuery({
    queryKey: ['monthAttendance', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      
      const records = await Attendance.list('-date', 5000);
      return records.filter(r => {
        const date = parseISO(r.date);
        return date >= start && date <= end;
      });
    }
  });

  // Fetch orders for revenue calculation
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      
      const allOrders = await Order.list('-order_date', 5000);
      return allOrders.filter(o => {
        const date = parseISO(o.order_date || o.created_date);
        return date >= start && date <= end;
      });
    }
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      
      const allExpenses = await Expense.list('-expense_date', 5000);
      return allExpenses.filter(e => {
        const date = parseISO(e.expense_date);
        return date >= start && date <= end && e.status === 'approved';
      });
    }
  });

  // Calculate payroll for each employee
  const payrollData = useMemo(() => {
    return allUsers.map(user => {
      const userAttendance = monthAttendance.filter(a => a.employee_id === user.id);
      const presentDays = userAttendance.filter(a => a.status === 'present').length;
      const lateDays = userAttendance.filter(a => a.status === 'late').length;
      const absentDays = userAttendance.filter(a => a.status === 'absent').length;
      const totalHours = userAttendance.reduce((sum, a) => sum + (a.working_hours || 0), 0);
      
      const baseSalary = user.base_salary || 0;
      const absentDeduction = absentDays * (adjustments.absent_deduction_per_day || 500);
      const lateDeduction = lateDays * (adjustments.late_deduction_per_day || 100);
      const totalDeductions = absentDeduction + lateDeduction;
      const netSalary = Math.max(0, baseSalary - totalDeductions);
      
      return {
        ...user,
        presentDays,
        lateDays,
        absentDays,
        totalHours,
        baseSalary,
        absentDeduction,
        lateDeduction,
        totalDeductions,
        netSalary
      };
    }).filter(u => u.baseSalary > 0);
  }, [allUsers, monthAttendance, adjustments]);

  // Calculate total payroll
  const totalPayroll = payrollData.reduce((sum, e) => sum + e.netSalary, 0);
  const totalDeductions = payrollData.reduce((sum, e) => sum + e.totalDeductions, 0);

  // Calculate revenue and profit
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grossProfit = totalRevenue - totalExpenses;
  const netProfit = grossProfit - totalPayroll;
  const roi = totalExpenses > 0 ? ((grossProfit / totalExpenses) * 100).toFixed(2) : 0;

  // Chart data
  const profitLossData = [
    { name: 'Revenue', value: totalRevenue, fill: '#10B981' },
    { name: 'Expenses', value: totalExpenses, fill: '#EF4444' },
    { name: 'Payroll', value: totalPayroll, fill: '#3B82F6' }
  ];

  const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6'];

  // Handle salary adjustment save
  const handleSaveAdjustment = async () => {
    if (!selectedEmployee) return;
    
    setIsProcessing(true);
    try {
      const updatedNetSalary = selectedEmployee.baseSalary 
        - selectedEmployee.totalDeductions 
        + adjustments.bonus 
        + adjustments.mercy 
        - adjustments.deduction;
      
      // Here you would save to a PayrollRecord entity
      toast.success(`Salary for ${selectedEmployee.full_name} calculated: ৳${updatedNetSalary.toLocaleString()}`);
      setShowSalaryDialog(false);
    } catch (error) {
      toast.error('Failed to process salary: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Finance Management</h1>
              <p className="text-slate-600 dark:text-slate-400">Payroll, Profit & Loss Analysis</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-48"
          />
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-800">৳{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-800">৳{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">Total Payroll</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">৳{totalPayroll.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={`${netProfit >= 0 ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5" />
              <span className="text-sm">Net Profit</span>
            </div>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              ৳{netProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-purple-700">ROI</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">{roi}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="payroll" className="gap-2">
            <Users className="w-4 h-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="profitloss" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Employee Payroll - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </CardTitle>
              <CardDescription>
                Click on an employee to adjust salary with bonuses, mercy, or deductions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Employee</th>
                      <th className="px-4 py-3 text-right">Base Salary</th>
                      <th className="px-4 py-3 text-center">Present</th>
                      <th className="px-4 py-3 text-center">Late</th>
                      <th className="px-4 py-3 text-center">Absent</th>
                      <th className="px-4 py-3 text-right">Deductions</th>
                      <th className="px-4 py-3 text-right">Net Salary</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.map((employee) => (
                      <tr key={employee.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={employee.profile_picture_url} />
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {(employee.full_name || 'U').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{employee.full_name}</p>
                              <p className="text-xs text-slate-500">{employee.designation || 'Staff'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ৳{employee.baseSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-green-100 text-green-800">{employee.presentDays}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-amber-100 text-amber-800">{employee.lateDays}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-red-100 text-red-800">{employee.absentDays}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          -৳{employee.totalDeductions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          ৳{employee.netSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setAdjustments({ ...adjustments, bonus: 0, mercy: 0, deduction: 0, notes: '' });
                              setShowSalaryDialog(true);
                            }}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Adjust
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold">
                    <tr>
                      <td className="px-4 py-3" colSpan={5}>Total</td>
                      <td className="px-4 py-3 text-right text-red-600">
                        -৳{totalDeductions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        ৳{totalPayroll.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="profitloss" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitLossData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(value) => `৳${value.toLocaleString()}`} />
                      <Bar dataKey="value" fill="#3B82F6">
                        {profitLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expense Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={profitLossData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {profitLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `৳${value.toLocaleString()}`} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* P&L Summary */}
          <Card className="border-2 border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Profit & Loss Statement - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="font-semibold text-green-800">Total Revenue</span>
                  <span className="text-xl font-bold text-green-700">৳{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <span className="font-semibold text-red-800">Total Expenses</span>
                  <span className="text-xl font-bold text-red-700">-৳{totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="font-semibold text-blue-800">Total Payroll</span>
                  <span className="text-xl font-bold text-blue-700">-৳{totalPayroll.toLocaleString()}</span>
                </div>
                <hr className="my-4" />
                <div className={`flex justify-between items-center p-6 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                    {netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                  </span>
                  <span className={`text-3xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    ৳{Math.abs(netProfit).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Payroll Deduction Settings
              </CardTitle>
              <CardDescription>
                Configure default deduction amounts for attendance violations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Absent Deduction (per day)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">৳</span>
                    <Input
                      type="number"
                      value={adjustments.absent_deduction_per_day}
                      onChange={(e) => setAdjustments({ ...adjustments, absent_deduction_per_day: parseFloat(e.target.value) || 0 })}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Amount deducted for each absent day</p>
                </div>
                <div className="space-y-2">
                  <Label>Late Deduction (per day)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">৳</span>
                    <Input
                      type="number"
                      value={adjustments.late_deduction_per_day}
                      onChange={(e) => setAdjustments({ ...adjustments, late_deduction_per_day: parseFloat(e.target.value) || 0 })}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Amount deducted for each late arrival</p>
                </div>
              </div>
              
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Salary Adjustment Dialog */}
      <Dialog open={showSalaryDialog} onOpenChange={setShowSalaryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Salary Adjustment - {selectedEmployee?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-6 py-4">
              {/* Base Info */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Base Salary</span>
                  <span className="font-semibold">৳{selectedEmployee.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Auto Deductions (Absent + Late)</span>
                  <span>-৳{selectedEmployee.totalDeductions.toLocaleString()}</span>
                </div>
              </div>

              {/* Manual Adjustments */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-600" />
                    Bonus Amount
                  </Label>
                  <Input
                    type="number"
                    value={adjustments.bonus}
                    onChange={(e) => setAdjustments({ ...adjustments, bonus: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-600" />
                    Mercy/Allowance
                  </Label>
                  <Input
                    type="number"
                    value={adjustments.mercy}
                    onChange={(e) => setAdjustments({ ...adjustments, mercy: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-red-600" />
                    Additional Deduction
                  </Label>
                  <Input
                    type="number"
                    value={adjustments.deduction}
                    onChange={(e) => setAdjustments({ ...adjustments, deduction: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={adjustments.notes}
                    onChange={(e) => setAdjustments({ ...adjustments, notes: e.target.value })}
                    placeholder="Reason for adjustments..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Final Calculation */}
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-800">Final Net Salary</span>
                  <span className="text-2xl font-bold text-green-700">
                    ৳{(selectedEmployee.netSalary + adjustments.bonus + adjustments.mercy - adjustments.deduction).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalaryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdjustment} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" />Confirm & Save</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withPermission(FinanceManagementPage, 'finance', 'can_view');
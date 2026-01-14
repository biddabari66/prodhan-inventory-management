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
import { 
  DollarSign, Users, Calculator, TrendingUp, TrendingDown, 
  Download, Settings, Save, Loader2, Plus, Minus, FileText, 
  PieChart, Package, Truck, RotateCcw, Target, BarChart3,
  CheckCircle, Gift, AlertTriangle, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { User } from '@/entities/User';
import { Attendance } from '@/entities/Attendance';
import { Order } from '@/entities/Order';
import { Inventory } from '@/entities/Inventory';
import { withPermission } from '@/components/common/PermissionGuard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend 
} from 'recharts';
import SavedReportsTable from '../components/finance/SavedReportsTable';

function FinanceManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('payroll');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [showROIDialog, setShowROIDialog] = useState(false);
  const [showPLDialog, setShowPLDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Manual Profit/Loss State
  const [manualPL, setManualPL] = useState({
    revenue: 0,
    cost_of_goods: 0,
    ad_budget: 0,
    shipping_cost: 0,
    packaging_cost: 0,
    return_loss: 0,
    other_expenses: 0,
    notes: ''
  });

  // ROI Calculation State
  const [roiData, setRoiData] = useState({
    product_name: '',
    purchase_price: 0,
    selling_price: 0,
    quantity_sold: 0,
    ad_spend: 0,
    packaging_per_unit: 0,
    shipping_per_unit: 0,
    return_rate: 0,
    other_costs: 0
  });

  // Payroll adjustment state
  const [adjustments, setAdjustments] = useState({
    bonus: 0,
    mercy: 0,
    deduction: 0,
    working_days: 26,
    absent_deduction_per_day: 500,
    late_deduction_per_day: 100,
    overtime_rate: 100,
    overtime_hours: 0,
    notes: ''
  });

  // Fetch only prodhan.com e-commerce employees
  const { data: allUsers = [] } = useQuery({
    queryKey: ['ecommerceUsers'],
    queryFn: async () => {
      const users = await User.list();
      return users.filter(u => 
        u.department === 'prodhan_com_e_commerce' || 
        u.department === 'prodhan.com' ||
        u.job_role === 'admin' ||
        u.job_role === 'super_admin'
      );
    }
  });

  // Fetch products for ROI calculation
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => Inventory.filter({ department: 'prodhan_com_e_commerce' })
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

  // Fetch orders
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      
      const allOrders = await Order.filter({ department: 'prodhan_com_e_commerce' }, '-order_date', 5000);
      return allOrders.filter(o => {
        const date = parseISO(o.order_date || o.created_date);
        return date >= start && date <= end;
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

  const totalPayroll = payrollData.reduce((sum, e) => sum + e.netSalary, 0);
  const totalDeductions = payrollData.reduce((sum, e) => sum + e.totalDeductions, 0);

  // Calculate ROI
  const calculateROI = () => {
    const { purchase_price, selling_price, quantity_sold, ad_spend, packaging_per_unit, shipping_per_unit, return_rate, other_costs } = roiData;
    
    const totalRevenue = selling_price * quantity_sold;
    const totalCOGS = purchase_price * quantity_sold;
    const totalPackaging = packaging_per_unit * quantity_sold;
    const totalShipping = shipping_per_unit * quantity_sold;
    const returnLoss = (totalRevenue * (return_rate / 100));
    const totalCosts = totalCOGS + ad_spend + totalPackaging + totalShipping + returnLoss + other_costs;
    const grossProfit = totalRevenue - totalCosts;
    const roi = totalCosts > 0 ? ((grossProfit / totalCosts) * 100) : 0;
    const profitPerUnit = quantity_sold > 0 ? (grossProfit / quantity_sold) : 0;
    
    return { totalRevenue, totalCOGS, totalCosts, grossProfit, roi, profitPerUnit, returnLoss };
  };

  const roiResult = calculateROI();

  // Manual P&L Calculation
  const plResult = useMemo(() => {
    const totalExpenses = manualPL.cost_of_goods + manualPL.ad_budget + manualPL.shipping_cost + 
                         manualPL.packaging_cost + manualPL.return_loss + manualPL.other_expenses;
    const grossProfit = manualPL.revenue - totalExpenses;
    const netProfit = grossProfit - totalPayroll;
    const profitMargin = manualPL.revenue > 0 ? ((grossProfit / manualPL.revenue) * 100) : 0;
    
    return { totalExpenses, grossProfit, netProfit, profitMargin };
  }, [manualPL, totalPayroll]);

  const profitLossData = [
    { name: 'Revenue', value: manualPL.revenue || 0, fill: '#10B981' },
    { name: 'COGS', value: manualPL.cost_of_goods || 0, fill: '#EF4444' },
    { name: 'Ad Budget', value: manualPL.ad_budget || 0, fill: '#F59E0B' },
    { name: 'Shipping', value: manualPL.shipping_cost || 0, fill: '#3B82F6' },
    { name: 'Payroll', value: totalPayroll, fill: '#8B5CF6' }
  ];

  const handleSaveAdjustment = async () => {
    if (!selectedEmployee) return;
    
    setIsProcessing(true);
    try {
      const overtime = adjustments.overtime_hours * adjustments.overtime_rate;
      const updatedNetSalary = selectedEmployee.baseSalary 
        - selectedEmployee.totalDeductions 
        + adjustments.bonus 
        + adjustments.mercy 
        - adjustments.deduction
        + overtime;
      
      toast.success(`Salary for ${selectedEmployee.full_name} calculated: ৳${updatedNetSalary.toLocaleString()}`);
      setShowSalaryDialog(false);
    } catch (error) {
      toast.error('Failed to process salary: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Finance Management</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#D32F2F]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Finance Management</h1>
              <p className="text-sm text-[#6B7280] mt-0.5">Payroll, Profit & Loss, ROI Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48 h-10 border-slate-200 rounded-lg"
            />
            <Button variant="outline" className="h-10 bg-white border-slate-200 rounded-lg">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards - Minimalist White */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#111827]">৳{(manualPL.revenue || 0).toLocaleString()}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Revenue</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#111827]">৳{plResult.totalExpenses.toLocaleString()}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Expenses</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#111827]">৳{totalPayroll.toLocaleString()}</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Payroll</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${plResult.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ৳{plResult.netProfit.toLocaleString()}
              </p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Net Profit</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#D32F2F]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#111827]">{plResult.profitMargin.toFixed(1)}%</p>
              <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Margin</p>
            </CardContent>
          </Card>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <TabsTrigger value="payroll" className="gap-2 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">
            <Users className="w-4 h-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="profitloss" className="gap-2 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="roi" className="gap-2 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">
            <Target className="w-4 h-4" />
            ROI Calculator
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 rounded-lg data-[state=active]:bg-[#D32F2F] data-[state=active]:text-white">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-6">
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="border-b border-slate-100 px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Users className="w-5 h-5 text-slate-700" />
                Employee Payroll - {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
              </CardTitle>
              <CardDescription className="text-slate-500">
                Prodhan.com E-commerce employees only. Click on an employee to adjust salary.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Employee</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Base Salary</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Present</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Late</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Absent</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Deductions</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Net Salary</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                          No employees with salary data found for Prodhan.com E-commerce
                        </td>
                      </tr>
                    ) : payrollData.map((employee) => (
                      <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-slate-200">
                              <AvatarImage src={employee.profile_picture_url} />
                              <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold">
                                {(employee.full_name || 'U').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-slate-900">{employee.full_name}</p>
                              <p className="text-xs text-slate-500">{employee.designation || 'Staff'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          ৳{employee.baseSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-green-100 text-green-700 border-0">{employee.presentDays}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-amber-100 text-amber-700 border-0">{employee.lateDays}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-red-100 text-red-700 border-0">{employee.absentDays}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">
                          -৳{employee.totalDeductions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          ৳{employee.netSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-slate-300 hover:bg-slate-100"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setAdjustments({ ...adjustments, bonus: 0, mercy: 0, deduction: 0, overtime_hours: 0, notes: '' });
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
                  {payrollData.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold">
                      <tr>
                        <td className="px-4 py-3 text-slate-900" colSpan={5}>Total</td>
                        <td className="px-4 py-3 text-right text-red-600">-৳{totalDeductions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-600">৳{totalPayroll.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss Tab - Manual Input */}
        <TabsContent value="profitloss" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Manual P&L Input */}
            <Card className="border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <FileText className="w-5 h-5 text-slate-700" />
                  Manual Profit & Loss Entry
                </CardTitle>
                <CardDescription>Enter your monthly financials manually</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Total Revenue</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                    <Input
                      type="number"
                      value={manualPL.revenue}
                      onChange={(e) => setManualPL({ ...manualPL, revenue: parseFloat(e.target.value) || 0 })}
                      className="pl-8 border-slate-300"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Cost of Goods Sold (COGS)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                    <Input
                      type="number"
                      value={manualPL.cost_of_goods}
                      onChange={(e) => setManualPL({ ...manualPL, cost_of_goods: parseFloat(e.target.value) || 0 })}
                      className="pl-8 border-slate-300"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    Ad Budget / Marketing
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                    <Input
                      type="number"
                      value={manualPL.ad_budget}
                      onChange={(e) => setManualPL({ ...manualPL, ad_budget: parseFloat(e.target.value) || 0 })}
                      className="pl-8 border-slate-300"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      Shipping Cost
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={manualPL.shipping_cost}
                        onChange={(e) => setManualPL({ ...manualPL, shipping_cost: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      Packaging Cost
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={manualPL.packaging_cost}
                        onChange={(e) => setManualPL({ ...manualPL, packaging_cost: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-red-600" />
                      Return Loss
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={manualPL.return_loss}
                        onChange={(e) => setManualPL({ ...manualPL, return_loss: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Other Expenses</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={manualPL.other_expenses}
                        onChange={(e) => setManualPL({ ...manualPL, other_expenses: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* P&L Summary */}
            <Card className="border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <BarChart3 className="w-5 h-5 text-slate-700" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[250px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitLossData.filter(d => d.value > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `৳${(v/1000).toFixed(0)}K`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `৳${value.toLocaleString()}`} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {profitLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="font-medium text-green-800">Revenue</span>
                    <span className="font-bold text-green-700">৳{manualPL.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-medium text-red-800">Total Expenses</span>
                    <span className="font-bold text-red-700">-৳{plResult.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="font-medium text-blue-800">Payroll</span>
                    <span className="font-bold text-blue-700">-৳{totalPayroll.toLocaleString()}</span>
                  </div>
                  <hr className="my-2 border-slate-200" />
                  <div className={`flex justify-between items-center p-4 rounded-lg ${plResult.netProfit >= 0 ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'}`}>
                    <span className={`text-lg font-bold ${plResult.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {plResult.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                    </span>
                    <span className={`text-2xl font-bold ${plResult.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ৳{Math.abs(plResult.netProfit).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ROI Calculator Tab */}
        <TabsContent value="roi" className="space-y-6">
          {/* Saved Reports Component */}
          <SavedReportsTable 
            roiData={roiData}
            roiResult={roiResult}
            plData={manualPL}
            plResult={plResult}
            payrollData={payrollData}
            totalPayroll={totalPayroll}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROI Input */}
            <Card className="border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Target className="w-5 h-5 text-slate-700" />
                  Per Product ROI Calculator
                </CardTitle>
                <CardDescription>Calculate ROI with all costs included</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Product Name</Label>
                  <Input
                    value={roiData.product_name}
                    onChange={(e) => setRoiData({ ...roiData, product_name: e.target.value })}
                    className="border-slate-300"
                    placeholder="Enter product name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Purchase Price (per unit)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={roiData.purchase_price}
                        onChange={(e) => setRoiData({ ...roiData, purchase_price: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Selling Price (per unit)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={roiData.selling_price}
                        onChange={(e) => setRoiData({ ...roiData, selling_price: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Quantity Sold</Label>
                    <Input
                      type="number"
                      value={roiData.quantity_sold}
                      onChange={(e) => setRoiData({ ...roiData, quantity_sold: parseInt(e.target.value) || 0 })}
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Total Ad Spend</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={roiData.ad_spend}
                        onChange={(e) => setRoiData({ ...roiData, ad_spend: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Packaging (per unit)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={roiData.packaging_per_unit}
                        onChange={(e) => setRoiData({ ...roiData, packaging_per_unit: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Shipping (per unit)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={roiData.shipping_per_unit}
                        onChange={(e) => setRoiData({ ...roiData, shipping_per_unit: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Return Rate (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={roiData.return_rate}
                        onChange={(e) => setRoiData({ ...roiData, return_rate: parseFloat(e.target.value) || 0 })}
                        className="border-slate-300"
                        max={100}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Other Costs</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                      <Input
                        type="number"
                        value={roiData.other_costs}
                        onChange={(e) => setRoiData({ ...roiData, other_costs: parseFloat(e.target.value) || 0 })}
                        className="pl-8 border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ROI Results */}
            <Card className="border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Calculator className="w-5 h-5 text-slate-700" />
                  ROI Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Revenue</p>
                    <p className="text-xl font-bold text-slate-900">৳{roiResult.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Costs</p>
                    <p className="text-xl font-bold text-red-600">৳{roiResult.totalCosts.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Cost Breakdown</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">COGS</span>
                    <span className="font-medium">৳{roiResult.totalCOGS.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Ad Spend</span>
                    <span className="font-medium">৳{roiData.ad_spend.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Packaging</span>
                    <span className="font-medium">৳{(roiData.packaging_per_unit * roiData.quantity_sold).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-medium">৳{(roiData.shipping_per_unit * roiData.quantity_sold).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Return Loss ({roiData.return_rate}%)</span>
                    <span className="font-medium text-red-600">৳{roiResult.returnLoss.toLocaleString()}</span>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 ${roiResult.grossProfit >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-semibold ${roiResult.grossProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      Gross Profit
                    </span>
                    <span className={`text-xl font-bold ${roiResult.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ৳{roiResult.grossProfit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${roiResult.grossProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      Profit Per Unit
                    </span>
                    <span className={`text-lg font-bold ${roiResult.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ৳{roiResult.profitPerUnit.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className={`p-6 rounded-xl text-center ${roiResult.roi >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                  <p className="text-white/80 text-sm font-medium mb-1">Return on Investment</p>
                  <p className="text-4xl font-bold text-white">{roiResult.roi.toFixed(2)}%</p>
                  <p className="text-white/70 text-xs mt-2">
                    {roiResult.roi >= 20 ? '✓ Excellent ROI' : roiResult.roi >= 10 ? '◉ Good ROI' : roiResult.roi >= 0 ? '△ Low ROI' : '✗ Negative ROI'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Settings className="w-5 h-5 text-slate-700" />
                Payroll Deduction Settings
              </CardTitle>
              <CardDescription>Configure default deduction amounts</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Working Days / Month</Label>
                  <Input
                    type="number"
                    value={adjustments.working_days}
                    onChange={(e) => setAdjustments({ ...adjustments, working_days: parseInt(e.target.value) || 26 })}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Absent Deduction (per day)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                    <Input
                      type="number"
                      value={adjustments.absent_deduction_per_day}
                      onChange={(e) => setAdjustments({ ...adjustments, absent_deduction_per_day: parseFloat(e.target.value) || 0 })}
                      className="pl-8 border-slate-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Late Deduction (per day)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                    <Input
                      type="number"
                      value={adjustments.late_deduction_per_day}
                      onChange={(e) => setAdjustments({ ...adjustments, late_deduction_per_day: parseFloat(e.target.value) || 0 })}
                      className="pl-8 border-slate-300"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Overtime Rate (per hour)</Label>
                <div className="relative w-64">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                  <Input
                    type="number"
                    value={adjustments.overtime_rate}
                    onChange={(e) => setAdjustments({ ...adjustments, overtime_rate: parseFloat(e.target.value) || 0 })}
                    className="pl-8 border-slate-300"
                  />
                </div>
              </div>
              
              <Button className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white rounded-lg shadow-sm">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Salary Adjustment Dialog */}
      <Dialog open={showSalaryDialog} onOpenChange={setShowSalaryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Calculator className="w-5 h-5 text-slate-700" />
              Salary Adjustment - {selectedEmployee?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-5 py-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600">Base Salary</span>
                  <span className="font-semibold text-slate-900">৳{selectedEmployee.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Auto Deductions (Absent + Late)</span>
                  <span>-৳{selectedEmployee.totalDeductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Working Days</span>
                  <span>{adjustments.working_days} days</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-700">
                    <Gift className="w-4 h-4 text-green-600" />
                    Bonus
                  </Label>
                  <Input
                    type="number"
                    value={adjustments.bonus}
                    onChange={(e) => setAdjustments({ ...adjustments, bonus: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-700">
                    <Plus className="w-4 h-4 text-blue-600" />
                    Mercy/Allowance
                  </Label>
                  <Input
                    type="number"
                    value={adjustments.mercy}
                    onChange={(e) => setAdjustments({ ...adjustments, mercy: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="border-slate-300"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-700">
                    <Minus className="w-4 h-4 text-red-600" />
                    Additional Deduction
                  </Label>
                  <Input
                    type="number"
                    value={adjustments.deduction}
                    onChange={(e) => setAdjustments({ ...adjustments, deduction: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Overtime Hours
                  </Label>
                  <Input
                    type="number"
                    value={adjustments.overtime_hours}
                    onChange={(e) => setAdjustments({ ...adjustments, overtime_hours: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="border-slate-300"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-700">Notes</Label>
                <Textarea
                  value={adjustments.notes}
                  onChange={(e) => setAdjustments({ ...adjustments, notes: e.target.value })}
                  placeholder="Reason for adjustments..."
                  rows={2}
                  className="border-slate-300"
                />
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-800">Final Net Salary</span>
                  <span className="text-2xl font-bold text-green-700">
                    ৳{(
                      selectedEmployee.netSalary + 
                      adjustments.bonus + 
                      adjustments.mercy - 
                      adjustments.deduction +
                      (adjustments.overtime_hours * adjustments.overtime_rate)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalaryDialog(false)} className="border-slate-300">
              Cancel
            </Button>
            <Button onClick={handleSaveAdjustment} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
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
    </div>
  );
}

export default withPermission(FinanceManagementPage, 'finance', 'can_view');
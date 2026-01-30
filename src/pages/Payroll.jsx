import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, Calculator, Save, Plus, Minus, Gift, 
  Download, Calendar, CheckCircle, Loader2, Clock, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { withPermission } from '@/components/common/PermissionGuard';

function PayrollPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deductionSettings, setDeductionSettings] = useState({
    working_days: 26,
    absent_deduction_per_day: 500,
    late_deduction_per_day: 100,
    overtime_rate: 100
  });
  const [adjustments, setAdjustments] = useState({
    bonus: 0,
    mercy: 0,
    deduction: 0,
    overtime_hours: 0,
    notes: ''
  });

  // Fetch prodhan.com employees
  const { data: employees = [] } = useQuery({
    queryKey: ['payroll-employees'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ department: 'prodhan_com_e_commerce' });
      const admins = await base44.entities.User.filter({ job_role: 'admin' });
      const combined = [...users, ...admins];
      const uniqueMap = new Map();
      combined.forEach(u => uniqueMap.set(u.id, u));
      return Array.from(uniqueMap.values()).filter(u => u.base_salary > 0);
    },
    staleTime: 10 * 60 * 1000
  });

  // Fetch attendance for selected month
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['payroll-attendance', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      
      const records = await base44.entities.Attendance.list('-date', 5000);
      return records.filter(r => r.date >= start && r.date <= end);
    }
  });

  // Fetch existing payroll records
  const { data: existingPayroll = [] } = useQuery({
    queryKey: ['payroll-records', selectedMonth],
    queryFn: () => base44.entities.PayrollRecord.filter({ month: selectedMonth })
  });

  // Calculate payroll data
  const payrollData = useMemo(() => {
    return employees.map(employee => {
      // Check if payroll already generated
      const existing = existingPayroll.find(p => p.employee_id === employee.id);
      if (existing) return { ...employee, ...existing, isGenerated: true };

      const empAttendance = attendanceRecords.filter(a => a.employee_id === employee.id);
      const presentDays = empAttendance.filter(a => a.status === 'present').length;
      const lateDays = empAttendance.filter(a => a.status === 'late').length;
      const absentDays = empAttendance.filter(a => a.status === 'absent').length;
      const totalHours = empAttendance.reduce((sum, a) => sum + (a.working_hours || 0), 0);
      
      const baseSalary = employee.base_salary || 0;
      const absentDeduction = absentDays * deductionSettings.absent_deduction_per_day;
      const lateDeduction = lateDays * deductionSettings.late_deduction_per_day;
      const totalDeductions = absentDeduction + lateDeduction;
      const netSalary = Math.max(0, baseSalary - totalDeductions);
      
      return {
        ...employee,
        presentDays,
        lateDays,
        absentDays,
        totalHours,
        baseSalary,
        absentDeduction,
        lateDeduction,
        totalDeductions,
        bonus: 0,
        mercy_allowance: 0,
        additional_deduction: 0,
        overtime_hours: 0,
        overtime_amount: 0,
        netSalary,
        isGenerated: false
      };
    });
  }, [employees, attendanceRecords, existingPayroll, deductionSettings]);

  const totalPayroll = payrollData.reduce((sum, e) => sum + (e.netSalary || 0), 0);

  // Generate full month payroll
  const handleGeneratePayroll = async () => {
    if (!confirm(`Generate payroll for ${payrollData.length} employees for ${format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}?`)) return;
    
    setIsGenerating(true);
    try {
      const currentUser = await base44.auth.me();
      
      for (const emp of payrollData) {
        if (emp.isGenerated) continue; // Skip already generated
        
        await base44.entities.PayrollRecord.create({
          employee_id: emp.id,
          employee_name: emp.full_name,
          month: selectedMonth,
          base_salary: emp.baseSalary,
          present_days: emp.presentDays,
          late_days: emp.lateDays,
          absent_days: emp.absentDays,
          working_hours: emp.totalHours,
          absent_deduction: emp.absentDeduction,
          late_deduction: emp.lateDeduction,
          bonus: 0,
          mercy_allowance: 0,
          additional_deduction: 0,
          overtime_hours: 0,
          overtime_amount: 0,
          total_deductions: emp.totalDeductions,
          net_salary: emp.netSalary,
          payment_status: 'pending',
          generated_by_id: currentUser.id,
          generated_by_name: currentUser.full_name
        });
      }
      
      queryClient.invalidateQueries(['payroll-records']);
      toast.success(`Payroll generated for ${payrollData.filter(e => !e.isGenerated).length} employees!`);
    } catch (error) {
      toast.error('Failed to generate payroll: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save individual adjustment
  const handleSaveAdjustment = async () => {
    if (!selectedEmployee) return;
    
    setIsGenerating(true);
    try {
      const currentUser = await base44.auth.me();
      const overtime = adjustments.overtime_hours * deductionSettings.overtime_rate;
      const finalNetSalary = selectedEmployee.baseSalary 
        - selectedEmployee.totalDeductions 
        + adjustments.bonus 
        + adjustments.mercy 
        - adjustments.deduction
        + overtime;
      
      // Check if record exists
      const existing = existingPayroll.find(p => p.employee_id === selectedEmployee.id);
      
      if (existing) {
        // Update existing
        await base44.entities.PayrollRecord.update(existing.id, {
          bonus: adjustments.bonus,
          mercy_allowance: adjustments.mercy,
          additional_deduction: adjustments.deduction,
          overtime_hours: adjustments.overtime_hours,
          overtime_amount: overtime,
          total_deductions: selectedEmployee.totalDeductions + adjustments.deduction,
          net_salary: finalNetSalary,
          adjustment_notes: adjustments.notes
        });
      } else {
        // Create new
        await base44.entities.PayrollRecord.create({
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.full_name,
          month: selectedMonth,
          base_salary: selectedEmployee.baseSalary,
          present_days: selectedEmployee.presentDays,
          late_days: selectedEmployee.lateDays,
          absent_days: selectedEmployee.absentDays,
          working_hours: selectedEmployee.totalHours,
          absent_deduction: selectedEmployee.absentDeduction,
          late_deduction: selectedEmployee.lateDeduction,
          bonus: adjustments.bonus,
          mercy_allowance: adjustments.mercy,
          additional_deduction: adjustments.deduction,
          overtime_hours: adjustments.overtime_hours,
          overtime_amount: overtime,
          total_deductions: selectedEmployee.totalDeductions + adjustments.deduction,
          net_salary: finalNetSalary,
          payment_status: 'pending',
          adjustment_notes: adjustments.notes,
          generated_by_id: currentUser.id,
          generated_by_name: currentUser.full_name
        });
      }
      
      queryClient.invalidateQueries(['payroll-records']);
      toast.success(`Salary adjusted for ${selectedEmployee.full_name}: ৳${finalNetSalary.toLocaleString()}`);
      setShowAdjustDialog(false);
      setAdjustments({ bonus: 0, mercy: 0, deduction: 0, overtime_hours: 0, notes: '' });
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Export payroll
  const handleExport = () => {
    const headers = ['Employee', 'Designation', 'Base Salary', 'Present', 'Late', 'Absent', 'Deductions', 'Bonus', 'Mercy', 'Overtime', 'Net Salary', 'Status'];
    const rows = payrollData.map(e => [
      e.full_name, e.designation || 'Staff', e.baseSalary, e.presentDays, e.lateDays, e.absentDays,
      e.totalDeductions + (e.additional_deduction || 0), e.bonus || 0, e.mercy_allowance || 0,
      e.overtime_amount || 0, e.netSalary, e.payment_status || 'pending'
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Payroll exported!');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Finance</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Payroll Management</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Payroll Management</h1>
              <p className="text-slate-600">Prodhan.com Employee Salaries</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48 h-11"
            />
            <Button variant="outline" onClick={handleExport} className="h-11">
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button 
              onClick={handleGeneratePayroll} 
              disabled={isGenerating || payrollData.every(e => e.isGenerated)}
              className="bg-red-600 hover:bg-red-700 shadow-lg h-11"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" />Generate Full Month Payroll</>
              )}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{payrollData.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Employees</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">৳{totalPayroll.toLocaleString()}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Payroll</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{payrollData.filter(e => !e.isGenerated).length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Pending Generation</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{payrollData.filter(e => e.isGenerated).length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Generated</p>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-600" />
              {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')} Payroll
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Employee</th>
                    <th className="px-4 py-3 text-right font-semibold">Base Salary</th>
                    <th className="px-4 py-3 text-center font-semibold">Present</th>
                    <th className="px-4 py-3 text-center font-semibold">Late</th>
                    <th className="px-4 py-3 text-center font-semibold">Absent</th>
                    <th className="px-4 py-3 text-right font-semibold">Deductions</th>
                    <th className="px-4 py-3 text-right font-semibold">Bonus/OT</th>
                    <th className="px-4 py-3 text-right font-semibold">Net Salary</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map(employee => (
                    <tr key={employee.id} className={`border-b hover:bg-slate-50 ${employee.isGenerated ? 'bg-green-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.profile_picture_url} />
                            <AvatarFallback className="bg-red-100 text-red-700">
                              {employee.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-900">{employee.full_name}</p>
                            <p className="text-xs text-slate-500">{employee.designation || 'Staff'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">৳{employee.baseSalary?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-green-100 text-green-700">{employee.presentDays}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-amber-100 text-amber-700">{employee.lateDays}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-red-100 text-red-700">{employee.absentDays}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        -৳{(employee.totalDeductions + (employee.additional_deduction || 0))?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        +৳{((employee.bonus || 0) + (employee.mercy_allowance || 0) + (employee.overtime_amount || 0))?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">৳{employee.netSalary?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        {employee.isGenerated ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />Generated
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600">
                            <Clock className="w-3 h-3 mr-1" />Pending
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setAdjustments({
                              bonus: employee.bonus || 0,
                              mercy: employee.mercy_allowance || 0,
                              deduction: employee.additional_deduction || 0,
                              overtime_hours: employee.overtime_hours || 0,
                              notes: employee.adjustment_notes || ''
                            });
                            setShowAdjustDialog(true);
                          }}
                          className="border-red-300 hover:bg-red-50"
                        >
                          <Calculator className="w-4 h-4 mr-1" />Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold">
                  <tr>
                    <td className="px-4 py-3" colSpan={7}>Total Payroll for {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}</td>
                    <td className="px-4 py-3 text-right text-green-700 text-lg">৳{totalPayroll.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle>Deduction Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Working Days/Month</Label>
                <Input
                  type="number"
                  value={deductionSettings.working_days}
                  onChange={(e) => setDeductionSettings({...deductionSettings, working_days: parseInt(e.target.value) || 26})}
                />
              </div>
              <div>
                <Label>Absent Deduction (per day)</Label>
                <Input
                  type="number"
                  value={deductionSettings.absent_deduction_per_day}
                  onChange={(e) => setDeductionSettings({...deductionSettings, absent_deduction_per_day: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Late Deduction (per day)</Label>
                <Input
                  type="number"
                  value={deductionSettings.late_deduction_per_day}
                  onChange={(e) => setDeductionSettings({...deductionSettings, late_deduction_per_day: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Overtime Rate (per hour)</Label>
                <Input
                  type="number"
                  value={deductionSettings.overtime_rate}
                  onChange={(e) => setDeductionSettings({...deductionSettings, overtime_rate: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adjustment Dialog */}
        <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-red-600" />
                Adjust Salary - {selectedEmployee?.full_name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedEmployee && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Salary</span>
                    <span className="font-semibold">৳{selectedEmployee.baseSalary?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Auto Deductions</span>
                    <span>-৳{selectedEmployee.totalDeductions?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Adjustments */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-green-600" />Bonus
                    </Label>
                    <Input
                      type="number"
                      value={adjustments.bonus}
                      onChange={(e) => setAdjustments({...adjustments, bonus: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />Mercy
                    </Label>
                    <Input
                      type="number"
                      value={adjustments.mercy}
                      onChange={(e) => setAdjustments({...adjustments, mercy: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-red-600" />Deduction
                    </Label>
                    <Input
                      type="number"
                      value={adjustments.deduction}
                      onChange={(e) => setAdjustments({...adjustments, deduction: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-600" />Overtime (hrs)
                    </Label>
                    <Input
                      type="number"
                      value={adjustments.overtime_hours}
                      onChange={(e) => setAdjustments({...adjustments, overtime_hours: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Adjustment Notes</Label>
                  <Textarea
                    value={adjustments.notes}
                    onChange={(e) => setAdjustments({...adjustments, notes: e.target.value})}
                    placeholder="Reason for adjustments..."
                    rows={2}
                  />
                </div>

                {/* Final Calculation */}
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-green-800">Final Net Salary</span>
                    <span className="text-2xl font-bold text-green-700">
                      ৳{(
                        selectedEmployee.baseSalary - 
                        selectedEmployee.totalDeductions + 
                        adjustments.bonus + 
                        adjustments.mercy - 
                        adjustments.deduction +
                        (adjustments.overtime_hours * deductionSettings.overtime_rate)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveAdjustment} disabled={isGenerating} className="bg-red-600">
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default withPermission(PayrollPage, 'finance', 'can_view');
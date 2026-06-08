import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Calculator, Save, Download, Calendar, CheckCircle, Loader2,
  Clock, AlertTriangle, ChevronLeft, ChevronRight, Search, DollarSign,
  Gift, Minus, Plus, CreditCard, Banknote, Eye, Edit, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { erp } from '@/api/erpClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { withPermission } from '@/components/common/PermissionGuard';

function PayrollPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showPaySlip, setShowPaySlip] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adjustments, setAdjustments] = useState({ bonus: 0, mercy: 0, deduction: 0, overtime_hours: 0, notes: '' });
  const [settings, setSettings] = useState({
    working_days: 26, absent_deduction_type: 'per_day', absent_deduction_per_day: 0,
    late_deduction_per_day: 0, overtime_rate: 100
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['payroll-employees'],
    queryFn: async () => {
      const all = await erp.entities.User.list();
      return all.filter(u => (u.base_salary || 0) > 0);
    },
    staleTime: 10 * 60 * 1000
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['payroll-attendance', selectedMonth],
    queryFn: async () => {
      const [y, m] = selectedMonth.split('-');
      const start = format(startOfMonth(new Date(y, m - 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(y, m - 1)), 'yyyy-MM-dd');
      const records = await erp.entities.Attendance.list('-date', 5000);
      return records.filter(r => r.date >= start && r.date <= end);
    }
  });

  const { data: existingPayroll = [], refetch: refetchPayroll } = useQuery({
    queryKey: ['payroll-records', selectedMonth],
    queryFn: () => erp.entities.PayrollRecord.filter({ month: selectedMonth })
  });

  // Calculate payroll for each employee
  const payrollData = useMemo(() => {
    return employees.map(emp => {
      const existing = existingPayroll.find(p => p.employee_id === emp.id);
      if (existing) return { ...emp, ...existing, baseSalary: existing.base_salary, isGenerated: true };

      const records = attendanceRecords.filter(a => a.employee_id === emp.id);
      const presentDays = records.filter(a => a.status === 'present').length;
      const lateDays = records.filter(a => a.status === 'late').length;
      const absentDays = records.filter(a => a.status === 'absent').length;
      const leaveDays = records.filter(a => a.status === 'on_leave').length;
      const totalHours = records.reduce((s, a) => s + (a.working_hours || 0), 0);
      const baseSalary = emp.base_salary || 0;

      // Calculate deductions
      let absentDeduction = 0;
      if (settings.absent_deduction_type === 'per_day') {
        absentDeduction = absentDays * settings.absent_deduction_per_day;
      } else {
        // Pro-rata: base_salary / working_days * absent_days
        absentDeduction = settings.working_days > 0 ? Math.round((baseSalary / settings.working_days) * absentDays) : 0;
      }
      const lateDeduction = lateDays * settings.late_deduction_per_day;
      const totalDeductions = absentDeduction + lateDeduction;
      const netSalary = Math.max(0, baseSalary - totalDeductions);

      return {
        ...emp, baseSalary, presentDays, present_days: presentDays, lateDays, late_days: lateDays,
        absentDays, absent_days: absentDays, leaveDays, totalHours, working_hours: totalHours,
        absentDeduction, absent_deduction: absentDeduction, lateDeduction, late_deduction: lateDeduction,
        totalDeductions, total_deductions: totalDeductions, bonus: 0, mercy_allowance: 0,
        additional_deduction: 0, overtime_hours: 0, overtime_amount: 0, netSalary, net_salary: netSalary,
        isGenerated: false, payment_status: 'pending'
      };
    }).filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.full_name?.toLowerCase().includes(q) && !e.designation?.toLowerCase().includes(q)) return false;
      }
      if (statusFilter === 'generated') return e.isGenerated;
      if (statusFilter === 'pending') return !e.isGenerated;
      if (statusFilter === 'paid') return e.payment_status === 'paid';
      return true;
    });
  }, [employees, attendanceRecords, existingPayroll, settings, searchQuery, statusFilter]);

  const totals = useMemo(() => ({
    employees: payrollData.length,
    baseSalary: payrollData.reduce((s, e) => s + (e.baseSalary || 0), 0),
    deductions: payrollData.reduce((s, e) => s + (e.totalDeductions || e.total_deductions || 0) + (e.additional_deduction || 0), 0),
    bonuses: payrollData.reduce((s, e) => s + (e.bonus || 0) + (e.mercy_allowance || 0) + (e.overtime_amount || 0), 0),
    netPayroll: payrollData.reduce((s, e) => s + (e.netSalary || e.net_salary || 0), 0),
    generated: payrollData.filter(e => e.isGenerated).length,
    paid: payrollData.filter(e => e.payment_status === 'paid').length,
  }), [payrollData]);

  const changeMonth = (dir) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    setSelectedMonth(format(new Date(y, m - 1 + dir), 'yyyy-MM'));
  };

  // Generate payroll for all
  const handleGenerate = async () => {
    const pending = payrollData.filter(e => !e.isGenerated);
    if (!pending.length) { toast.info('All payroll already generated'); return; }
    if (!confirm(`Generate payroll for ${pending.length} employees?`)) return;
    setIsGenerating(true);
    const me = await erp.auth.me();
    let ok = 0;
    for (const emp of pending) {
      await erp.entities.PayrollRecord.create({
        employee_id: emp.id, employee_name: emp.full_name, month: selectedMonth,
        base_salary: emp.baseSalary, present_days: emp.presentDays, late_days: emp.lateDays,
        absent_days: emp.absentDays, working_hours: emp.totalHours,
        absent_deduction: emp.absentDeduction, late_deduction: emp.lateDeduction,
        bonus: 0, mercy_allowance: 0, additional_deduction: 0, overtime_hours: 0, overtime_amount: 0,
        total_deductions: emp.totalDeductions, net_salary: emp.netSalary,
        payment_status: 'pending', generated_by_id: me.id, generated_by_name: me.full_name
      });
      ok++;
    }
    refetchPayroll(); toast.success(`${ok} payroll records generated!`); setIsGenerating(false);
  };

  // Save individual adjustments
  const handleSaveAdjust = async () => {
    if (!selectedEmployee) return;
    setIsSaving(true);
    const me = await erp.auth.me();
    const ot = adjustments.overtime_hours * settings.overtime_rate;
    const baseDed = (selectedEmployee.absentDeduction || selectedEmployee.absent_deduction || 0) + (selectedEmployee.lateDeduction || selectedEmployee.late_deduction || 0);
    const finalNet = Math.max(0, (selectedEmployee.baseSalary || selectedEmployee.base_salary || 0) - baseDed + adjustments.bonus + adjustments.mercy - adjustments.deduction + ot);

    const existing = existingPayroll.find(p => p.employee_id === selectedEmployee.id);
    const data = {
      bonus: adjustments.bonus, mercy_allowance: adjustments.mercy,
      additional_deduction: adjustments.deduction, overtime_hours: adjustments.overtime_hours,
      overtime_amount: ot, total_deductions: baseDed + adjustments.deduction,
      net_salary: finalNet, adjustment_notes: adjustments.notes
    };

    if (existing) {
      await erp.entities.PayrollRecord.update(existing.id, data);
    } else {
      await erp.entities.PayrollRecord.create({
        employee_id: selectedEmployee.id, employee_name: selectedEmployee.full_name, month: selectedMonth,
        base_salary: selectedEmployee.baseSalary || selectedEmployee.base_salary,
        present_days: selectedEmployee.presentDays || selectedEmployee.present_days || 0,
        late_days: selectedEmployee.lateDays || selectedEmployee.late_days || 0,
        absent_days: selectedEmployee.absentDays || selectedEmployee.absent_days || 0,
        working_hours: selectedEmployee.totalHours || selectedEmployee.working_hours || 0,
        absent_deduction: selectedEmployee.absentDeduction || selectedEmployee.absent_deduction || 0,
        late_deduction: selectedEmployee.lateDeduction || selectedEmployee.late_deduction || 0,
        ...data, payment_status: 'pending', generated_by_id: me.id, generated_by_name: me.full_name
      });
    }
    refetchPayroll(); toast.success(`Salary adjusted: ৳${finalNet.toLocaleString('en-IN')}`);
    setShowAdjustDialog(false); setIsSaving(false);
  };

  // Mark as paid
  const handleMarkPaid = async (emp) => {
    const existing = existingPayroll.find(p => p.employee_id === emp.id);
    if (!existing) { toast.error('Generate payroll first'); return; }
    await erp.entities.PayrollRecord.update(existing.id, {
      payment_status: 'paid', payment_date: format(new Date(), 'yyyy-MM-dd')
    });
    refetchPayroll(); toast.success(`${emp.full_name} marked as paid`);
  };

  // Export
  const handleExport = () => {
    const rows = payrollData.map(e => ({
      Employee: e.full_name, Designation: e.designation || '', 'Base Salary': e.baseSalary || e.base_salary,
      Present: e.presentDays || e.present_days, Late: e.lateDays || e.late_days, Absent: e.absentDays || e.absent_days,
      'Absent Ded.': e.absentDeduction || e.absent_deduction, 'Late Ded.': e.lateDeduction || e.late_deduction,
      'Extra Ded.': e.additional_deduction || 0, Bonus: e.bonus || 0, Mercy: e.mercy_allowance || 0,
      Overtime: e.overtime_amount || 0, 'Net Salary': e.netSalary || e.net_salary, Status: e.payment_status || 'pending'
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h]}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `Payroll_${selectedMonth}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

  const openAdjust = (emp) => {
    setSelectedEmployee(emp);
    setAdjustments({
      bonus: emp.bonus || 0, mercy: emp.mercy_allowance || 0,
      deduction: emp.additional_deduction || 0, overtime_hours: emp.overtime_hours || 0,
      notes: emp.adjustment_notes || ''
    });
    setShowAdjustDialog(true);
  };

  // Live net salary calculation in adjust dialog
  const liveNetSalary = selectedEmployee ? Math.max(0,
    (selectedEmployee.baseSalary || selectedEmployee.base_salary || 0)
    - (selectedEmployee.absentDeduction || selectedEmployee.absent_deduction || 0)
    - (selectedEmployee.lateDeduction || selectedEmployee.late_deduction || 0)
    + adjustments.bonus + adjustments.mercy - adjustments.deduction
    + (adjustments.overtime_hours * settings.overtime_rate)
  ) : 0;

  const monthLabel = format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy');

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm text-slate-500"><span>Finance</span><span>/</span><span className="text-slate-900 font-medium">Payroll</span></div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Payroll Management</h1>
              <p className="text-sm text-slate-500">Calculate & manage employee salaries</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center border rounded-lg overflow-hidden bg-white">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-40 h-10 border-0 rounded-none text-sm text-center" />
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <Button variant="outline" size="sm" className="h-10" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-red-600 hover:bg-red-700 h-10" size="sm">
              {isGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Calculator className="w-4 h-4 mr-1" />}
              Generate Payroll
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Employees', value: totals.employees, color: 'text-slate-700', bg: 'bg-slate-50', icon: Users },
            { label: 'Gross Salary', value: `৳${totals.baseSalary.toLocaleString('en-IN')}`, color: 'text-blue-600', bg: 'bg-blue-50', icon: Banknote },
            { label: 'Deductions', value: `-৳${totals.deductions.toLocaleString('en-IN')}`, color: 'text-red-600', bg: 'bg-red-50', icon: Minus },
            { label: 'Bonuses/OT', value: `+৳${totals.bonuses.toLocaleString('en-IN')}`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Gift },
            { label: 'Net Payroll', value: `৳${totals.netPayroll.toLocaleString('en-IN')}`, color: 'text-green-700', bg: 'bg-green-50', icon: DollarSign },
          ].map((s, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                <div><p className={`text-lg font-bold ${s.color}`}>{s.value}</p><p className="text-[10px] text-slate-400 uppercase">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="payroll">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="payroll" className="text-sm">Payroll Sheet</TabsTrigger>
            <TabsTrigger value="settings" className="text-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="payroll" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search employee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({payrollData.length})</SelectItem>
                  <SelectItem value="pending">Pending ({payrollData.filter(e => !e.isGenerated).length})</SelectItem>
                  <SelectItem value="generated">Generated ({totals.generated})</SelectItem>
                  <SelectItem value="paid">Paid ({totals.paid})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payroll Table */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Employee</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-slate-500">Base</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-slate-500">P</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-slate-500">L</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-slate-500">A</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-slate-500">Deductions</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-slate-500">Bonus/OT</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 bg-green-50">Net Salary</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-slate-500">Status</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollData.map(emp => {
                        const base = emp.baseSalary || emp.base_salary || 0;
                        const ded = (emp.totalDeductions || emp.total_deductions || 0) + (emp.additional_deduction || 0);
                        const bon = (emp.bonus || 0) + (emp.mercy_allowance || 0) + (emp.overtime_amount || 0);
                        const net = emp.netSalary || emp.net_salary || 0;
                        const pDays = emp.presentDays ?? emp.present_days ?? 0;
                        const lDays = emp.lateDays ?? emp.late_days ?? 0;
                        const aDays = emp.absentDays ?? emp.absent_days ?? 0;

                        return (
                          <tr key={emp.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${emp.isGenerated ? '' : 'bg-amber-50/20'}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={emp.profile_picture_url} />
                                  <AvatarFallback className="bg-red-100 text-red-700 text-xs">{emp.full_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-slate-900 text-sm">{emp.full_name}</p>
                                  <p className="text-xs text-slate-400">{emp.designation || emp.department || ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-medium">৳{base.toLocaleString('en-IN')}</td>
                            <td className="px-2 py-3 text-center"><span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{pDays}</span></td>
                            <td className="px-2 py-3 text-center"><span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{lDays}</span></td>
                            <td className="px-2 py-3 text-center"><span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{aDays}</span></td>
                            <td className="px-3 py-3 text-right text-red-600 font-medium text-xs">{ded > 0 ? `-৳${ded.toLocaleString('en-IN')}` : '—'}</td>
                            <td className="px-3 py-3 text-right text-emerald-600 font-medium text-xs">{bon > 0 ? `+৳${bon.toLocaleString('en-IN')}` : '—'}</td>
                            <td className="px-3 py-3 text-right font-bold text-green-700 bg-green-50/30">৳{net.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-3 text-center">
                              {emp.payment_status === 'paid' ? (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">Paid</Badge>
                              ) : emp.isGenerated ? (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">Generated</Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500 text-xs">Pending</Badge>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openAdjust(emp)} title="Edit salary">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                {emp.isGenerated && emp.payment_status !== 'paid' && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-600" onClick={() => handleMarkPaid(emp)} title="Mark paid">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {emp.isGenerated && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowPaySlip(emp)} title="View payslip">
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                      <tr>
                        <td className="px-4 py-3" colSpan={5}>Total — {monthLabel}</td>
                        <td className="px-3 py-3 text-right text-red-600">-৳{totals.deductions.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3 text-right text-emerald-600">+৳{totals.bonuses.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3 text-right text-green-700 text-base bg-green-50/30">৳{totals.netPayroll.toLocaleString('en-IN')}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Deduction & Calculation Settings</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <Label className="text-xs text-slate-500">Working Days / Month</Label>
                    <Input type="number" value={settings.working_days} onChange={(e) => setSettings({ ...settings, working_days: parseInt(e.target.value) || 26 })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Absent Deduction Type</Label>
                    <Select value={settings.absent_deduction_type} onValueChange={(v) => setSettings({ ...settings, absent_deduction_type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_day">Fixed Per Day</SelectItem>
                        <SelectItem value="pro_rata">Pro-rata (Salary ÷ Days)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {settings.absent_deduction_type === 'pro_rata' ? 'Base Salary ÷ Working Days × Absent Days' : 'Fixed amount per absent day'}
                    </p>
                  </div>
                  {settings.absent_deduction_type === 'per_day' && (
                    <div>
                      <Label className="text-xs text-slate-500">Absent Deduction (per day ৳)</Label>
                      <Input type="number" value={settings.absent_deduction_per_day} onChange={(e) => setSettings({ ...settings, absent_deduction_per_day: parseFloat(e.target.value) || 0 })} className="mt-1" />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500">Late Deduction (per day ৳)</Label>
                    <Input type="number" value={settings.late_deduction_per_day} onChange={(e) => setSettings({ ...settings, late_deduction_per_day: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Overtime Rate (per hour ৳)</Label>
                    <Input type="number" value={settings.overtime_rate} onChange={(e) => setSettings({ ...settings, overtime_rate: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 p-3 bg-amber-50 rounded-lg">⚠️ Settings are applied when calculating. After changing, payroll will auto-recalculate for non-generated employees.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ADJUST DIALOG */}
        <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-red-600" /> Adjust Salary</DialogTitle></DialogHeader>
            {selectedEmployee && (
              <div className="space-y-4">
                {/* Employee info */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedEmployee.profile_picture_url} />
                    <AvatarFallback className="bg-red-100 text-red-700">{selectedEmployee.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedEmployee.full_name}</p>
                    <p className="text-xs text-slate-400">{selectedEmployee.designation || ''}</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Base Salary</span><span className="font-semibold">৳{(selectedEmployee.baseSalary || selectedEmployee.base_salary || 0).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-red-600"><span>Absent Deduction ({selectedEmployee.absentDays ?? selectedEmployee.absent_days ?? 0} days)</span><span>-৳{(selectedEmployee.absentDeduction || selectedEmployee.absent_deduction || 0).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-red-600"><span>Late Deduction ({selectedEmployee.lateDays ?? selectedEmployee.late_days ?? 0} days)</span><span>-৳{(selectedEmployee.lateDeduction || selectedEmployee.late_deduction || 0).toLocaleString('en-IN')}</span></div>
                  <hr className="border-slate-200" />
                </div>

                {/* Manual adjustments */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Gift className="w-3 h-3 text-emerald-500" /> Bonus (৳)</Label>
                    <Input type="number" value={adjustments.bonus} onChange={(e) => setAdjustments({ ...adjustments, bonus: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Plus className="w-3 h-3 text-blue-500" /> Mercy (৳)</Label>
                    <Input type="number" value={adjustments.mercy} onChange={(e) => setAdjustments({ ...adjustments, mercy: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Minus className="w-3 h-3 text-red-500" /> Extra Deduction (৳)</Label>
                    <Input type="number" value={adjustments.deduction} onChange={(e) => setAdjustments({ ...adjustments, deduction: parseFloat(e.target.value) || 0 })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3 text-purple-500" /> Overtime (hrs)</Label>
                    <Input type="number" value={adjustments.overtime_hours} onChange={(e) => setAdjustments({ ...adjustments, overtime_hours: parseFloat(e.target.value) || 0 })} className="mt-1" />
                    {adjustments.overtime_hours > 0 && <p className="text-[10px] text-slate-400 mt-0.5">= ৳{(adjustments.overtime_hours * settings.overtime_rate).toLocaleString('en-IN')}</p>}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={adjustments.notes} onChange={(e) => setAdjustments({ ...adjustments, notes: e.target.value })} rows={2} placeholder="Reason..." className="mt-1" />
                </div>

                {/* Live total */}
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl flex justify-between items-center">
                  <span className="font-semibold text-green-800">Net Salary</span>
                  <span className="text-2xl font-bold text-green-700">৳{liveNetSalary.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>Cancel</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveAdjust} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* PAY SLIP DIALOG */}
        <Dialog open={!!showPaySlip} onOpenChange={() => setShowPaySlip(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Pay Slip — {monthLabel}</DialogTitle></DialogHeader>
            {showPaySlip && (
              <div className="space-y-4" id="payslip-content">
                <div className="text-center border-b pb-3">
                  <p className="text-lg font-bold">Prodhan.com</p>
                  <p className="text-xs text-slate-400">Employee Salary Statement</p>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-red-100 text-red-700">{showPaySlip.full_name?.charAt(0)}</AvatarFallback></Avatar>
                  <div><p className="font-semibold">{showPaySlip.full_name}</p><p className="text-xs text-slate-400">{showPaySlip.designation || ''} • {monthLabel}</p></div>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    ['Base Salary', `৳${(showPaySlip.baseSalary || showPaySlip.base_salary || 0).toLocaleString('en-IN')}`, ''],
                    ['Present Days', showPaySlip.presentDays ?? showPaySlip.present_days ?? 0, 'text-emerald-600'],
                    ['Late Days', showPaySlip.lateDays ?? showPaySlip.late_days ?? 0, 'text-amber-600'],
                    ['Absent Days', showPaySlip.absentDays ?? showPaySlip.absent_days ?? 0, 'text-red-600'],
                    ['Absent Deduction', `-৳${(showPaySlip.absentDeduction || showPaySlip.absent_deduction || 0).toLocaleString('en-IN')}`, 'text-red-600'],
                    ['Late Deduction', `-৳${(showPaySlip.lateDeduction || showPaySlip.late_deduction || 0).toLocaleString('en-IN')}`, 'text-red-600'],
                    ['Extra Deduction', `-৳${(showPaySlip.additional_deduction || 0).toLocaleString('en-IN')}`, 'text-red-600'],
                    ['Bonus', `+৳${(showPaySlip.bonus || 0).toLocaleString('en-IN')}`, 'text-emerald-600'],
                    ['Mercy Allowance', `+৳${(showPaySlip.mercy_allowance || 0).toLocaleString('en-IN')}`, 'text-emerald-600'],
                    ['Overtime', `+৳${(showPaySlip.overtime_amount || 0).toLocaleString('en-IN')}`, 'text-emerald-600'],
                  ].map(([label, val, cls], i) => (
                    <div key={i} className="flex justify-between"><span className="text-slate-500">{label}</span><span className={`font-medium ${cls}`}>{val}</span></div>
                  ))}
                  <hr />
                  <div className="flex justify-between text-base">
                    <span className="font-bold text-green-800">Net Salary</span>
                    <span className="font-bold text-green-700 text-lg">৳{(showPaySlip.netSalary || showPaySlip.net_salary || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-400 pt-2 border-t">
                  <span>Generated: {showPaySlip.generated_by_name || 'System'}</span>
                  <span>Status: {showPaySlip.payment_status}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default withPermission(PayrollPage, 'payroll', 'can_view');
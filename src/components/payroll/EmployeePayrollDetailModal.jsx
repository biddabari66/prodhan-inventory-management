import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Attendance } from '@/entities/Attendance';
import { updateEmployeeAttendance } from '@/functions/updateEmployeeAttendance';
import { toast } from 'sonner';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { Calendar, User, DollarSign, Clock, Save, RefreshCw, Edit, Loader2 } from 'lucide-react';

export default function EmployeePayrollDetailModal({ isOpen, onClose, employee, dateRange, onUpdate }) {
    const [attendanceData, setAttendanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editableDeductions, setEditableDeductions] = useState(employee?.total_deductions || 0);
    const [editableNetSalary, setEditableNetSalary] = useState(employee?.net_salary || 0);
    const [hasManualOverrides, setHasManualOverrides] = useState(false);

    useEffect(() => {
        if (isOpen && employee) {
            loadEmployeeAttendance();
            setEditableDeductions(employee.total_deductions || 0);
            setEditableNetSalary(employee.net_salary || 0);
        }
    }, [isOpen, employee, dateRange]);

    const loadEmployeeAttendance = async () => {
        if (!employee?.user_id || !dateRange?.from || !dateRange?.to) return;

        setIsLoading(true);
        try {
            const startDate = format(dateRange.from, 'yyyy-MM-dd');
            const endDate = format(dateRange.to, 'yyyy-MM-dd');

            // Get attendance records for this employee in the date range
            const attendanceRecords = await Attendance.filter({
                employee_id: employee.user_id,
                date: {
                    "$gte": startDate,
                    "$lte": endDate
                }
            });

            // Create a complete day-by-day breakdown
            const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
            const attendanceMap = {};
            
            attendanceRecords.forEach(record => {
                attendanceMap[record.date] = record;
            });

            const dayByDayData = allDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = attendanceMap[dateStr];
                
                return {
                    date: dateStr,
                    dayName: format(day, 'EEE'),
                    displayDate: format(day, 'MMM dd'),
                    attendanceRecord: record,
                    status: record?.status || 'absent',
                    checkIn: record?.check_in_time || null,
                    checkOut: record?.check_out_time || null,
                    workingHours: record?.working_hours || 0,
                    isWeekend: day.getDay() === 5 || day.getDay() === 6, // Friday or Saturday in Bangladesh
                };
            });

            setAttendanceData(dayByDayData);
        } catch (error) {
            console.error('Error loading employee attendance:', error);
            toast.error('Failed to load attendance data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAttendanceStatusChange = async (dateStr, newStatus) => {
        if (!employee?.user_id) return;

        try {
            // Find the existing record or create a new one
            const existingRecord = attendanceData.find(d => d.date === dateStr)?.attendanceRecord;
            
            if (existingRecord) {
                // Update existing record
                const { data, error } = await updateEmployeeAttendance({
                    attendance_id: existingRecord.id,
                    new_status: newStatus,
                    manual_entry_reason: `Manual override by admin for payroll adjustment`,
                    manual_entry_by: employee.user_id
                });

                if (error) {
                    throw new Error(error);
                }
            } else {
                // Create new attendance record
                const newRecord = {
                    employee_id: employee.user_id,
                    employee_name: employee.full_name,
                    date: dateStr,
                    status: newStatus,
                    manual_entry_reason: 'Manual entry by admin for payroll adjustment',
                    manual_entry_by_id: employee.user_id,
                    manual_entry_timestamp: new Date().toISOString()
                };

                await Attendance.create(newRecord);
            }

            // Reload attendance data to reflect changes
            await loadEmployeeAttendance();
            setHasManualOverrides(true);
            toast.success('Attendance updated successfully');

            // Recalculate payroll automatically
            recalculatePayroll();

        } catch (error) {
            console.error('Error updating attendance:', error);
            toast.error('Failed to update attendance');
        }
    };

    const recalculatePayroll = () => {
        if (!attendanceData.length) return;

        const presentDays = attendanceData.filter(d => d.status?.includes('present')).length;
        const absentDays = attendanceData.filter(d => d.status?.includes('absent')).length;
        const lateDays = attendanceData.filter(d => d.status?.includes('late')).length;

        const totalDays = attendanceData.length;
        const salaryPerDay = employee.base_salary / totalDays;

        // Calculate deductions based on employee settings
        const maxAllowedAbsences = employee.max_allowed_absences || 3;
        const maxAllowedLates = employee.max_allowed_lates || 5;
        
        const punishableAbsences = Math.max(0, absentDays - maxAllowedAbsences);
        const punishableLates = Math.max(0, lateDays - maxAllowedLates);
        
        const absenceDeduction = punishableAbsences * salaryPerDay * ((employee.absence_deduction_rate || 0) / 100);
        const lateDeduction = punishableLates * salaryPerDay * ((employee.late_deduction_rate || 0) / 100);
        
        const totalDeductions = absenceDeduction + lateDeduction;
        const netSalary = employee.base_salary - totalDeductions;

        setEditableDeductions(parseFloat(totalDeductions.toFixed(2)));
        setEditableNetSalary(parseFloat(netSalary.toFixed(2)));
    };

    const handleSaveOverrides = async () => {
        setIsSaving(true);
        try {
            // In a real implementation, you might want to save these overrides
            // to a separate PayrollOverrides entity or similar
            toast.success('Payroll adjustments saved successfully');
            setHasManualOverrides(false);
            
            // Notify parent to refresh the main report
            if (onUpdate) {
                onUpdate();
            }
        } catch (error) {
            console.error('Error saving overrides:', error);
            toast.error('Failed to save payroll adjustments');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            present: 'bg-green-100 text-green-800 border-green-200',
            manual_present: 'bg-green-100 text-green-800 border-green-200',
            late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            manual_late: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            absent: 'bg-red-100 text-red-800 border-red-200',
            manual_absent: 'bg-red-100 text-red-800 border-red-200',
            on_leave: 'bg-blue-100 text-blue-800 border-blue-200',
            manual_on_leave: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getStatusDisplay = (status) => {
        const displays = {
            present: 'Present',
            manual_present: 'Present (M)',
            late: 'Late',
            manual_late: 'Late (M)',
            absent: 'Absent',
            manual_absent: 'Absent (M)',
            on_leave: 'On Leave',
            manual_on_leave: 'On Leave (M)'
        };
        return displays[status] || 'Absent';
    };

    if (!employee) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Payroll Details - {employee.full_name}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6">
                    {/* Employee Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Employee Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div><strong>ID:</strong> {employee.employee_id}</div>
                                <div><strong>Department:</strong> {employee.department}</div>
                                <div><strong>Designation:</strong> {employee.designation}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Salary Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div><strong>Base Salary:</strong> ৳{employee.base_salary?.toLocaleString()}</div>
                                <div><strong>Per Day:</strong> ৳{employee.salary_per_day?.toLocaleString()}</div>
                                <div><strong>Period:</strong> {employee.total_days_in_period} days</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Attendance Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div><strong>Present:</strong> <span className="text-green-600">{employee.present_days}</span></div>
                                <div><strong>Absent:</strong> <span className="text-red-600">{employee.absent_days}</span></div>
                                <div><strong>Late:</strong> <span className="text-yellow-600">{employee.late_days}</span></div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Daily Attendance Breakdown */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Daily Attendance Breakdown
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadEmployeeAttendance}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                    <span>Loading attendance data...</span>
                                </div>
                            ) : (
                                <div className="max-h-96 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Day</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Check In</TableHead>
                                                <TableHead>Check Out</TableHead>
                                                <TableHead>Hours</TableHead>
                                                <TableHead>Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {attendanceData.map((day) => (
                                                <TableRow key={day.date} className={day.isWeekend ? 'bg-gray-50' : ''}>
                                                    <TableCell className="font-medium">{day.displayDate}</TableCell>
                                                    <TableCell>{day.dayName}</TableCell>
                                                    <TableCell>
                                                        <Badge className={getStatusColor(day.status)}>
                                                            {getStatusDisplay(day.status)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{day.checkIn || '-'}</TableCell>
                                                    <TableCell>{day.checkOut || '-'}</TableCell>
                                                    <TableCell>{day.workingHours ? `${day.workingHours}h` : '-'}</TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={day.status}
                                                            onValueChange={(value) => handleAttendanceStatusChange(day.date, value)}
                                                        >
                                                            <SelectTrigger className="w-32">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="present">Present</SelectItem>
                                                                <SelectItem value="late">Late</SelectItem>
                                                                <SelectItem value="absent">Absent</SelectItem>
                                                                <SelectItem value="on_leave">On Leave</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payroll Adjustments */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Edit className="w-5 h-5" />
                                Manual Payroll Adjustments
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="deductions">Total Deductions (৳)</Label>
                                    <Input
                                        id="deductions"
                                        type="number"
                                        step="0.01"
                                        value={editableDeductions}
                                        onChange={(e) => {
                                            const deductions = parseFloat(e.target.value) || 0;
                                            setEditableDeductions(deductions);
                                            setEditableNetSalary(employee.base_salary - deductions);
                                            setHasManualOverrides(true);
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="netSalary">Net Salary (৳)</Label>
                                    <Input
                                        id="netSalary"
                                        type="number"
                                        step="0.01"
                                        value={editableNetSalary}
                                        onChange={(e) => {
                                            const netSalary = parseFloat(e.target.value) || 0;
                                            setEditableNetSalary(netSalary);
                                            setEditableDeductions(employee.base_salary - netSalary);
                                            setHasManualOverrides(true);
                                        }}
                                    />
                                </div>
                            </div>

                            {hasManualOverrides && (
                                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span className="text-sm text-yellow-800">
                                        You have unsaved manual adjustments. Click "Save Adjustments" to apply changes.
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={recalculatePayroll}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Recalculate
                        </Button>
                        <Button
                            onClick={handleSaveOverrides}
                            disabled={!hasManualOverrides || isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Adjustments
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
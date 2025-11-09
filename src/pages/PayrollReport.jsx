
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { calculateMonthlyPayroll } from '@/functions/calculateMonthlyPayroll';
import { toast } from 'sonner';
import { Loader2, Calculator, FileDown, ShieldAlert, Calendar as CalendarIcon, Eye, Edit } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import EmployeePayrollDetailModal from '../components/payroll/EmployeePayrollDetailModal';

function downloadCSV(data, startDate, endDate) {
    if (!data || data.length === 0) {
        toast.error("No data to export.");
        return;
    }
    const headers = [
        "Employee ID", "Full Name", "Department", "Designation",
        "Base Salary (BDT)", "Present Days", "Absent Days", "Late Days",
        "Total Deductions (BDT)", "Net Salary (BDT)"
    ];
    const rows = data.map(emp => [
        emp.employee_id,
        emp.full_name,
        emp.department,
        emp.designation,
        emp.has_salary_data ? emp.base_salary : 'N/A', // Handle N/A for CSV export
        emp.present_days,
        emp.absent_days,
        emp.late_days,
        emp.has_salary_data ? emp.total_deductions : 'N/A', // Handle N/A for CSV export
        emp.has_salary_data ? emp.net_salary : 'N/A' // Handle N/A for CSV export
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report downloaded successfully!");
}

export default function PayrollReport() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [dateRange, setDateRange] = useState({
        from: subDays(new Date(), 29), // Default to last 30 days
        to: new Date()
    });
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await User.me();
                setCurrentUser(user);
            } catch (error) {
                console.error("Failed to fetch user", error);
            }
        };
        fetchUser();
    }, []);

    const handleGenerateReport = async () => {
        if (!dateRange.from || !dateRange.to) {
            toast.error("Please select both start and end dates.");
            return;
        }

        if (dateRange.from > dateRange.to) {
            toast.error("Start date must be before end date.");
            return;
        }

        setIsLoading(true);
        setReportData([]);

        try {
            const startDate = format(dateRange.from, 'yyyy-MM-dd');
            const endDate = format(dateRange.to, 'yyyy-MM-dd');

            const { data, error } = await calculateMonthlyPayroll({
                start_date: startDate,
                end_date: endDate
            });

            if (error) {
                throw new Error(error);
            }

            setReportData(data);
            const totalDays = Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)) + 1;
            toast.success(`Payroll report generated for ${totalDays} days (${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')})`);
        } catch (err) {
            toast.error(`Failed to generate report: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewEmployeeDetails = (employee) => {
        setSelectedEmployee(employee);
        setIsDetailModalOpen(true);
    };

    const handleEmployeeUpdate = () => {
        // Refresh the main report after employee update
        handleGenerateReport();
    };

    const hasPermission = currentUser && ['admin', 'manager', 'department_head'].includes(currentUser.job_role);

    if (!currentUser) {
        return <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!hasPermission) {
        return (
            <div className="p-6 flex justify-center items-center h-full">
                <Card className="w-full max-w-md text-center premium-card">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-red-500">
                            <ShieldAlert className="w-6 h-6"/> Access Denied
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You do not have the necessary permissions to view this page. Please contact your administrator.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-6 h-6 text-violet-500" />
                        Advanced Payroll Generator
                    </CardTitle>
                    <CardDescription>
                        Generate flexible payroll reports for any date range with detailed employee management capabilities.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4">
                        {/* Date Range Selector */}
                        <div className="space-y-2">
                            <Label>Report Period</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange.from && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Quick Date Presets */}
                        <div className="space-y-2">
                            <Label>Quick Presets</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDateRange({
                                        from: subDays(new Date(), 29),
                                        to: new Date()
                                    })}
                                >
                                    Last 30 Days
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const now = new Date();
                                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                                        setDateRange({ from: firstDay, to: now });
                                    }}
                                >
                                    This Month
                                </Button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <Button onClick={handleGenerateReport} disabled={isLoading} className="flex-1">
                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Generate Report
                            </Button>
                            {reportData.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => downloadCSV(reportData, format(dateRange.from, 'yyyy-MM-dd'), format(dateRange.to, 'yyyy-MM-dd'))}
                                >
                                    <FileDown className="w-4 h-4 mr-2"/>
                                    Export CSV
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {reportData.length > 0 && (
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle>
                            Payroll Report ({format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')})
                        </CardTitle>
                        <CardDescription>
                            Found {reportData.length} active employees ({reportData.filter(emp => emp.has_salary_data).length} with salary information, {reportData.filter(emp => !emp.has_salary_data).length} without salary data).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead className="text-right">Base Salary</TableHead>
                                        <TableHead className="text-center">Present</TableHead>
                                        <TableHead className="text-center">Absent</TableHead>
                                        <TableHead className="text-center">Late</TableHead>
                                        <TableHead className="text-right text-red-500">Deductions</TableHead>
                                        <TableHead className="text-right font-bold">Net Salary</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.map((emp) => (
                                        <TableRow key={emp.employee_id} className={!emp.has_salary_data ? 'bg-yellow-50' : ''}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {emp.full_name}
                                                    {!emp.has_salary_data && (
                                                        <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">No Salary Data</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">{emp.employee_id} - {emp.designation}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {emp.has_salary_data ? `৳${emp.base_salary?.toLocaleString()}` : (
                                                    <span className="text-red-500 text-sm">Not Set</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-green-600">{emp.present_days}</TableCell>
                                            <TableCell className="text-center text-orange-600">{emp.absent_days}</TableCell>
                                            <TableCell className="text-center text-yellow-600">{emp.late_days}</TableCell>
                                            <TableCell className="text-right text-red-600">
                                                {emp.has_salary_data ? `৳${emp.total_deductions?.toLocaleString()}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {emp.has_salary_data ? `৳${emp.net_salary?.toLocaleString()}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewEmployeeDetails(emp)}
                                                    className="text-blue-600 hover:text-blue-700"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isLoading && (
                 <div className="p-6 flex justify-center items-center h-64">
                    <div className="text-center space-y-2">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-violet-500" />
                        <p className="text-muted-foreground">Calculating payroll... This may take a moment.</p>
                    </div>
                </div>
            )}

            {/* Employee Detail Modal */}
            {selectedEmployee && (
                <EmployeePayrollDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedEmployee(null);
                    }}
                    employee={selectedEmployee}
                    dateRange={dateRange}
                    onUpdate={handleEmployeeUpdate}
                />
            )}
        </div>
    );
}

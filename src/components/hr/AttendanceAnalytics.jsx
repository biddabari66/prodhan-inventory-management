import React, { useState, useEffect, useMemo } from 'react';
import { Attendance } from '@/entities/Attendance';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserCheck, UserX, Clock, AlertTriangle, Download, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6366F1'];

export default function AttendanceAnalytics() {
    const [attendanceData, setAttendanceData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('current_month');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [selectedPeriod]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [attendance, employeeList] = await Promise.all([
                Attendance.list('-date', 500),
                User.list()
            ]);
            setAttendanceData(attendance);
            setEmployees(employeeList);
        } catch (error) {
            console.error('Failed to load attendance data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const analytics = useMemo(() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        
        const filteredData = attendanceData.filter(att => {
            const attDate = new Date(att.date);
            return attDate >= monthStart && attDate <= monthEnd;
        });

        const totalRecords = filteredData.length;
        const presentCount = filteredData.filter(a => a.status === 'present').length;
        const absentCount = filteredData.filter(a => a.status === 'absent').length;
        const lateCount = filteredData.filter(a => a.status === 'late').length;
        const onLeaveCount = filteredData.filter(a => a.status === 'on_leave').length;

        const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords * 100).toFixed(1) : 0;

        // Department-wise analysis
        const deptAnalysis = employees.reduce((acc, emp) => {
            const empAttendance = filteredData.filter(a => a.employee_id === emp.id);
            const deptPresent = empAttendance.filter(a => a.status === 'present').length;
            const deptTotal = empAttendance.length;
            
            if (!acc[emp.department]) {
                acc[emp.department] = { present: 0, total: 0, rate: 0 };
            }
            acc[emp.department].present += deptPresent;
            acc[emp.department].total += deptTotal;
            acc[emp.department].rate = acc[emp.department].total > 0 
                ? (acc[emp.department].present / acc[emp.department].total * 100).toFixed(1) 
                : 0;
            return acc;
        }, {});

        // Daily attendance trend
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const dailyTrend = days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayData = filteredData.filter(a => a.date === dayStr);
            return {
                date: format(day, 'MMM dd'),
                present: dayData.filter(a => a.status === 'present').length,
                absent: dayData.filter(a => a.status === 'absent').length,
                late: dayData.filter(a => a.status === 'late').length
            };
        });

        // Employee-wise summary
        const employeeSummary = employees.map(emp => {
            const empAttendance = filteredData.filter(a => a.employee_id === emp.id);
            const present = empAttendance.filter(a => a.status === 'present').length;
            const late = empAttendance.filter(a => a.status === 'late').length;
            const absent = empAttendance.filter(a => a.status === 'absent').length;
            const total = empAttendance.length;
            
            return {
                ...emp,
                present,
                late,
                absent,
                total,
                rate: total > 0 ? (present / total * 100).toFixed(1) : 0
            };
        }).sort((a, b) => b.rate - a.rate);

        return {
            totalRecords,
            presentCount,
            absentCount,
            lateCount,
            onLeaveCount,
            attendanceRate,
            deptAnalysis: Object.entries(deptAnalysis).map(([dept, data]) => ({ department: dept, ...data })),
            dailyTrend,
            employeeSummary,
            statusDistribution: [
                { name: 'Present', value: presentCount, color: '#10B981' },
                { name: 'Absent', value: absentCount, color: '#EF4444' },
                { name: 'Late', value: lateCount, color: '#F59E0B' },
                { name: 'On Leave', value: onLeaveCount, color: '#6366F1' }
            ]
        };
    }, [attendanceData, employees]);

    const exportReport = () => {
        const headers = ['Employee', 'Department', 'Present', 'Late', 'Absent', 'Total', 'Attendance Rate'];
        const csvContent = [
            headers.join(','),
            ...analytics.employeeSummary.map(emp => [
                `"${emp.full_name}"`,
                emp.department,
                emp.present,
                emp.late,
                emp.absent,
                emp.total,
                `${emp.rate}%`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return <div className="p-6 text-center">Loading attendance analytics...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Attendance Analytics</h2>
                <div className="flex gap-2">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="current_month">Current Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                            <SelectItem value="current_year">Current Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={exportReport} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="premium-card">
                    <CardContent className="p-4 text-center">
                        <UserCheck className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p className="text-2xl font-bold text-green-600">{analytics.attendanceRate}%</p>
                        <p className="text-sm text-muted-foreground">Attendance Rate</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="p-4 text-center">
                        <UserCheck className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                        <p className="text-2xl font-bold">{analytics.presentCount}</p>
                        <p className="text-sm text-muted-foreground">Present</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="p-4 text-center">
                        <UserX className="w-8 h-8 mx-auto text-red-500 mb-2" />
                        <p className="text-2xl font-bold">{analytics.absentCount}</p>
                        <p className="text-sm text-muted-foreground">Absent</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="p-4 text-center">
                        <Clock className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                        <p className="text-2xl font-bold">{analytics.lateCount}</p>
                        <p className="text-sm text-muted-foreground">Late</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="p-4 text-center">
                        <Calendar className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                        <p className="text-2xl font-bold">{analytics.onLeaveCount}</p>
                        <p className="text-sm text-muted-foreground">On Leave</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle>Daily Attendance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.dailyTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="present" fill="#10B981" name="Present" />
                                <Bar dataKey="late" fill="#F59E0B" name="Late" />
                                <Bar dataKey="absent" fill="#EF4444" name="Absent" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle>Attendance Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {analytics.statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Employee Summary Table */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle>Employee Attendance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Employee</th>
                                    <th className="text-left p-2">Department</th>
                                    <th className="text-center p-2">Present</th>
                                    <th className="text-center p-2">Late</th>
                                    <th className="text-center p-2">Absent</th>
                                    <th className="text-center p-2">Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.employeeSummary.slice(0, 10).map((emp, index) => (
                                    <tr key={emp.id} className="border-b hover:bg-accent/50">
                                        <td className="p-2">
                                            <div>
                                                <p className="font-medium">{emp.full_name}</p>
                                                <p className="text-sm text-muted-foreground">{emp.designation}</p>
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <Badge variant="outline">{emp.department}</Badge>
                                        </td>
                                        <td className="text-center p-2">{emp.present}</td>
                                        <td className="text-center p-2">{emp.late}</td>
                                        <td className="text-center p-2">{emp.absent}</td>
                                        <td className="text-center p-2">
                                            <Badge className={`${parseFloat(emp.rate) >= 90 ? 'bg-green-100 text-green-800' : parseFloat(emp.rate) >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                {emp.rate}%
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
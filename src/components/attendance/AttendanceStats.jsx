import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AttendanceStats({ currentUser, attendanceData }) {
  const userAttendance = attendanceData.filter(a => a.employee_id === currentUser.id);

  const stats = {
    present: userAttendance.filter(a => a.status === 'present' || a.status === 'late').length,
    absent: userAttendance.filter(a => a.status === 'absent').length,
    late: userAttendance.filter(a => a.status === 'late').length
  };

  const totalDays = stats.present + stats.absent;
  const presentRate = totalDays > 0 ? (stats.present / totalDays) * 100 : 0;

  const chartData = [
    { name: 'Present', value: stats.present },
    { name: 'Absent', value: stats.absent },
    { name: 'Late', value: stats.late },
  ];
  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Present Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <p className="text-3xl font-bold">{stats.present}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Absent Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <XCircle className="w-8 h-8 text-red-500" />
            <p className="text-3xl font-bold">{stats.absent}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Late Arrivals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <p className="text-3xl font-bold">{stats.late}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
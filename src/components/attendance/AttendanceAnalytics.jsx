
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, User, Clock, Loader2 } from 'lucide-react';
import { User as UserEntity } from '@/entities/User';
import { UserPermission } from '@/entities/UserPermission';
import { Attendance } from '@/entities/Attendance';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import AllEmployeeAttendanceView from './AllEmployeeAttendanceView';
import { toast } from 'sonner';

export default function AttendanceAnalytics() {
  const [currentUser, setCurrentUser] = useState(null);
  const [personalStats, setPersonalStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canViewTeamAnalytics, setCanViewTeamAnalytics] = useState(false);

  useEffect(() => {
    const loadDataAndPermissions = async () => {
      setIsLoading(true);
      try {
        const user = await UserEntity.me();
        setCurrentUser(user);

        if (user) {
          // UPDATED PERMISSION LOGIC:
          // Team Attendance Overview: Only Admin and Manager roles can access
          // My Monthly Performance: Any employee can access (always visible)
          if (user.job_role === 'admin' || user.job_role === 'manager') {
            setCanViewTeamAnalytics(true);
          } else {
            // For non-admin/manager roles, check UserPermission table for additional access
            const permissions = await UserPermission.filter({ user_id: user.id, module: 'attendance' });
            if (permissions.length > 0 && permissions[0].can_view === true) {
              setCanViewTeamAnalytics(true);
            } else {
              setCanViewTeamAnalytics(false);
            }
          }

          // Load personal stats (available to ALL employees)
          const monthStart = startOfMonth(new Date());
          const monthEnd = endOfMonth(new Date());
          const records = await Attendance.filter({
            employee_id: user.id,
            date: { $gte: format(monthStart, 'yyyy-MM-dd'), $lte: format(monthEnd, 'yyyy-MM-dd') }
          });
          
          const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const stats = daysInMonth.map(day => {
            const dayString = format(day, 'yyyy-MM-dd');
            const record = records.find(r => r.date === dayString);
            return {
              date: format(day, 'dd MMM'),
              'Working Hours': record?.working_hours || 0,
              status: record?.status || 'absent'
            };
          });
          setPersonalStats(stats);
        }
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        toast.error('Could not load your analytics data.');
      } finally {
        setIsLoading(false);
      }
    };
    loadDataAndPermissions();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Monthly Performance - ALWAYS VISIBLE TO ANY EMPLOYEE */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            My Monthly Performance
          </CardTitle>
          <p className="text-sm text-muted-foreground">Your working hours over the current month</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={personalStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(5px)',
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                }}
                formatter={(value, name, props) => [`${value?.toFixed(1)} hrs`, `Status: ${props.payload.status}`]}
              />
              <Legend />
              <Bar dataKey="Working Hours" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Team Attendance Overview - RESTRICTED TO ADMIN/MANAGER + PERMISSIONS */}
      {canViewTeamAnalytics && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Team Attendance Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">View and manage team attendance records</p>
          </CardHeader>
          <CardContent>
            <AllEmployeeAttendanceView />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

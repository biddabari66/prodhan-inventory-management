import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  User, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Shield,
  Settings
} from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { toast } from 'sonner';
import { User as UserEntity } from '@/entities/User';
import { Attendance } from '@/entities/Attendance';
import { Shift } from '@/entities/Shift';
import { EmployeeShiftAssignment } from '@/entities/EmployeeShiftAssignment';
import { AuditLog } from '@/entities/AuditLog';
import ShiftSelector from '../components/attendance/ShiftSelector';

export default function AttendanceMyPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Last 30 days
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await UserEntity.me();
      setCurrentUser(user);
      setSelectedEmployeeId(user.id);
      setViewingUser(user);
      
      // Load all users if current user is admin/manager
      if (user.job_role === 'admin' || user.job_role === 'manager') {
        const users = await UserEntity.list();
        setAllUsers(users.filter(u => u.is_active !== false));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      toast.error('Failed to load user information');
    }
  }, []);

  const loadAttendanceHistory = useCallback(async () => {
    if (!selectedEmployeeId) return;
    
    setIsLoading(true);
    try {
      const records = await Attendance.filter({
        employee_id: selectedEmployeeId,
        date: { 
          $gte: dateRange.startDate, 
          $lte: dateRange.endDate 
        }
      });
      
      // Sort by date descending
      const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttendanceHistory(sortedRecords);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
      toast.error('Failed to load attendance history');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployeeId, dateRange]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadAttendanceHistory();
    }
  }, [selectedEmployeeId, loadAttendanceHistory]);

  const handleEmployeeChange = async (employeeId) => {
    setSelectedEmployeeId(employeeId);
    const user = allUsers.find(u => u.id === employeeId);
    setViewingUser(user);
    
    // Create audit log for admin viewing other's records
    if (currentUser && employeeId !== currentUser.id) {
      try {
        await AuditLog.create({
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          action: 'view_sensitive',
          entity_type: 'Attendance',
          module: 'Attendance',
          description: `Admin viewed attendance history of ${user?.full_name} (${user?.employee_id})`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to create audit log:', error);
      }
    }
  };

  const getStatusBadge = (record) => {
    const getStatusInfo = () => {
      switch (record.status) {
        case 'present':
          return { color: 'bg-green-100 text-green-800', icon: CheckCircle2, text: 'Present' };
        case 'late':
          return { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, text: 'Late' };
        case 'absent':
          return { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Absent' };
        case 'on_leave':
          return { color: 'bg-blue-100 text-blue-800', icon: Calendar, text: 'On Leave' };
        default:
          return { color: 'bg-gray-100 text-gray-800', icon: Clock, text: record.status || 'Unknown' };
      }
    };
    
    const { color, icon: Icon, text } = getStatusInfo();
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {text}
        {record.manual_entry_reason && (
          <span className="ml-1 text-xs">(M)</span>
        )}
      </Badge>
    );
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    
    try {
      const checkInTime = new Date(`1970-01-01T${checkIn}`);
      const checkOutTime = new Date(`1970-01-01T${checkOut}`);
      const diffMs = checkOutTime - checkInTime;
      return Math.max(0, diffMs / (1000 * 60 * 60));
    } catch {
      return 0;
    }
  };

  const handleShiftChange = () => {
    // Refresh attendance data after shift change
    loadAttendanceHistory();
    toast.success('Shift updated successfully');
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
          <p>Loading your attendance data...</p>
        </div>
      </div>
    );
  }

  const canViewOtherEmployees = currentUser.job_role === 'admin' || currentUser.job_role === 'manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-gradient">
            {selectedEmployeeId === currentUser.id ? 'My Attendance History' : `${viewingUser?.full_name}'s Attendance`}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View attendance records and manage shift preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAttendanceHistory}
            className="min-w-[44px] min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Employee Selector for Admin/Manager */}
      {canViewOtherEmployees && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Admin View Control
              <Badge className="bg-orange-100 text-orange-800 text-xs">Admin/Manager Only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee-select">Select Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {viewingUser && (
                <div className="flex items-end">
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Department:</strong> {viewingUser.department || 'Unassigned'}</p>
                    <p><strong>Designation:</strong> {viewingUser.designation || 'Not Set'}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Selection for Current User */}
      {selectedEmployeeId === currentUser.id && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-500" />
              My Shift Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftSelector 
              user={currentUser} 
              onShiftChange={handleShiftChange}
              showLabel={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Date Range Filter */}
      <Card className="premium-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                max={dateRange.endDate}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                min={dateRange.startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <Button onClick={loadAttendanceHistory} className="min-h-[42px]">
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Attendance History ({attendanceHistory.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Clock className="w-6 h-6 animate-spin mx-auto mb-4 text-violet-500" />
              <p>Loading attendance records...</p>
            </div>
          ) : attendanceHistory.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No attendance records found for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Late Info</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.map((record) => {
                    const workingHours = record.working_hours || calculateWorkingHours(record.check_in_time, record.check_out_time);
                    const isLate = record.status === 'late';
                    const recordDate = parseISO(record.date);
                    
                    return (
                      <TableRow key={record.id} className={isToday(recordDate) ? 'bg-blue-50/50' : ''}>
                        <TableCell className="font-medium">
                          {format(recordDate, 'MMM dd, yyyy')}
                          {isToday(recordDate) && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">Today</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell>
                          {record.check_in_time ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              {record.check_in_time}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time ? (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-500" />
                              {record.check_out_time}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {workingHours > 0 ? (
                            <Badge className="bg-green-100 text-green-800">
                              {workingHours.toFixed(1)}h
                            </Badge>
                          ) : (
                            <span className="text-gray-400">0h</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isLate ? (
                            <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Late Arrival
                            </Badge>
                          ) : record.status === 'present' ? (
                            <Badge className="bg-green-100 text-green-800">On Time</Badge>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.notes ? (
                            <div className="max-w-xs truncate" title={record.notes}>
                              {record.notes}
                            </div>
                          ) : (
                            <span className="text-gray-400">No notes</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {attendanceHistory.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="premium-card">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">
                {attendanceHistory.filter(r => ['present', 'late'].includes(r.status)).length}
              </p>
              <p className="text-sm text-muted-foreground">Days Present</p>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-4 text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold text-red-600">
                {attendanceHistory.filter(r => r.status === 'absent').length}
              </p>
              <p className="text-sm text-muted-foreground">Days Absent</p>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600">
                {attendanceHistory.filter(r => r.status === 'late').length}
              </p>
              <p className="text-sm text-muted-foreground">Late Arrivals</p>
            </CardContent>
          </Card>
          <Card className="premium-card">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600">
                {attendanceHistory
                  .reduce((total, record) => total + (record.working_hours || 0), 0)
                  .toFixed(1)}h
              </p>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
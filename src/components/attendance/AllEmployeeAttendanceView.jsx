import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users, User, Clock, Search, RefreshCw, XCircle, CheckCircle, Calendar as CalendarIcon, Edit
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Attendance } from '@/entities/Attendance';
import { User as UserEntity } from '@/entities/User';
import AttendanceEditModal from './AttendanceEditModal';

const STATUS_CONFIG = {
  present: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3" /> },
  absent: { color: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" /> },
  late: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
  on_leave: { color: "bg-blue-100 text-blue-800", icon: <User className="w-3 h-3" /> },
};

export default function AllEmployeeAttendanceView() {
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      const [attendanceData, allUsers] = await Promise.all([
        Attendance.filter({ date: dateString }).catch(() => []),
        UserEntity.list().catch(() => [])
      ]);

      const userMap = new Map(allUsers.map(u => [u.id, u]));

      // Create a full list of attendance, ensuring every user has a record for the day
      const dailyAttendance = allUsers.map(user => {
        const existingRecord = attendanceData.find(a => a.employee_id === user.id);
        if (existingRecord) {
          return existingRecord;
        }
        // If no record, create a default 'absent' record
        return {
          id: `${user.id}-${dateString}`, // synthetic unique ID
          employee_id: user.id,
          employee_name: user.display_name || user.full_name,
          date: dateString,
          status: 'absent',
          check_in_time: 'N/A',
          check_out_time: 'N/A',
          working_hours: 0
        };
      });

      setAttendance(dailyAttendance);
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to load attendance data:", error);
      toast.error('Failed to load attendance data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const departments = useMemo(() => {
    return [...new Set(users.map(u => u.department).filter(Boolean))];
  }, [users]);

  const filteredAttendance = useMemo(() => {
    const userMap = new Map(users.map(u => [u.id, u]));

    return attendance.filter(record => {
      const user = userMap.get(record.employee_id);
      if (!user) return false;

      const matchesSearch = searchTerm === '' ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.employee_id && user.employee_id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDept = departmentFilter === 'all' || user.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [attendance, users, searchTerm, departmentFilter]);
  
  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsEditing(true);
  };

  const handleUpdateSuccess = () => {
    setIsEditing(false);
    setEditingRecord(null);
    loadData(); // Reload data after update
  };
  
  const stats = useMemo(() => {
    const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const absent = attendance.length - present;
    return { present, absent, total: attendance.length };
  }, [attendance]);

  return (
    <Card className="premium-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-600" />
              Team Attendance Overview
            </CardTitle>
            <CardDescription>
              {format(selectedDate, 'PPPP')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[200px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) setSelectedDate(date);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-center">
            <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                <p className="text-sm text-green-800">Present</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-sm text-red-800">Absent</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">0</p>
                <p className="text-sm text-blue-800">Active Shifts</p>
            </div>
            <div className="bg-violet-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-violet-600">{stats.total}</p>
                <p className="text-sm text-violet-800">Total Staff</p>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by employee name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>
                  {dept.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Working Hours</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    Loading attendance records...
                  </TableCell>
                </TableRow>
              ) : filteredAttendance.map(record => {
                const user = users.find(u => u.id === record.employee_id);
                const statusConfig = STATUS_CONFIG[record.status] || { color: "bg-gray-100 text-gray-800" };

                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user?.profile_picture_url} />
                          <AvatarFallback className="bg-gray-200">
                            {user?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user?.employee_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>
                        {statusConfig.icon}
                        <span className="ml-1">{record.status.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>{record.check_in_time}</TableCell>
                    <TableCell>{record.check_out_time}</TableCell>
                    <TableCell>{record.working_hours?.toFixed(2) || 0} hrs</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {isEditing && editingRecord && (
        <AttendanceEditModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          attendanceRecord={editingRecord}
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}
    </Card>
  );
}
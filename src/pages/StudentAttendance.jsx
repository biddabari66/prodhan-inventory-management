import React, { useState, useEffect } from 'react';
import { StudentAttendance as StudentAttendanceEntity } from '@/entities/StudentAttendance';
import { ZoomClass } from '@/entities/ZoomClass';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Video, User, Search, Percent, Clock } from 'lucide-react';
import LiveAttendanceDashboard from '../components/attendance/LiveAttendanceDashboard';
import ZoomIntegration from '../components/attendance/ZoomIntegration';
import AttendanceReports from '../components/attendance/AttendanceReports';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StudentAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    classId: 'all',
    date: new Date().toISOString().slice(0, 10),
    search: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attendanceData, classData] = await Promise.all([
        StudentAttendanceEntity.list('-class_date', 500),
        ZoomClass.list('-scheduled_start', 100),
      ]);
      setAttendance(attendanceData);
      setClasses(classData);
    } catch (error) {
      console.error("Error loading student attendance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(att => {
    const classMatch = filters.classId === 'all' || att.zoom_meeting_id === filters.classId;
    const dateMatch = !filters.date || att.class_date === filters.date;
    const searchMatch = !filters.search || 
      att.participant_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      att.participant_email.toLowerCase().includes(filters.search.toLowerCase());
    return classMatch && dateMatch && searchMatch;
  });

  const getStatusBadge = (status) => {
    const colors = {
      present: 'bg-green-100 text-green-800',
      late: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800',
      partial: 'bg-blue-100 text-blue-800'
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  if (isLoading) {
    return <div className="p-6">Loading student attendance...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Attendance</h1>
          <p className="text-gray-600 mt-1">Monitor live class attendance from Zoom.</p>
        </div>
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live">Live Dashboard</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="mt-6">
          <LiveAttendanceDashboard />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Attendance History & Filters</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              />
              <Select value={filters.classId} onValueChange={(v) => setFilters({...filters, classId: v})}>
                <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.zoom_meeting_id}>{cls.topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search students..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Join Time</TableHead>
                    <TableHead>Duration (min)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map(att => (
                    <TableRow key={att.id}>
                      <TableCell>{att.participant_name} ({att.participant_email})</TableCell>
                      <TableCell>{classes.find(c => c.zoom_meeting_id === att.zoom_meeting_id)?.topic}</TableCell>
                      <TableCell>{att.join_time ? format(new Date(att.join_time), 'h:mm a') : 'N/A'}</TableCell>
                      <TableCell>{att.duration_minutes}</TableCell>
                      <TableCell>{getStatusBadge(att.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <AttendanceReports attendanceData={attendance} classData={classes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
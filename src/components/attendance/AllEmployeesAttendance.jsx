import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Clock, MapPin } from 'lucide-react';
import { Attendance as AttendanceEntity } from '@/entities/Attendance';
import { format } from 'date-fns';
import { TableSkeleton } from '@/components/common/Skeletons';
import api from '@/api/client';

export default function AllEmployeesAttendance() {
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentId, setDepartmentId] = useState('all');

  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ['admin-all-attendance', dateStr],
    queryFn: async () => {
      // In a real scenario, this would be an admin endpoint that ignores the standard interceptor
      // and fetches attendance globally. Assuming standard entities works.
      const res = await api.get('/attendance', {
        params: { date: dateStr, limit: 1000 }
      });
      return res.data?.data || res.data || [];
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => api.get('/departments').then(res => res.data?.data || res.data || [])
  });

  const filteredData = attendanceData.filter(record => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!record.employee?.full_name?.toLowerCase().includes(q)) return false;
    }
    if (departmentId !== 'all') {
      if (record.employee?.department_id !== departmentId) return false;
    }
    return true;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'late': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'absent': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Daily Attendance Roster
          </CardTitle>
          <div className="flex items-center gap-3">
            <Input 
              type="date" 
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-auto h-9 bg-white dark:bg-slate-950"
            />
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search employee..." 
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-full sm:w-[200px] h-9">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments / Companies</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={10} cols={6} /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Check In</TableHead>
                  <TableHead className="font-semibold">Check Out</TableHead>
                  <TableHead className="font-semibold">Duration</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      No attendance records found for this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map(record => (
                    <TableRow key={record.id} className="hover:bg-orange-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {record.employee?.full_name || 'Unknown'}
                        <div className="text-xs text-slate-500 font-normal">{record.employee?.phone}</div>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {record.employee?.department?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getStatusColor(record.status || (record.check_in_time ? 'present' : 'absent'))} uppercase text-[10px] tracking-wider`}>
                          {record.status || (record.check_in_time ? 'present' : 'absent')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-sm text-slate-700 dark:text-slate-300">
                          {record.check_in_time ? <><Clock className="w-3.5 h-3.5 text-slate-400" /> {record.check_in_time}</> : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-sm text-slate-700 dark:text-slate-300">
                          {record.check_out_time ? <><Clock className="w-3.5 h-3.5 text-slate-400" /> {record.check_out_time}</> : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.working_hours ? `${Number(record.working_hours).toFixed(1)}h` : '-'}
                      </TableCell>
                      <TableCell>
                        {(record.latitude && record.longitude) ? (
                          <a 
                            href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                          >
                            <MapPin className="w-3 h-3" /> Map
                          </a>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

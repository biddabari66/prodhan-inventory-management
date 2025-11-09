import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Download, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AttendanceReports({ attendanceData, classData }) {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    course: 'all',
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredData = attendanceData.filter(att => {
    // Basic filtering logic
    const date = new Date(att.class_date);
    const startDateMatch = !filters.startDate || date >= new Date(filters.startDate);
    const endDateMatch = !filters.endDate || date <= new Date(filters.endDate);
    const courseMatch = filters.course === 'all' || att.subject === filters.course;
    return startDateMatch && endDateMatch && courseMatch;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
          <Input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
          <Button><Download className="w-4 h-4 mr-2" /> Export Report</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Detailed Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map(att => (
                <TableRow key={att.id}>
                  <TableCell>{att.participant_name}</TableCell>
                  <TableCell>{classData.find(c => c.zoom_meeting_id === att.zoom_meeting_id)?.topic}</TableCell>
                  <TableCell>{att.class_date}</TableCell>
                  <TableCell>{att.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
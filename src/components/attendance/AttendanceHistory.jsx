import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from 'lucide-react';

export default function AttendanceHistory({ currentUser, attendanceData, onDateSelect, selectedDate }) {
  const userAttendance = attendanceData.filter(a => a.employee_id === currentUser.id);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'present': return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'late': return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
      case 'absent': return <Badge variant="destructive">Absent</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Select Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userAttendance.map(record => (
            <TableRow key={record.id}>
              <TableCell>{format(new Date(record.date), 'PPP')}</TableCell>
              <TableCell>{getStatusBadge(record.status)}</TableCell>
              <TableCell>{record.check_in_time || 'N/A'}</TableCell>
              <TableCell>{record.check_out_time || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
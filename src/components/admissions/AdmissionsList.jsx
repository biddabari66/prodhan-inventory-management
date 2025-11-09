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

export default function AdmissionsList({ admissions, employees }) {
  const getEmployeeName = (id) => employees.find(e => e.id === id)?.full_name || 'N/A';

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student Name</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Admission Date</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Payment Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admissions.map(admission => (
          <TableRow key={admission.id}>
            <TableCell className="font-medium">{admission.student_name}</TableCell>
            <TableCell>{admission.course_name || admission.course_type}</TableCell>
            <TableCell>৳{admission.admission_fee.toLocaleString()}</TableCell>
            <TableCell>{format(new Date(admission.admission_date), 'MMM d, yyyy')}</TableCell>
            <TableCell>{getEmployeeName(admission.assigned_employee)}</TableCell>
            <TableCell>
              <Badge className={getStatusColor(admission.payment_status)}>
                {admission.payment_status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
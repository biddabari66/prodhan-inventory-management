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

export default function OptimizedAdmissionsList({ 
  admissions, 
  employees, 
  isLeadView = false,
  selectedRows = [],
  setSelectedRows = () => {},
  onRowClick = () => {}
}) {
  const getEmployeeName = React.useCallback(
    (id) => employees.find(e => e.id === id)?.full_name || 'N/A',
    [employees]
  );

  const getStatusColor = (status) => {
    if (isLeadView) {
      switch(status) {
        case 'new': return 'bg-blue-100 text-blue-800';
        case 'contacted': return 'bg-cyan-100 text-cyan-800';
        case 'qualified': return 'bg-teal-100 text-teal-800';
        case 'converted': return 'bg-green-100 text-green-800';
        case 'lost': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    } else {
      switch(status) {
        case 'paid': return 'bg-green-100 text-green-800';
        case 'partial': return 'bg-yellow-100 text-yellow-800';
        case 'pending': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const AdmissionRow = React.memo(({ admission, getEmployeeName, getStatusColor, onClick }) => (
    <TableRow 
      className="hover:bg-muted/50 cursor-pointer transition-colors duration-200" 
      onClick={() => onClick(admission)}
    >
      <TableCell className="font-medium">{admission.student_name}</TableCell>
      <TableCell>{admission.course_name || admission.course_type}</TableCell>
      <TableCell>৳{admission.admission_fee?.toLocaleString()}</TableCell>
      <TableCell>
        {format(new Date(admission.admission_date || admission.created_date), 'MMM d, yyyy')}
      </TableCell>
      <TableCell>{getEmployeeName(admission.assigned_employee || admission.assigned_to)}</TableCell>
      <TableCell>
        <Badge className={getStatusColor(admission.payment_status || admission.lead_status)}>
          {admission.payment_status || admission.lead_status}
        </Badge>
      </TableCell>
    </TableRow>
  ));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student Name</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>{isLeadView ? 'Created' : 'Admission'} Date</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>{isLeadView ? 'Status' : 'Payment Status'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admissions.map(admission => (
          <AdmissionRow
            key={admission.id}
            admission={admission}
            getEmployeeName={getEmployeeName}
            getStatusColor={getStatusColor}
            onClick={onRowClick}
          />
        ))}
      </TableBody>
    </Table>
  );
}
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

export default function IncomeList({ incomes }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Revenue Stream</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incomes.map(income => (
          <TableRow key={income.id}>
            <TableCell className="font-medium">{income.income_title}</TableCell>
            <TableCell>{income.revenue_stream}</TableCell>
            <TableCell>৳{income.amount.toLocaleString()}</TableCell>
            <TableCell>{format(new Date(income.income_date), 'MMM d, yyyy')}</TableCell>
            <TableCell><Badge className="bg-green-100 text-green-800">{income.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
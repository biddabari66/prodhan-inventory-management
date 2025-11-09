import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function InvoicePreview({ invoiceData, onConfirm, onCancel }) {
  const { vendor, items, total } = invoiceData;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Extracted Invoice Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Vendor:</strong> {vendor}</p>
          <p><strong>Total Amount:</strong> ৳{total}</p>
          <h4 className="font-semibold mt-4">Items:</h4>
          <ul>
            {items.map((item, index) => (
              <li key={index}>{item.description} - ৳{item.amount}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel / Re-upload</Button>
        <Button onClick={onConfirm}>Confirm & Create Expense</Button>
      </div>
    </div>
  );
}
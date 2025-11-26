import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ManualPaymentForm({ supplier, onSubmit, onCancel }) {
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid payment amount.');
            return;
        }
        onSubmit({
            amount: parseFloat(amount),
            payment_date: paymentDate,
            payment_method: paymentMethod,
            notes: notes,
            reference_number: `MANUAL-${Date.now()}`
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Manual Payment for {supplier.supplier_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Amount Paid (BDT)</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            required
                        />
                    </div>
                    <div>
                        <Label>Payment Date</Label>
                        <Input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <Label>Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                                <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g., Advance payment for PO-123"
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">Record Payment</Button>
            </div>
        </form>
    );
}
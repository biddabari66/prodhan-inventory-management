import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const DEPARTMENTS = ["biddabari_publication", "it", "boibari", "admission", "service", "marketing", "prodhan_com_e_commerce", "sales", "r_and_d"];
const REVENUE_STREAMS = ["course_fees", "book_sales", "consultation", "corporate_training", "online_courses", "other"];
const PAYMENT_METHODS = ["cash", "card", "online", "bank_transfer", "cheque"];

export default function IncomeForm({ income, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    income_title: '',
    income_date: new Date().toISOString().slice(0, 10),
    revenue_stream: '',
    amount: 0,
    payment_method: 'cash',
    student_name: '',
    course_type: '',
    department: '',
    tax_amount: 0,
    commission_amount: 0,
    notes: ''
  });

  useEffect(() => {
    if (income) {
      setFormData({
        income_title: income.income_title || '',
        income_date: income.income_date ? new Date(income.income_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        revenue_stream: income.revenue_stream || '',
        amount: income.amount || 0,
        payment_method: income.payment_method || 'cash',
        student_name: income.student_name || '',
        course_type: income.course_type || '',
        department: income.department || '',
        tax_amount: income.tax_amount || 0,
        commission_amount: income.commission_amount || 0,
        notes: income.notes || ''
      });
    }
  }, [income]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    const requiredFields = ['income_title', 'revenue_stream', 'amount', 'income_date', 'department'];
    for (const field of requiredFields) {
      if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
        toast.error(`Please fill in the '${field.replace(/_/g, ' ')}' field.`);
        return;
      }
      if (field === 'amount' && parseFloat(formData.amount) <= 0) {
        toast.error('Gross amount must be greater than zero.');
        return;
      }
    }

    const netIncome = (parseFloat(formData.amount) || 0) - (parseFloat(formData.tax_amount) || 0) - (parseFloat(formData.commission_amount) || 0);

    const submissionData = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      tax_amount: parseFloat(formData.tax_amount) || 0,
      commission_amount: parseFloat(formData.commission_amount) || 0,
      net_income: netIncome,
    };
    
    onSubmit(submissionData);
  };
  
  const grossAmount = parseFloat(formData.amount) || 0;
  const tax = parseFloat(formData.tax_amount) || 0;
  const commission = parseFloat(formData.commission_amount) || 0;
  const netIncome = grossAmount - tax - commission;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="income_title">Income Title</Label>
                <Input id="income_title" name="income_title" value={formData.income_title} onChange={handleChange} placeholder="e.g., BCS Course Admission Fee" required />
            </div>
            <div>
                <Label htmlFor="income_date">Income Date</Label>
                <Input id="income_date" name="income_date" type="date" value={formData.income_date} onChange={handleChange} required />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <Label htmlFor="revenue_stream">Revenue Stream</Label>
                <Select name="revenue_stream" onValueChange={(value) => handleSelectChange('revenue_stream', value)} value={formData.revenue_stream}>
                    <SelectTrigger><SelectValue placeholder="Select a revenue stream..." /></SelectTrigger>
                    <SelectContent>
                        {REVENUE_STREAMS.map(stream => <SelectItem key={stream} value={stream} className="capitalize">{stream.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="amount">Gross Amount (৳)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} placeholder="50000" required />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select name="payment_method" onValueChange={(value) => handleSelectChange('payment_method', value)} value={formData.payment_method}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {PAYMENT_METHODS.map(method => <SelectItem key={method} value={method} className="capitalize">{method.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="student_name">Student Name</Label>
                <Input id="student_name" name="student_name" value={formData.student_name} onChange={handleChange} placeholder="(If applicable)" />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="course_type">Course Type</Label>
                <Input id="course_type" name="course_type" value={formData.course_type} onChange={handleChange} placeholder="e.g., BCS, Bank, IT" />
            </div>
            <div>
                <Label htmlFor="department">Department</Label>
                <Select name="department" onValueChange={(value) => handleSelectChange('department', value)} value={formData.department}>
                    <SelectTrigger><SelectValue placeholder="Select a department..." /></SelectTrigger>
                    <SelectContent>
                        {DEPARTMENTS.map(dep => <SelectItem key={dep} value={dep} className="capitalize">{dep.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="tax_amount">Tax Amount (৳)</Label>
                <Input id="tax_amount" name="tax_amount" type="number" step="0.01" value={formData.tax_amount} onChange={handleChange} placeholder="0" />
            </div>
            <div>
                <Label htmlFor="commission_amount">Commission Amount (৳)</Label>
                <Input id="commission_amount" name="commission_amount" type="number" step="0.01" value={formData.commission_amount} onChange={handleChange} placeholder="0" />
            </div>
        </div>
        
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <h4 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-4">Income Calculation</h4>
            <div className="space-y-2 text-emerald-700 dark:text-emerald-400">
                <div className="flex justify-between items-center">
                    <span>Gross Amount:</span>
                    <span className="font-medium">৳{grossAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-red-500">
                    <span>Tax:</span>
                    <span className="font-medium">-৳{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-red-500">
                    <span>Commission:</span>
                    <span className="font-medium">-৳{commission.toLocaleString()}</span>
                </div>
                <hr className="border-emerald-200 dark:border-emerald-700 my-2" />
                <div className="flex justify-between items-center text-xl font-bold text-emerald-800 dark:text-emerald-200">
                    <span>Net Income:</span>
                    <span>৳{netIncome.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Any additional information about this income..." />
        </div>

        <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" className="bg-gradient-to-r from-violet-600 to-pink-600 text-white">Save Income Record</Button>
        </div>
    </form>
  );
}
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, DollarSign, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpenseAdjustmentForm({ 
  expense, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) {
  const [adjustmentData, setAdjustmentData] = useState({
    actual_spent_amount: '',
    adjustment_notes: ''
  });

  const handleInputChange = (field, value) => {
    setAdjustmentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateReturnedAmount = () => {
    const actualSpent = parseFloat(adjustmentData.actual_spent_amount) || 0;
    const originalAmount = expense.amount || 0;
    return Math.max(0, originalAmount - actualSpent);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!adjustmentData.actual_spent_amount || parseFloat(adjustmentData.actual_spent_amount) < 0) {
      toast.error('Please enter a valid actual spent amount');
      return;
    }

    const actualSpent = parseFloat(adjustmentData.actual_spent_amount);
    const originalAmount = expense.amount;

    if (actualSpent > originalAmount) {
      toast.error(`Actual spent amount cannot exceed the approved amount of ৳${originalAmount.toLocaleString()}`);
      return;
    }

    const adjustmentSubmission = {
      ...adjustmentData,
      actual_spent_amount: actualSpent,
      returned_amount: calculateReturnedAmount(),
      adjustment_date: new Date().toISOString(),
      status: 'adjusted'
    };

    onSubmit(adjustmentSubmission);
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <style jsx>{`
        .adjustment-form-container {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      `}</style>

      <div className="adjustment-form-container space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 -m-6 mb-6 p-6 text-white rounded-t-xl">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            Expense Adjustment
          </h2>
          <p className="text-emerald-100 mt-2">Reconcile advance payment with actual spending</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Original Expense Details */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                <FileText className="w-5 h-5" />
                Original Expense Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Expense Title</p>
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-200">{expense.expense_title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Approved Amount</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">৳{expense.amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Category</p>
                  <p className="text-base text-blue-800 dark:text-blue-300 capitalize">{expense.category?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Status</p>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {expense.status?.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adjustment Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="actual_spent_amount" className="flex items-center gap-2 text-base font-semibold">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Actual Spent Amount (৳) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="actual_spent_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={expense.amount}
                  value={adjustmentData.actual_spent_amount}
                  onChange={(e) => handleInputChange('actual_spent_amount', e.target.value)}
                  placeholder="Enter actual amount spent"
                  className="h-12 text-lg border-2 border-gray-200 focus:border-emerald-500 rounded-xl mt-2"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  Maximum: ৳{expense.amount?.toLocaleString()}
                </p>
              </div>

              <div>
                <Label htmlFor="adjustment_notes" className="flex items-center gap-2 text-base font-semibold">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Adjustment Notes
                </Label>
                <Textarea
                  id="adjustment_notes"
                  value={adjustmentData.adjustment_notes}
                  onChange={(e) => handleInputChange('adjustment_notes', e.target.value)}
                  placeholder="Provide details about the adjustment..."
                  rows={4}
                  className="resize-none border-2 border-gray-200 focus:border-emerald-500 rounded-xl mt-2"
                />
              </div>
            </div>

            {/* Calculation Summary */}
            {adjustmentData.actual_spent_amount && (
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                    <Calculator className="w-5 h-5" />
                    Adjustment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved Amount</p>
                      <p className="text-xl font-bold text-blue-600">৳{expense.amount?.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Actually Spent</p>
                      <p className="text-xl font-bold text-emerald-600">৳{parseFloat(adjustmentData.actual_spent_amount || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">To Be Returned</p>
                      <p className="text-xl font-bold text-orange-600">৳{calculateReturnedAmount().toLocaleString()}</p>
                    </div>
                  </div>

                  {calculateReturnedAmount() > 0 && (
                    <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-lg flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                          Employee needs to return ৳{calculateReturnedAmount().toLocaleString()}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          This amount will be marked as returned cash
                        </p>
                      </div>
                    </div>
                  )}

                  {calculateReturnedAmount() === 0 && adjustmentData.actual_spent_amount && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Perfect! Full amount was utilized.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons - Sticky Bottom */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 -mx-6 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="order-2 sm:order-1 h-12 border-2 border-gray-300 hover:border-gray-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !adjustmentData.actual_spent_amount}
                className="order-1 sm:order-2 flex-1 sm:flex-none h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-lg"
              >
                {isSubmitting ? 'Processing...' : 'Complete Adjustment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo } from 'react';
import { Expense } from '@/entities/Expense';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast, Toaster } from 'sonner';

export default function ExpenseApprovals() {
  const [expenses, setExpenses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, expenseData] = await Promise.all([
        User.me(),
        Expense.list('-submitted_date', 500)
      ]);
      setCurrentUser(user);
      
      // Filter expenses that need approval from the current user
      const expensesToApprove = expenseData.filter(exp => {
        if (user.role === 'manager' && exp.status === 'submitted') {
          return true;
        }
        if (user.role === 'department_head' && exp.department === user.department && exp.status === 'submitted') {
          return true;
        }
        if (user.role === 'admin' && exp.status === 'pending_finance_approval') {
          return true;
        }
        return false;
      });

      setExpenses(expensesToApprove);
    } catch (error) {
      console.error("Error loading data for approvals:", error);
      toast.error("Failed to load expense approvals.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (expenseId, approvalType) => {
    try {
      let updateData = {};
      if (approvalType === 'manager') {
        updateData = {
          status: 'pending_finance_approval',
          manager_approved_by: currentUser.id,
          manager_approval_date: new Date().toISOString()
        };
      } else if (approvalType === 'finance') {
        updateData = {
          status: 'approved',
          finance_approved_by: currentUser.id,
          finance_approval_date: new Date().toISOString(),
          final_approval_date: new Date().toISOString(),
        };
      }
      await Expense.update(expenseId, updateData);
      toast.success("Expense approved successfully.");
      loadData();
    } catch (error) {
      console.error("Error approving expense:", error);
      toast.error("Failed to approve expense.");
    }
  };
  
  const openRejectionModal = (expense) => {
    setSelectedExpense(expense);
    setIsRejectModalOpen(true);
  };

  const handleRejection = async () => {
    if (!rejectionReason) {
        toast.error("Rejection reason cannot be empty.");
        return;
    }
    try {
      let updateData = {};
      const approvalType = selectedExpense.status === 'submitted' ? 'manager' : 'finance';

      if (approvalType === 'manager') {
          updateData = {
              status: 'rejected',
              manager_rejection_reason: rejectionReason,
          };
      } else {
          updateData = {
              status: 'rejected',
              finance_rejection_reason: rejectionReason,
          };
      }
      
      await Expense.update(selectedExpense.id, updateData);
      toast.success("Expense rejected.");
      loadData();
      setIsRejectModalOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error("Error rejecting expense:", error);
      toast.error("Failed to reject expense.");
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      submitted: 'bg-yellow-100 text-yellow-800',
      pending_finance_approval: 'bg-blue-100 text-blue-800',
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status.replace(/_/g, ' ')}</Badge>;
  };
  
  if (isLoading) {
    return <div className="p-6">Loading expense approvals...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Toaster />
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Expense Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve or reject submitted expense requests.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Approval Queue ({expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted On</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map(expense => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.submitted_date), 'PPpp')}</TableCell>
                  <TableCell>{expense.submitted_by_name || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{expense.expense_title}</TableCell>
                  <TableCell>{expense.department}</TableCell>
                  <TableCell>৳{expense.amount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(expense.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                       <Button variant="ghost" size="sm" asChild>
                           <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /></a>
                       </Button>
                       <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleApproval(expense.id, expense.status === 'submitted' ? 'manager' : 'finance')}>
                           <Check className="w-4 h-4" />
                       </Button>
                       <Button variant="ghost" size="sm" className="text-red-600" onClick={() => openRejectionModal(expense)}>
                           <X className="w-4 h-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                          No expenses pending your approval.
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reject Expense Request</DialogTitle>
                <DialogDescription>
                    Please provide a reason for rejecting this expense. This will be sent to the submitter.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    placeholder="Type your reason here..." 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRejection}>Confirm Rejection</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, Loader2, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Expense } from '@/entities/Expense';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

/**
 * 🎯 ACTIONABLE NOTIFICATION COMPONENT
 * Allows users to perform actions directly from notifications
 * Supports expense approvals, task completions, etc.
 */

export default function ActionableNotification({ notification, onAction, onMarkAsRead }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      // Parse action data from notification
      const actionData = notification.action_data ? JSON.parse(notification.action_data) : {};
      
      if (actionData.expense_id) {
        const currentUser = await base44.auth.me();
        const expense = await Expense.read(actionData.expense_id);

        // Determine approval level based on user role
        if (currentUser.job_role === 'manager' || currentUser.job_role === 'department_head') {
          await Expense.update(actionData.expense_id, {
            status: 'pending_finance_approval',
            manager_approved_by: currentUser.id,
            manager_approved_by_name: currentUser.full_name,
            manager_approval_date: new Date().toISOString()
          });
          toast.success('✅ Expense approved! Sent to finance team.');
        } else if (currentUser.job_role === 'finance_head' || currentUser.job_role === 'admin') {
          await Expense.update(actionData.expense_id, {
            status: 'approved',
            finance_approved_by: currentUser.id,
            finance_approval_date: new Date().toISOString(),
            final_approval_date: new Date().toISOString()
          });
          toast.success('✅ Expense fully approved!');
        }

        // Mark notification as read
        if (onMarkAsRead) {
          await onMarkAsRead(notification.id);
        }

        if (onAction) {
          onAction('approved', actionData);
        }
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve. Please try from the Expenses page.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    // For reject, redirect to expenses page for detailed rejection reason
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div
      className={`p-4 cursor-pointer transition-all border-l-4 ${
        !notification.is_read
          ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-500'
          : 'bg-white hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {notification.title}
            </p>
            {notification.priority === 'urgent' && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                Urgent
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {notification.message}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
            </span>

            {notification.is_actionable && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="h-7 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Review
                </Button>
              </div>
            )}
          </div>
        </div>

        {!notification.is_read && (
          <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0"></div>
        )}
      </div>
    </div>
  );
}
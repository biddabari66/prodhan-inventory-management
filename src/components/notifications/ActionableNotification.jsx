import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Expense } from '@/entities/Expense';
import { Task } from '@/entities/Task';
import { base44 } from '@/api/base44Client';

/**
 * 🎯 ACTIONABLE NOTIFICATION COMPONENT
 * Allows users to take direct actions from notifications
 * Supports: Expense approval/rejection, Task updates, etc.
 */

export default function ActionableNotification({ notification, onActionComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const parseActionData = () => {
    try {
      return JSON.parse(notification.action_data || '{}');
    } catch {
      return {};
    }
  };

  const handleApproveExpense = async () => {
    setIsProcessing(true);
    try {
      const actionData = parseActionData();
      const expenseId = actionData.expense_id;

      if (!expenseId) {
        toast.error('Invalid expense data');
        return;
      }

      const expense = await Expense.get(expenseId);
      const user = await base44.auth.me();

      let updateData = {};

      if (expense.status === 'pending_manager_approval') {
        updateData = {
          status: 'pending_finance_approval',
          manager_approved_by: user.id,
          manager_approved_by_name: user.full_name,
          manager_approval_date: new Date().toISOString()
        };
      } else if (expense.status === 'pending_finance_approval') {
        updateData = {
          status: 'approved',
          finance_approved_by: user.id,
          finance_approval_date: new Date().toISOString(),
          final_approval_date: new Date().toISOString()
        };
      }

      await Expense.update(expenseId, updateData);
      toast.success('✅ Expense approved successfully!');
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Failed to approve expense');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectExpense = async () => {
    setIsProcessing(true);
    try {
      const actionData = parseActionData();
      const expenseId = actionData.expense_id;

      if (!expenseId) {
        toast.error('Invalid expense data');
        return;
      }

      const user = await base44.auth.me();
      const reason = prompt('Rejection reason (optional):') || 'No reason provided';

      await Expense.update(expenseId, {
        status: 'rejected',
        manager_rejection_reason: reason,
        manager_approved_by: user.id,
        manager_approval_date: new Date().toISOString()
      });

      toast.success('❌ Expense rejected');
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject expense');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTaskAction = async (action) => {
    setIsProcessing(true);
    try {
      const actionData = parseActionData();
      const taskId = actionData.task_id;

      if (!taskId) {
        toast.error('Invalid task data');
        return;
      }

      const statusMap = {
        'start': 'in_progress',
        'complete': 'submitted'
      };

      await Task.update(taskId, {
        status: statusMap[action] || 'in_progress'
      });

      toast.success(`✅ Task ${action === 'complete' ? 'completed' : 'started'}!`);
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error('Task action failed:', error);
      toast.error('Failed to update task');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render action buttons based on notification type
  const renderActionButtons = () => {
    if (!notification.is_actionable) return null;

    const actionData = parseActionData();

    // Expense approval actions
    if (actionData.action_type === 'expense_approval') {
      return (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={handleApproveExpense}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRejectExpense}
            disabled={isProcessing}
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      );
    }

    // Task actions
    if (actionData.action_type === 'task_assignment') {
      return (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={() => handleTaskAction('start')}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Task'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = notification.action_url}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View
          </Button>
        </div>
      );
    }

    // Default action
    if (notification.action_url) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.location.href = notification.action_url}
          className="mt-3"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          {notification.action_text || 'View Details'}
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="p-4 bg-white rounded-lg border hover:border-violet-400 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{notification.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
        </div>
        <Badge className={`
          ${notification.priority === 'urgent' ? 'bg-red-100 text-red-800' : ''}
          ${notification.priority === 'high' ? 'bg-orange-100 text-orange-800' : ''}
          ${notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
          ${notification.priority === 'low' ? 'bg-blue-100 text-blue-800' : ''}
        `}>
          {notification.priority}
        </Badge>
      </div>
      
      {renderActionButtons()}
    </div>
  );
}
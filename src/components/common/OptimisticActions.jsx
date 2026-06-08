import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { erp } from '@/api/erpClient';

/**
 * 🚀 EXPERT OPTIMISTIC ACTIONS
 * Pre-built optimistic update handlers for common ERP actions
 */

export const useOptimisticActions = () => {
  const queryClient = useQueryClient();

  // Optimistic Attendance Check-in/Check-out
  const optimisticAttendance = async (action, attendanceData, apiCall) => {
    const tempAttendance = {
      ...attendanceData,
      id: `temp-${Date.now()}`,
      _optimistic: true,
      [action === 'check_in' ? 'check_in_time' : 'check_out_time']: new Date().toLocaleTimeString('en-GB')
    };

    // Immediate UI update
    queryClient.setQueryData(['attendance', attendanceData.employee_id, attendanceData.date], tempAttendance);
    
    const optimisticToast = toast.success(`✨ ${action === 'check_in' ? 'Checked in' : 'Checked out'} instantly!`, {
      duration: 2000
    });

    try {
      const result = await apiCall();
      
      // Replace with real data
      queryClient.setQueryData(['attendance', attendanceData.employee_id, attendanceData.date], result);
      queryClient.invalidateQueries(['attendance']);
      
      return { success: true, data: result };
    } catch (error) {
      // Rollback
      queryClient.setQueryData(['attendance', attendanceData.employee_id, attendanceData.date], null);
      toast.error('Failed to record attendance. Please try again.', { id: optimisticToast });
      return { success: false, error };
    }
  };

  // Optimistic Expense Status Update
  const optimisticExpenseUpdate = async (expenseId, updates, apiCall) => {
    const previousData = queryClient.getQueryData(['expenses']);

    // Immediate UI update
    queryClient.setQueryData(['expenses'], (old = []) => {
      return old.map(expense => 
        expense.id === expenseId 
          ? { ...expense, ...updates, _optimistic: true } 
          : expense
      );
    });

    const statusLabel = updates.status?.replace('_', ' ').toUpperCase();
    toast.success(`✨ Expense ${statusLabel} instantly!`, { duration: 2000 });

    try {
      const result = await apiCall();
      
      // Update with server data
      queryClient.setQueryData(['expenses'], (old = []) => {
        return old.map(expense => expense.id === expenseId ? result : expense);
      });
      
      queryClient.invalidateQueries(['expenses']);

      // Trigger auto-email
      await triggerAutoEmail('expense_approved', result);
      
      return { success: true, data: result };
    } catch (error) {
      // Rollback
      queryClient.setQueryData(['expenses'], previousData);
      toast.error('Update failed. Changes reverted.');
      return { success: false, error };
    }
  };

  // Optimistic Order Status Change
  const optimisticOrderUpdate = async (orderId, newStatus, apiCall) => {
    const previousData = queryClient.getQueryData(['orders']);

    // Immediate UI update
    queryClient.setQueryData(['orders'], (old = []) => {
      return old.map(order => 
        order.id === orderId 
          ? { ...order, order_status: newStatus, _optimistic: true } 
          : order
      );
    });

    toast.success(`✨ Order ${newStatus} instantly!`, { duration: 2000 });

    try {
      const result = await apiCall();
      
      // Update with server data
      queryClient.setQueryData(['orders'], (old = []) => {
        return old.map(order => order.id === orderId ? result : order);
      });
      
      queryClient.invalidateQueries(['orders']);

      // Trigger auto-email for shipment
      if (newStatus === 'shipped') {
        await triggerAutoEmail('order_shipped', result);
      }
      
      return { success: true, data: result };
    } catch (error) {
      // Rollback
      queryClient.setQueryData(['orders'], previousData);
      toast.error('Update failed. Changes reverted.');
      return { success: false, error };
    }
  };

  // Optimistic Task Creation/Update
  const optimisticTaskAction = async (taskData, apiCall, isUpdate = false) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = { ...taskData, id: isUpdate ? taskData.id : tempId, _optimistic: true };

    if (isUpdate) {
      const previousData = queryClient.getQueryData(['tasks']);
      
      queryClient.setQueryData(['tasks'], (old = []) => {
        return old.map(task => task.id === taskData.id ? optimisticTask : task);
      });

      toast.success('✨ Task updated instantly!', { duration: 2000 });

      try {
        const result = await apiCall();
        queryClient.setQueryData(['tasks'], (old = []) => {
          return old.map(task => task.id === taskData.id ? result : task);
        });
        queryClient.invalidateQueries(['tasks']);
        
        // Trigger auto-email for assignments
        await triggerAutoEmail('task_assigned', result);
        
        return { success: true, data: result };
      } catch (error) {
        queryClient.setQueryData(['tasks'], previousData);
        toast.error('Update failed. Changes reverted.');
        return { success: false, error };
      }
    } else {
      // Create
      queryClient.setQueryData(['tasks'], (old = []) => [optimisticTask, ...old]);
      toast.success('✨ Task created instantly!', { duration: 2000 });

      try {
        const result = await apiCall();
        queryClient.setQueryData(['tasks'], (old = []) => {
          return old.map(task => task.id === tempId ? result : task);
        });
        queryClient.invalidateQueries(['tasks']);
        
        await triggerAutoEmail('task_assigned', result);
        
        return { success: true, data: result };
      } catch (error) {
        queryClient.setQueryData(['tasks'], (old = []) => {
          return old.filter(task => task.id !== tempId);
        });
        toast.error('Failed to create task. Please try again.');
        return { success: false, error };
      }
    }
  };

  // Optimistic Lead Status Update
  const optimisticLeadUpdate = async (leadId, newStatus, apiCall) => {
    const previousData = queryClient.getQueryData(['leads']);

    queryClient.setQueryData(['leads'], (old = []) => {
      return old.map(lead => 
        lead.id === leadId 
          ? { ...lead, lead_status: newStatus, _optimistic: true } 
          : lead
      );
    });

    toast.success(`✨ Lead moved to ${newStatus}!`, { duration: 2000 });

    try {
      const result = await apiCall();
      
      queryClient.setQueryData(['leads'], (old = []) => {
        return old.map(lead => lead.id === leadId ? result : lead);
      });
      
      queryClient.invalidateQueries(['leads']);
      
      return { success: true, data: result };
    } catch (error) {
      queryClient.setQueryData(['leads'], previousData);
      toast.error('Update failed. Changes reverted.');
      return { success: false, error };
    }
  };

  return {
    optimisticAttendance,
    optimisticExpenseUpdate,
    optimisticOrderUpdate,
    optimisticTaskAction,
    optimisticLeadUpdate
  };
};

// Helper: Trigger auto-email notifications
async function triggerAutoEmail(eventType, eventData) {
  try {
    await erp.functions.invoke('triggerAutoEmails', {
      event_type: eventType,
      event_data: eventData
    });
    console.log(`✅ Auto-email triggered: ${eventType}`);
  } catch (error) {
    console.warn('⚠️ Auto-email failed (non-critical):', error);
  }
}

export default useOptimisticActions;
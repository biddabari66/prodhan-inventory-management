import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * EXPERT OPTIMISTIC UPDATE MANAGER
 * Makes UI feel instant by updating immediately before server confirmation
 */

export const useOptimisticUpdate = () => {
  const queryClient = useQueryClient();

  const optimisticCreate = async (queryKey, newItem, createFn) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticItem = { ...newItem, id: tempId, _optimistic: true };

    // Immediately update UI
    queryClient.setQueryData(queryKey, (old = []) => {
      return [optimisticItem, ...old];
    });

    try {
      // Perform actual server operation
      const result = await createFn(newItem);
      
      // Replace optimistic item with real data
      queryClient.setQueryData(queryKey, (old = []) => {
        return old.map(item => item.id === tempId ? result : item);
      });

      return { success: true, data: result };
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(queryKey, (old = []) => {
        return old.filter(item => item.id !== tempId);
      });
      
      toast.error('Operation failed. Changes reverted.');
      return { success: false, error };
    }
  };

  const optimisticUpdate = async (queryKey, itemId, updates, updateFn) => {
    // Store previous state for rollback
    const previousData = queryClient.getQueryData(queryKey);

    // Immediately update UI
    queryClient.setQueryData(queryKey, (old = []) => {
      return old.map(item => 
        item.id === itemId ? { ...item, ...updates, _optimistic: true } : item
      );
    });

    try {
      // Perform actual server operation
      const result = await updateFn(itemId, updates);
      
      // Update with server response
      queryClient.setQueryData(queryKey, (old = []) => {
        return old.map(item => item.id === itemId ? result : item);
      });

      return { success: true, data: result };
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(queryKey, previousData);
      
      toast.error('Update failed. Changes reverted.');
      return { success: false, error };
    }
  };

  const optimisticDelete = async (queryKey, itemId, deleteFn) => {
    // Store previous state for rollback
    const previousData = queryClient.getQueryData(queryKey);

    // Immediately update UI
    queryClient.setQueryData(queryKey, (old = []) => {
      return old.filter(item => item.id !== itemId);
    });

    try {
      // Perform actual server operation
      await deleteFn(itemId);
      return { success: true };
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(queryKey, previousData);
      
      toast.error('Delete failed. Item restored.');
      return { success: false, error };
    }
  };

  return {
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete
  };
};

// Prefetch helper for better UX
export const usePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetch = (queryKey, queryFn, options = {}) => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
      ...options
    });
  };

  const prefetchOnHover = (queryKey, queryFn) => {
    return {
      onMouseEnter: () => prefetch(queryKey, queryFn),
      onTouchStart: () => prefetch(queryKey, queryFn), // Mobile support
    };
  };

  return { prefetch, prefetchOnHover };
};

export default useOptimisticUpdate;
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * OPTIMISTIC MUTATION HOOKS
 * Instant UI updates with background sync for a snappy experience
 */

// Generic optimistic update mutation
export const useOptimisticMutation = ({
  mutationFn,
  queryKey,
  onMutate,
  onSuccess,
  onError,
  successMessage = 'Saved successfully!',
  errorMessage = 'Failed to save. Please try again.',
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update cache
      if (onMutate) {
        const optimisticData = onMutate(previousData, newData);
        if (optimisticData !== undefined) {
          queryClient.setQueryData(queryKey, optimisticData);
        }
      }

      return { previousData };
    },
    onSuccess: (result, variables, context) => {
      toast.success(successMessage);
      if (onSuccess) onSuccess(result, variables, context);
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(errorMessage);
      if (onError) onError(error, variables, context);
    },
  });
};

// Create mutation with optimistic add
export const useOptimisticCreate = (entityName, createFn, queryKey) => {
  return useOptimisticMutation({
    mutationFn: createFn,
    queryKey,
    onMutate: (previousData, newItem) => {
      const tempId = `temp_${Date.now()}`;
      const optimisticItem = { 
        ...newItem, 
        id: tempId, 
        created_date: new Date().toISOString(),
        _isOptimistic: true 
      };
      return [...(previousData || []), optimisticItem];
    },
    successMessage: `${entityName} created!`,
    errorMessage: `Failed to create ${entityName}`,
  });
};

// Update mutation with optimistic update
export const useOptimisticUpdate = (entityName, updateFn, queryKey) => {
  return useOptimisticMutation({
    mutationFn: ({ id, data }) => updateFn(id, data),
    queryKey,
    onMutate: (previousData, { id, data }) => {
      return (previousData || []).map(item => 
        item.id === id ? { ...item, ...data, _isOptimistic: true } : item
      );
    },
    successMessage: `${entityName} updated!`,
    errorMessage: `Failed to update ${entityName}`,
  });
};

// Delete mutation with optimistic removal
export const useOptimisticDelete = (entityName, deleteFn, queryKey) => {
  return useOptimisticMutation({
    mutationFn: deleteFn,
    queryKey,
    onMutate: (previousData, id) => {
      return (previousData || []).filter(item => item.id !== id);
    },
    successMessage: `${entityName} deleted!`,
    errorMessage: `Failed to delete ${entityName}`,
  });
};

export default useOptimisticMutation;
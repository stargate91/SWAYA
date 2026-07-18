import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { QK } from '@/lib/queryKeys';

export const useCreateTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.tags.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.libraryTags });
      queryClient.invalidateQueries({ queryKey: QK.allTags });
      queryClient.invalidateQueries({ queryKey: QK.libraryFilters });
    },
  });
};

export const useUpdateTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.tags.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.libraryTags });
      queryClient.invalidateQueries({ queryKey: QK.allTags });
      queryClient.invalidateQueries({ queryKey: QK.libraryFilters });
      queryClient.invalidateQueries({ queryKey: QK.library });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail'] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail'] });
      queryClient.invalidateQueries({ queryKey: ['person-detail'] });
    },
  });
};

export const useDeleteTagMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.tags.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.libraryTags });
      queryClient.invalidateQueries({ queryKey: QK.allTags });
      queryClient.invalidateQueries({ queryKey: QK.libraryFilters });
      queryClient.invalidateQueries({ queryKey: QK.library });
      queryClient.invalidateQueries({ queryKey: ['library-item-detail'] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail'] });
      queryClient.invalidateQueries({ queryKey: ['person-detail'] });
    },
  });
};

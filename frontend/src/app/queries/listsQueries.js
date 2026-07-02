import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export const listsKeys = {
  all: ['lists'],
  details: (id) => ['lists', 'details', id],
};

export const useListsQuery = () => useQuery({
  queryKey: listsKeys.all,
  queryFn: () => api.lists.getLists(),
});

export const useListDetailsQuery = (listId, options = {}) => useQuery({
  queryKey: listsKeys.details(listId),
  queryFn: () => api.lists.getListDetails(listId),
  enabled: !!listId,
  ...options,
});

export const useCreateListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.lists.createList(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
    },
  });
};

export const useUpdateListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, payload }) => api.lists.updateList(listId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
      queryClient.invalidateQueries({ queryKey: listsKeys.details(variables.listId) });
    },
  });
};

export const useDeleteListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId) => api.lists.deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
    },
  });
};

export const useAddListItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, payload }) => api.lists.addToList(listId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
      queryClient.invalidateQueries({ queryKey: listsKeys.details(variables.listId) });
    },
  });
};

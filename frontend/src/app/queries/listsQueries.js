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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lists', 'details'] });
    },
  });
};

export const useDeleteListMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listId) => api.lists.deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lists', 'details'] });
    },
  });
};

export const useAddListItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, payload }) => api.lists.addToList(listId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lists', 'details'] });
      queryClient.invalidateQueries({ queryKey: ['lists', 'membership'] });
    },
  });
};

export const useRemoveListItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, itemId }) => api.lists.removeFromList(listId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lists', 'details'] });
      queryClient.invalidateQueries({ queryKey: ['lists', 'membership'] });
    },
  });
};

export const useUploadListImageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, file }) => api.lists.uploadListImage(listId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lists', 'details'] });
    },
  });
};

export const useOverrideListImageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, path }) => api.lists.overrideListImage(listId, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['lists', 'details'] });
    },
  });
};

export const useItemMembershipQuery = (itemId) => {
  return useQuery({
    queryKey: ['lists', 'membership', itemId],
    queryFn: () => api.lists.getItemMembership(itemId),
    enabled: !!itemId,
  });
};


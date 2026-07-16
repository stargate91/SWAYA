import { useCallback } from 'react';
import api from '../../lib/api';
import { getOrganizerQueryKey } from '../../queries';
import { QK } from '../../lib/queryKeys';

export const removeOrganizerRow = (currentOrganizer, row) => {
  if (!currentOrganizer) {
    return currentOrganizer;
  }

  if (row.rawType === 'extra') {
    return {
      ...currentOrganizer,
      extras: (currentOrganizer.extras || []).filter((item) => item.id !== row.itemId),
    };
  }

  const mediaId = row.itemId;
  return {
    ...currentOrganizer,
    manual: (currentOrganizer.manual || []).filter((item) => item.id !== mediaId),
    movies: (currentOrganizer.movies || []).filter((item) => item.id !== mediaId),
    tv: (currentOrganizer.tv || []).filter((item) => item.id !== mediaId),
    collisions: (currentOrganizer.collisions || []).filter((item) => item.id !== mediaId),
    extras: (currentOrganizer.extras || []).filter((item) => item.parent_id !== mediaId),
  };
};

export const removeOrganizerRows = (currentOrganizer, rows) => rows.reduce(
  (nextOrganizer, row) => removeOrganizerRow(nextOrganizer, row),
  currentOrganizer,
);

export function useOrganizerDeleteActions({
  t,
  closeModal,
  toast,
  queryClient,
  focusFirstAvailableResult,
  clearSelectedRows,
  scanMode,
  sessionMode,
  addPendingResolvedIds,
  removePendingResolvedIds,
}) {
  const queryKey = getOrganizerQueryKey(scanMode, sessionMode);

  const refreshOrganizer = useCallback(async () => {
    const data = await api.organizer.get({ scanMode, sessionMode });
    queryClient.setQueryData(queryKey, data);
    focusFirstAvailableResult(data);
    queryClient.invalidateQueries({ queryKey: ['organizer-count'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  }, [queryClient, focusFirstAvailableResult, scanMode, sessionMode, queryKey]);

  const handleResolveOrganizerRow = useCallback(async (row) => {
    closeModal();
    if (addPendingResolvedIds) {
      addPendingResolvedIds([row.id]);
    }
    const previousOrganizer = queryClient.getQueryData(queryKey);
    const nextOrganizer = removeOrganizerRow(previousOrganizer, row);
    if (nextOrganizer) {
      queryClient.setQueryData(queryKey, nextOrganizer);
      focusFirstAvailableResult(nextOrganizer);
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      queryClient.invalidateQueries({ queryKey: QK.stats });
    }

    try {
      await refreshOrganizer();
    } catch {
      if (previousOrganizer) {
        queryClient.setQueryData(queryKey, previousOrganizer);
        focusFirstAvailableResult(previousOrganizer);
      }
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      queryClient.invalidateQueries({ queryKey: QK.stats });
    } finally {
      if (removePendingResolvedIds) {
        removePendingResolvedIds([row.id]);
      }
    }
  }, [closeModal, queryClient, focusFirstAvailableResult, refreshOrganizer, queryKey, addPendingResolvedIds, removePendingResolvedIds]);

  const handleResolveOrganizerRows = useCallback(async (rows, performMutationFn) => {
    closeModal();
    if (addPendingResolvedIds) {
      addPendingResolvedIds(rows.map((row) => row.id));
    }
    const previousOrganizer = queryClient.getQueryData(queryKey);
    const nextOrganizer = removeOrganizerRows(previousOrganizer, rows);
    if (nextOrganizer) {
      queryClient.setQueryData(queryKey, nextOrganizer);
      focusFirstAvailableResult(nextOrganizer);
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      queryClient.invalidateQueries({ queryKey: QK.stats });
    }

    try {
      if (performMutationFn) {
        await performMutationFn();
      }
      await refreshOrganizer();
    } catch (error) {
      if (previousOrganizer) {
        queryClient.setQueryData(queryKey, previousOrganizer);
        focusFirstAvailableResult(previousOrganizer);
      }
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      queryClient.invalidateQueries({ queryKey: QK.stats });
      throw error;
    } finally {
      if (removePendingResolvedIds) {
        removePendingResolvedIds(rows.map((row) => row.id));
      }
    }
  }, [closeModal, queryClient, focusFirstAvailableResult, refreshOrganizer, queryKey, addPendingResolvedIds, removePendingResolvedIds]);

  const handleDeleteOrganizerRow = useCallback(async (row, mode) => {
    closeModal();
    if (addPendingResolvedIds) {
      addPendingResolvedIds([row.id]);
    }
    const previousOrganizer = queryClient.getQueryData(queryKey);
    const nextOrganizer = removeOrganizerRow(previousOrganizer, row);
    if (nextOrganizer) {
      queryClient.setQueryData(queryKey, nextOrganizer);
      focusFirstAvailableResult(nextOrganizer);
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      queryClient.invalidateQueries({ queryKey: QK.stats });
    }

    try {
      await api.organizer.delete({
        item_ids: row.rawType === 'extra' ? [] : [row.itemId],
        extra_ids: row.rawType === 'extra' ? [row.itemId] : [],
        mode,
      });
      await refreshOrganizer();
      const toastKey = mode === 'ignore' ? 'organizer.toasts.deleteIgnoreSuccess'
        : mode === 'trash' ? 'organizer.toasts.deleteTrashSuccess'
        : 'organizer.toasts.deleteDbOnlySuccess';
      toast(t(toastKey), 'success');
    } catch (error) {
      if (previousOrganizer) {
        queryClient.setQueryData(queryKey, previousOrganizer);
        focusFirstAvailableResult(previousOrganizer);
      }
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      queryClient.invalidateQueries({ queryKey: QK.stats });
      throw error;
    }
  }, [closeModal, queryClient, focusFirstAvailableResult, refreshOrganizer, toast, t, queryKey, addPendingResolvedIds]);

  const handleDeleteOrganizerRows = useCallback(async (rows, mode) => {
    closeModal();
    clearSelectedRows();
    if (addPendingResolvedIds) {
      addPendingResolvedIds(rows.map((row) => row.id));
    }
    const previousOrganizer = queryClient.getQueryData(queryKey);
    const nextOrganizer = removeOrganizerRows(previousOrganizer, rows);
    if (nextOrganizer) {
      queryClient.setQueryData(queryKey, nextOrganizer);
      focusFirstAvailableResult(nextOrganizer);
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      queryClient.invalidateQueries({ queryKey: QK.stats });
    }

    try {
      await api.organizer.delete({
        item_ids: rows.filter((row) => row.rawType !== 'extra').map((row) => row.itemId),
        extra_ids: rows.filter((row) => row.rawType === 'extra').map((row) => row.itemId),
        mode,
      });
      await refreshOrganizer();
      const count = rows.length;
      const toastKey = count === 1
        ? (mode === 'ignore' ? 'organizer.toasts.deleteIgnoreSuccess' : mode === 'trash' ? 'organizer.toasts.deleteTrashSuccess' : 'organizer.toasts.deleteDbOnlySuccess')
        : (mode === 'ignore' ? 'organizer.toasts.deleteIgnoreSuccessPlural' : mode === 'trash' ? 'organizer.toasts.deleteTrashSuccessPlural' : 'organizer.toasts.deleteDbOnlySuccessPlural');
      toast(t(toastKey).replace('{count}', count), 'success');
    } catch (error) {
      if (previousOrganizer) {
        queryClient.setQueryData(queryKey, previousOrganizer);
        focusFirstAvailableResult(previousOrganizer);
      }
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      queryClient.invalidateQueries({ queryKey: QK.stats });
      throw error;
    }
  }, [closeModal, clearSelectedRows, queryClient, focusFirstAvailableResult, refreshOrganizer, toast, t, queryKey, addPendingResolvedIds]);

  return {
    refreshOrganizer,
    handleResolveOrganizerRow,
    handleResolveOrganizerRows,
    handleDeleteOrganizerRow,
    handleDeleteOrganizerRows,
  };
}

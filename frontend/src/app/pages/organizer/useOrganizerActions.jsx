import { useRef, useState } from 'react';
import { useRenameMutation, getOrganizerQueryKey, useScanRetryMutation } from '../../queries';
import { QK } from '../../lib/queryKeys';
import { useOrganizerRename } from './hooks/useOrganizerRename';
import { useOrganizerScan } from './hooks/useOrganizerScan';

export function useOrganizerActions({
  defaultScanDir,
  organizerCountQuery,
  organizerQuery,
  isScanActive,
  onResultsReady,
  queryClient,
  t,
  toast,
  openModal,
  closeModal,
  sortedRows,
  modeVisibleMatchedItems,
  modeVisibleExtrasForRename,
  scanStatusQuery,
  scanMode,
  sessionMode,
  includeAdult,
  provider,
  settings,
}) {
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isRenamePending, setIsRenamePending] = useState(false);
  const renameStartedRef = useRef(false);
  const renameMutation = useRenameMutation();
  const retryMutation = useScanRetryMutation();

  const handleRetryMatch = async () => {
    if (isScanActive) {
      return;
    }

    try {
      const response = await retryMutation.mutateAsync({
        mode: scanMode,
        include_adult: includeAdult,
        provider: provider,
      });

      if (response?.status === 'error') {
        throw new Error(response.message);
      }

      queryClient.invalidateQueries({ queryKey: ['scan-status'] });
      queryClient.invalidateQueries({ queryKey: QK.organizer });
      queryClient.invalidateQueries({ queryKey: QK.organizerCount });
      toast(t('organizer.toasts.retryStarted') || 'Retrying match process...', 'success');
    } catch (error) {
      toast(error.message || t('organizer.toasts.retryFailed') || 'Failed to start retry.', 'danger');
    }
  };

  const {
    handleScanPaths,
    handleBrowseAndScan,
    isBrowseStarting,
  } = useOrganizerScan({
    defaultScanDir,
    organizerQuery,
    isScanActive,
    onResultsReady,
    queryClient,
    t,
    toast,
    scanStatusQuery,
    renameStartedRef,
    setIsRenamePending,
    scanMode,
    sessionMode,
    includeAdult,
    provider,
  });

  const { handleRename, isRenameStarting } = useOrganizerRename({
    organizerQuery,
    sortedRows,
    modeVisibleMatchedItems,
    modeVisibleExtrasForRename,
    scanStatusQuery,
    renameMutation,
    queryClient,
    renameStartedRef,
    setIsRenamePending,
    t,
    toast,
    openModal,
    closeModal,
    settings,
  });

  const handleLoadAll = async () => {
    if (isLoadingAll) {
      return;
    }

    setIsLoadingAll(true);
    try {
      const result = await organizerQuery.refetch();
      if (result.data) {
        queryClient.setQueryData(getOrganizerQueryKey(scanMode, sessionMode), result.data);
        onResultsReady?.(result.data);
      }
      await organizerCountQuery.refetch();
      toast(t('organizer.toasts.loadAllSuccess'), 'success');
    } finally {
      setIsLoadingAll(false);
    }
  };

  return {
    handleBrowseAndScan,
    handleLoadAll,
    handleRename,
    handleScanPaths,
    handleRetryMatch,
    isBrowseStarting,
    isLoadingAll,
    isRenamePending,
    isRenameStarting,
    isRetryPending: retryMutation.isPending,
  };
}

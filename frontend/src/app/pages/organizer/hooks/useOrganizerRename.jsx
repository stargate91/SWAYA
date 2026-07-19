import { useState } from 'react';
import { Sparkles } from '@/ui/icons';
import Button from '../../../ui/Button';
import { QK } from '@/lib/queryKeys';
import OrganizerRenameModalContent from '../OrganizerRenameModalContent.jsx';
import { mapOrganizerItemRow, mapExtraRow } from '../organizerMappers';
import api from '../../../lib/api';

export function useOrganizerRename({
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
}) {
  const [isRenameStarting, setIsRenameStarting] = useState(false);

  const handleRename = async (organizeInPlaceDefault = false) => {
    const scanStatus = scanStatusQuery?.data || null;
    const isScanActive = Boolean(scanStatus?.active);
    const scanPhase = scanStatus?.phase || '';

    if (isRenameStarting || (isScanActive && scanPhase === 'organizing')) {
      return;
    }

    const matchedItems = modeVisibleMatchedItems || [];
    const matchedExtras = modeVisibleExtrasForRename || [];

    if (matchedItems.length === 0) {
      toast(t('organizer.toasts.noMatchedItems'), 'danger');
      return;
    }

    const mappedItems = [
      ...matchedItems.map((item) => mapOrganizerItemRow(item, t)),
      ...matchedExtras.map((extra) => mapExtraRow(extra, t)),
    ];

    const executeRename = async (organizeInPlaceVal) => {
      closeModal();
      setIsRenameStarting(true);
      const previousScanStatus = queryClient.getQueryData(['scan-status']);
      try {
        const ids = matchedItems.map((item) => item.id);
        if (renameStartedRef) {
          renameStartedRef.current = true;
        }
        setIsRenamePending(true);

        // Pause/stop active background task first to avoid locks/conflicts
        const currentStatus = await api.scan.getStatus();
        if (currentStatus?.active && currentStatus?.phase !== 'organizing') {
          toast(t('organizer.toasts.pausingBackgroundTask') || 'Pausing background tasks...', 'info');
          await api.task.stop();

          let stopped = false;
          for (let i = 0; i < 30; i++) {
            const checkStatus = await api.scan.getStatus();
            if (!checkStatus?.active) {
              stopped = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          if (!stopped) {
            throw new Error(t('organizer.toasts.failedToPauseTask') || 'Failed to stop active background task.');
          }
        }

        queryClient.setQueryData(['scan-status'], (current) => ({
          ...(current || {}),
          active: true,
          phase: 'organizing',
          current: 0,
          total: ids.length,
          start_time: Math.floor(Date.now() / 1000),
          can_stop: true,
          stop_requested: false,
          current_file_progress: 0,
        }));
        const response = await renameMutation.mutateAsync({
          item_ids: ids,
          organize_in_place: organizeInPlaceVal
        });
        if (response?.status === 'error') {
          throw new Error(response.message);
        }
        queryClient.invalidateQueries({ queryKey: ['history'] });
        queryClient.invalidateQueries({ queryKey: QK.library });
      } catch (error) {
        queryClient.setQueryData(['scan-status'], previousScanStatus || null);
        if (renameStartedRef) {
          renameStartedRef.current = false;
        }
        setIsRenamePending(false);
        toast(error.message || t('organizer.toasts.renameStartFailed'), 'danger');
      } finally {
        setIsRenameStarting(false);
      }
    };

    const showModal = (organizeInPlaceVal) => {
      openModal({
        title: t('organizer.renameModal.title') || 'Confirm Rename',
        description: t('organizer.renameModal.description') || 'Review the files that will be renamed.',
        icon: Sparkles,
        className: 'ui-modal--extra-wide',
        content: (
          <OrganizerRenameModalContent
            items={mappedItems}
            t={t}
            organizeInPlace={organizeInPlaceVal}
            setOrganizeInPlace={showModal}
          />
        ),
        footer: (
          <>
            <Button variant="secondary-neutral" onClick={closeModal}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" onClick={() => executeRename(organizeInPlaceVal)}>
              {organizeInPlaceVal
                ? (t('organizer.renameModal.organizeInPlace') || 'Organize in Place')
                : (t('organizer.actions.rename') || 'Rename')}
            </Button>
          </>
        ),
      });
    };

    const defaultInPlace = organizeInPlaceDefault || (settings?.folder_organization_enabled === false);
    if (organizeInPlaceDefault) {
      executeRename(true);
    } else {
      showModal(defaultInPlace);
    }
  };

  return {
    handleRename,
    isRenameStarting,
  };
}

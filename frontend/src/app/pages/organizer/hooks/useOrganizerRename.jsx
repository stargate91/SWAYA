import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Button from '../../../ui/Button';
import OrganizerRenameModalContent from '../OrganizerRenameModalContent.jsx';
import { mapOrganizerItemRow, mapExtraRow } from '../organizerMappers';

const EMPTY_ORGANIZER = {
  manual: [],
  movies: [],
  tv: [],
  extras: [],
  collisions: [],
};

export function useOrganizerRename({
  organizerQuery,
  sortedRows,
  isScanActive,
  renameMutation,
  queryClient,
  renameStartedRef,
  t,
  toast,
  openModal,
  closeModal,
}) {
  const [isRenameStarting, setIsRenameStarting] = useState(false);

  const handleRename = async () => {
    if (isRenameStarting || isScanActive) {
      return;
    }

    const currentOrganizer = organizerQuery.data || EMPTY_ORGANIZER;
    const allItems = [
      ...(currentOrganizer.manual || []),
      ...(currentOrganizer.movies || []),
      ...(currentOrganizer.tv || []),
      ...(currentOrganizer.collisions || []),
    ];
    const organizerItemsById = new Map(allItems.map((item) => [item.id, item]));

    const visibleMatchedItemIds = new Set();
    const visibleExtraIds = new Set();

    (sortedRows || []).forEach((row) => {
      if (row.rawType === 'extra') {
        if (String(row.parentStatus || '').toLowerCase() === 'matched' && row.parent_id) {
          visibleMatchedItemIds.add(row.parent_id);
          visibleExtraIds.add(row.itemId);
        }
        return;
      }

      if (row.rawStatus === 'matched') {
        visibleMatchedItemIds.add(row.itemId);
      }
    });

    const matchedItems = [...visibleMatchedItemIds]
      .map((itemId) => organizerItemsById.get(itemId))
      .filter(Boolean);

    if (matchedItems.length === 0) {
      toast(t('organizer.toasts.noMatchedItems'), 'danger');
      return;
    }

    const matchedItemIds = new Set(matchedItems.map((item) => item.id));
    const matchedExtras = (currentOrganizer.extras || []).filter((extra) => {
      const parentId = extra.parent_id || extra.parent_item_id;
      const extraId = extra.id;
      const parentIsMatched = matchedItemIds.has(parentId);
      const isShownExtra = visibleExtraIds.size === 0 || visibleExtraIds.has(extraId);
      return parentIsMatched && isShownExtra;
    });

    const mappedItems = [
      ...matchedItems.map((item) => mapOrganizerItemRow(item, t)),
      ...matchedExtras.map((extra) => mapExtraRow(extra, t)),
    ];

    const executeRename = async () => {
      closeModal();
      setIsRenameStarting(true);
      try {
        const ids = matchedItems.map((item) => item.id);
        if (renameStartedRef) {
          renameStartedRef.current = true;
        }
        await renameMutation.mutateAsync({ item_ids: ids });
        queryClient.invalidateQueries({ queryKey: ['scan-status'] });
      } catch (error) {
        if (renameStartedRef) {
          renameStartedRef.current = false;
        }
        toast(error.message || t('organizer.toasts.renameStartFailed'), 'danger');
      } finally {
        setIsRenameStarting(false);
      }
    };

    openModal({
      title: t('organizer.renameModal.title') || 'Confirm Rename',
      description: t('organizer.renameModal.description') || 'Review the files that will be renamed.',
      icon: Sparkles,
      className: 'ui-modal--extra-wide',
      content: (
        <OrganizerRenameModalContent
          items={mappedItems}
          t={t}
        />
      ),
      footer: (
        <>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('organizer.details.delete.cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" onClick={executeRename}>
            {t('organizer.actions.rename') || 'Rename'}
          </Button>
        </>
      ),
    });
  };

  return {
    handleRename,
    isRenameStarting,
  };
}

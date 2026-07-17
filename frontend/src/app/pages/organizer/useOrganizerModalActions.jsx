import { useMemo, useCallback } from 'react';
import { FolderOpen, Play, Search, Sliders, Trash2, X, EyeOff, FileJson } from '@/ui/icons';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import FloatingActionBar from '../../ui/FloatingActionBar';
import OrganizerMatchModalContent from './OrganizerMatchModalContent';
import OrganizerOverrideModalContent from './components/OrganizerOverrideModalContent';
import OrganizerBulkOverrideModalContent from './components/OrganizerBulkOverrideModalContent';
import api from '../../lib/api';
import { showItemInFolder } from '../../lib/ipc';
import { useUi } from '@/providers/UiProvider';
import { useTranslation } from '../../providers/LanguageContext';
import { useOrganizerDeleteActions } from './useOrganizerDeleteActions';
import { useSettingsQuery } from '../../queries';
import { mapOrganizerTypeLabel } from './organizerMappers';
import modalStyles from '../../ui/Modal.module.css';
import styles from './MatchModal.module.css';

export function useOrganizerModalActions({
  focusFirstAvailableResult,
  clearSelectedRows,
  dismissRows,
  selectedRows,
  scanMode,
  sessionMode,
  provider,
  addPendingResolvedIds,
  removePendingResolvedIds,
}) {
  const { t } = useTranslation();
  const { closeModal, openModal, toast } = useUi();
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data;

  const {
    refreshOrganizer,
    handleResolveOrganizerRows,
    handleDeleteOrganizerRow,
    handleDeleteOrganizerRows,
  } = useOrganizerDeleteActions({
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
  });

  const isPlayableOrganizerRow = useCallback((row) => {
    if (!row?.sourcePath) {
      return false;
    }
    if (row.rawType === 'extra') {
      return String(row.rawPayload?.category || '').toLowerCase() === 'video';
    }
    return true;
  }, []);

  const handlePreviewRow = useCallback(async (row) => {
    const preferredPlayer = settings?.preferred_player || 'swaya';
    let ipcRenderer = null;
    try {
      if (window.require) {
        ipcRenderer = window.require('electron').ipcRenderer;
      }
    } catch (err) {
      console.error(err);
    }

    if (preferredPlayer === 'swaya' && ipcRenderer) {
      const savedVolume = parseInt(localStorage.getItem('player_volume'), 10);
      const savedMute = localStorage.getItem('player_mute') === 'true';
      await ipcRenderer.invoke('mpv-open-fullscreen', {
        url: row.sourcePath,
        title: row.sourceName || row.name || 'Preview',
        volume: isNaN(savedVolume) ? undefined : savedVolume,
        mute: savedMute,
      });
    } else {
      if (!settings?.vlc_path && !settings?.mpc_path) {
        throw new Error(t('organizer.toasts.noMediaPlayerConfigured'));
      }
      await api.media.preview(row.sourcePath);
    }
  }, [settings, t]);

  const openDeleteModal = useCallback((row) => {
    const isExtra = row.rawType === 'extra';
    const actionCards = [
      !isExtra ? {
        key: 'ignore',
        label: t('organizer.details.delete.ignore.label'),
        description: t('organizer.details.delete.ignore.description'),
      } : null,
      {
        key: 'db_only',
        label: t('organizer.details.delete.dbOnly.label'),
        description: t(isExtra ? 'organizer.details.delete.dbOnly.descriptionExtra' : 'organizer.details.delete.dbOnly.descriptionMedia'),
      },
      {
        key: 'trash',
        label: t('organizer.details.delete.trash.label'),
        description: t(isExtra ? 'organizer.details.delete.trash.descriptionExtra' : 'organizer.details.delete.trash.descriptionMedia'),
        className: modalStyles['action-card--danger'],
      },
    ].filter(Boolean);

    openModal({
      title: t('organizer.details.delete.title'),
      description: t(isExtra ? 'organizer.details.delete.descriptionExtra' : 'organizer.details.delete.descriptionMedia'),
      icon: Trash2,
      variant: 'danger',
      content: (
        <div className={modalStyles['actions-list']}>
          {actionCards.map((action) => (
            <button
              key={action.key}
              type="button"
              className={`${modalStyles['action-card']} ${action.className || ''}`.trim()}
              onClick={() => {
                handleDeleteOrganizerRow(row, action.key).catch((error) => {
                  toast(error.message || t('organizer.toasts.deleteActionFailed'), 'danger');
                });
              }}
            >
              <div className={modalStyles['action-copy']}>
                <strong className={modalStyles['action-title']}>{action.label}</strong>
                <span className={modalStyles['action-description']}>{action.description}</span>
              </div>
            </button>
          ))}
        </div>
      ),
      footer: (
        <Button variant="secondary-neutral" onClick={closeModal}>
          {t('common.cancel')}
        </Button>
      ),
    });
  }, [closeModal, handleDeleteOrganizerRow, openModal, t, toast]);

  const openBulkDeleteModal = (rows) => {
    const hasExtras = rows.some((row) => row.rawType === 'extra');
    const hasMedia = rows.some((row) => row.rawType !== 'extra');
    const actionCards = [
      hasMedia ? {
        key: 'ignore',
        label: t('organizer.details.delete.ignore.label'),
        description: t('organizer.details.delete.ignore.description'),
      } : null,
      {
        key: 'db_only',
        label: t('organizer.details.delete.dbOnly.label'),
        description: hasMedia && hasExtras
          ? t('organizer.details.bulkDelete.dbOnly.descriptionMixed')
          : hasExtras
            ? t('organizer.details.bulkDelete.dbOnly.descriptionExtra')
            : t('organizer.details.bulkDelete.dbOnly.descriptionMedia'),
      },
      {
        key: 'trash',
        label: t('organizer.details.delete.trash.label'),
        description: hasMedia && hasExtras
          ? t('organizer.details.bulkDelete.trash.descriptionMixed')
          : hasExtras
            ? t('organizer.details.bulkDelete.trash.descriptionExtra')
            : t('organizer.details.bulkDelete.trash.descriptionMedia'),
        className: modalStyles['action-card--danger'],
      },
    ].filter(Boolean);

    openModal({
      title: t('organizer.details.bulkDelete.title'),
      description: t('organizer.details.bulkDelete.description').replace('{count}', String(rows.length)),
      icon: Trash2,
      variant: 'danger',
      content: (
        <div className={modalStyles['actions-list']}>
          {actionCards.map((action) => (
            <button
              key={action.key}
              type="button"
              className={`${modalStyles['action-card']} ${action.className || ''}`.trim()}
              onClick={() => {
                handleDeleteOrganizerRows(rows, action.key).catch((error) => {
                  toast(error.message || t('organizer.toasts.deleteActionFailed'), 'danger');
                });
              }}
            >
              <div className={modalStyles['action-copy']}>
                <strong className={modalStyles['action-title']}>{action.label}</strong>
                <span className={modalStyles['action-description']}>{action.description}</span>
              </div>
            </button>
          ))}
        </div>
      ),
      footer: (
        <Button variant="secondary-neutral" onClick={closeModal}>
          {t('common.cancel')}
        </Button>
      ),
    });
  };

  const openMatchModal = useCallback((row, rows = null) => {
    const targetRows = rows || [row];
    const isBulk = targetRows.length > 1;
    openModal({
      title: isBulk
        ? t('organizer.details.matchModal.titleBulk') || 'Match Selected Items'
        : t('organizer.details.matchModal.title'),
      description: isBulk
        ? t('organizer.details.matchModal.descriptionBulk') || 'Search and apply a match for the selected items.'
        : t('organizer.details.matchModal.description'),
      className: 'ui-modal--wide',
      icon: Search,
      content: (
        <OrganizerMatchModalContent
          row={row}
          rows={targetRows}
          t={t}
          toast={toast}
          scanMode={scanMode}
          onResolved={(performMutationFn) =>
            handleResolveOrganizerRows(targetRows, performMutationFn)
          }
        />
      ),
      footer: (
        <Button variant="secondary-neutral" onClick={closeModal}>
          {t('common.cancel')}
        </Button>
      ),
    });
  }, [closeModal, handleResolveOrganizerRows, openModal, scanMode, t, toast]);

  const openOverrideModal = useCallback((row) => {
    openModal({
      title: t('organizer.overrideModal.title').replace('{type}', mapOrganizerTypeLabel(row.rawType, t) || ''),
      description: t('organizer.overrideModal.description'),
      icon: Sliders,
      content: (
        <OrganizerOverrideModalContent
          row={row}
          onClose={closeModal}
          toast={toast}
          api={api}
          scanMode={scanMode}
          sessionMode={sessionMode}
        />
      ),
      footer: (
        <>
          <Button variant="secondary-neutral" type="button" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="organizer-override-form">
            {t('organizer.overrideModal.apply')}
          </Button>
        </>
      ),
    });
  }, [closeModal, openModal, scanMode, sessionMode, t, toast]);

  const openBulkOverrideModal = (rows) => {
    const type = rows[0]?.rawType || '';
    openModal({
      title: (t('organizer.overrideModal.titleBulk') || 'Bulk Override {type}s').replace('{type}', mapOrganizerTypeLabel(type, t)),
      description: t('organizer.overrideModal.descriptionBulk') || 'Apply settings or numberings to all selected items.',
      icon: Sliders,
      className: 'ui-modal--bulk-override',
      content: (
        <OrganizerBulkOverrideModalContent
          rows={rows}
          onClose={closeModal}
          toast={toast}
          scanMode={scanMode}
          sessionMode={sessionMode}
        />
      ),
      footer: (
        <>
          <Button variant="secondary-neutral" type="button" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="organizer-bulk-override-form">
            {t('organizer.overrideModal.applyBulk')}
          </Button>
        </>
      ),
    });
  };

  const openInspectModal = useCallback((row) => {
    const buildInspectPayload = async () => {
      if (!row) {
        return '';
      }

      if (row.rawType === 'extra') {
        return JSON.stringify({
          kind: 'extra',
          summary: {
            id: row.itemId,
            source: row.source,
            target: row.target,
            source_path: row.sourcePath,
            target_path: row.targetPath,
          },
          organizer: row.rawPayload,
        }, null, 2);
      }

      try {
        const metadata = await api.metadata.getItemFullMetadata(row.itemId);
        return JSON.stringify({
          kind: row.rawType,
          summary: {
            id: row.itemId,
            source: row.source,
            target: row.target,
            source_path: row.sourcePath,
            target_path: row.targetPath,
            status: row.rawStatus,
            action: row.rawAction || null,
            has_collision: row.hasCollision,
          },
          organizer: row.rawPayload,
          metadata,
        }, null, 2);
      } catch (err) {
        console.error(err);
        return JSON.stringify({
          kind: row.rawType,
          summary: {
            id: row.itemId,
            source: row.source,
            target: row.target,
            source_path: row.sourcePath,
            target_path: row.targetPath,
            status: row.rawStatus,
            action: row.rawAction || null,
            has_collision: row.hasCollision,
          },
          organizer: row.rawPayload,
          error: err.message || String(err),
        }, null, 2);
      }
    };

    const handleOpen = async () => {
      try {
        const inspectJson = await buildInspectPayload();

        const handleCopyInspect = async () => {
          try {
            await navigator.clipboard.writeText(inspectJson);
            toast(t('organizer.toasts.inspectCopySuccess') || 'Inspect payload copied', 'success');
          } catch {
            toast(t('organizer.toasts.inspectCopyFailed') || 'Copy failed', 'danger');
          }
        };

        const handleDownloadInspect = () => {
          const blob = new Blob([inspectJson], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `${row.source || 'organizer-item'}.json`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        };

        openModal({
          title: t('organizer.details.inspect.title') || 'Inspect Item Data',
          description: t('organizer.details.inspect.description') || 'Raw database state and metadata payload',
          icon: FileJson,
          variant: 'wide',
          content: (
            <Card variant="soft" padding="lg">
              <pre className={`u-font-mono u-text-2xs u-pre-wrap u-overflow-auto u-max-h-60vh ${styles['inspect-pre']}`}>
                {inspectJson}
              </pre>
            </Card>
          ),
          footer: (
            <>
              <Button type="button" variant="secondary-neutral" onClick={handleCopyInspect}>
                {t('organizer.details.inspect.copy') || 'Copy JSON'}
              </Button>
              <Button type="button" variant="secondary-neutral" onClick={handleDownloadInspect}>
                {t('organizer.details.inspect.download') || 'Download'}
              </Button>
              <Button variant="secondary-neutral" onClick={closeModal}>
                {t('common.close') || 'Close'}
              </Button>
            </>
          ),
        });
      } catch (error) {
        toast(error.message || t('organizer.toasts.inspectLoadFailed') || 'Load failed', 'danger');
      }
    };

    handleOpen();
  }, [closeModal, openModal, toast, t]);

  const rowActions = useMemo(() => [
    {
      key: 'match',
      label: t('organizer.actions.match'),
      icon: Search,
      isVisible: (row) => row.rawType !== 'extra',
      onClick: (row) => openMatchModal(row),
    },
    {
      key: 'override',
      label: t('organizer.actions.override'),
      icon: Sliders,
      onClick: (row) => openOverrideModal(row),
    },
    {
      key: 'inspect',
      label: t('organizer.details.inspect.open') || 'Inspect',
      icon: FileJson,
      onClick: (row) => openInspectModal(row),
    },
    {
      key: 'preview',
      label: t('organizer.actions.preview'),
      icon: Play,
      isVisible: isPlayableOrganizerRow,
      onClick: async (row) => {
        try {
          await handlePreviewRow(row);
        } catch (error) {
          toast(error.message || t('organizer.toasts.previewFailed'), 'danger');
        }
      },
    },
    {
      key: 'show-in-folder',
      label: t('organizer.actions.showInFolder'),
      icon: FolderOpen,
      onClick: async (row) => {
        const result = await showItemInFolder(row.sourcePath);
        if (!result?.success) {
          toast(result?.error || t('organizer.toasts.showInFolderFailed'), 'danger');
        }
      },
    },
    {
      key: 'dismiss',
      label: t('organizer.actions.dismiss'),
      icon: EyeOff,
      isVisible: (row) => row.rawType !== 'extra',
      onClick: (row) => dismissRows([row.id]),
    },
    {
      key: 'delete',
      label: t('organizer.details.delete.title'),
      tooltip: t('common.delete'),
      icon: Trash2,
      className: 'is-danger',
      onClick: (row) => openDeleteModal(row),
    },
  ], [
    t,
    dismissRows,
    openMatchModal,
    openOverrideModal,
    openInspectModal,
    openDeleteModal,
    isPlayableOrganizerRow,
    handlePreviewRow,
    toast,
  ]);

  const bulkActionBar = (
    <FloatingActionBar
      visible={selectedRows.length > 0}
      title={t('organizer.bulkBar.title').replace('{count}', String(selectedRows.length))}
      actions={[
        !selectedRows.some((row) => row.rawType === 'extra') ? {
          key: 'dismiss',
          label: t('common.remove'),
          icon: EyeOff,
          onClick: () => {
            dismissRows(selectedRows.map((r) => r.id));
            clearSelectedRows();
          },
          disabled: selectedRows.length === 0,
        } : null,
        {
          key: 'delete',
          label: t('common.delete'),
          icon: Trash2,
          variant: 'danger',
          onClick: () => openBulkDeleteModal(selectedRows),
          disabled: selectedRows.length === 0,
        },
        (!selectedRows.some((row) => row.rawType === 'extra') && scanMode !== 'scenes' && provider !== 'porndb') ? {
          key: 'match',
          label: t('organizer.actions.match') || 'Match',
          icon: Search,
          onClick: () => openMatchModal(null, selectedRows),
          disabled: selectedRows.length === 0,
        } : null,

        selectedRows.length > 0 && selectedRows.every((r) => r.rawType === selectedRows[0].rawType) ? {
          key: 'override',
          label: t('organizer.actions.override') || 'Override',
          icon: Sliders,
          onClick: () => openBulkOverrideModal(selectedRows),
        } : null,
        {
          key: 'clear',
          label: t('organizer.bulkBar.clear'),
          icon: X,
          onClick: clearSelectedRows,
          disabled: selectedRows.length === 0,
        },
      ].filter(Boolean)}
    />
  );

  return {
    openDeleteModal,
    openBulkDeleteModal,
    openMatchModal,
    openOverrideModal,
    openBulkOverrideModal,
    openInspectModal,
    rowActions,
    bulkActionBar,
    refreshOrganizer,
  };
}


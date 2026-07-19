import { createPortal } from 'react-dom';
import Page from '@/ui/Page';
import Button from '@/ui/Button';
import PageHeader from '@/ui/PageHeader';
import SegmentedControl from '@/ui/SegmentedControl';
import Lightbox from '@/ui/Lightbox';
import { AlertTriangle } from '@/ui/icons';
import RenameHistoryList from './components/RenameHistoryList';
import WatchedHistoryList from './components/WatchedHistoryList';
import PeaksHistoryList from './components/PeaksHistoryList';
import styles from './HistoryPage.module.css';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import useHistoryPage from './hooks/useHistoryPage';

export default function HistoryPage() {
  const {
    t,
    openModal,
    closeModal,
    activeTab,
    setActiveTab,
    lightboxImage,
    setLightboxImage,
    sessionMode,
    history,
    isHistoryLoading,
    hasNextHistoryPage,
    isFetchingNextHistoryPage,
    historySentinelRef,
    isAnyTaskActive,
    isUndoing,
    revertingBatchIds,
    watchedHistory,
    isWatchedLoading,
    hasNextWatchedPage,
    isFetchingNextWatchedPage,
    watchedSentinelRef,
    playMutation,
    peaksData,
    isPeaksLoading,
    handlePlayMoment,
    handlePlay,
    triggerUndo,
  } = useHistoryPage();

  const utilityBarTarget = typeof document !== 'undefined' ? document.getElementById('page-bar-top-center') : null;

  const handleConfirmUndo = (batch) => {
    openModal({
      title: t('historyPage.confirmTitle') || 'Confirm Action Reversion',
      description: t('historyPage.confirmDesc') || 'This will physically move and rename all successfully organized files back to their previous naming scheme and folders.',
      icon: AlertTriangle,
      content: (
        <Stack gap="md" style={{ padding: 'var(--space-sm) 0' }}>
          <Text variant="body" color="primary" style={{ display: 'block', marginBottom: 'var(--space-lg)' }}>
            {t('historyPage.confirmWarning') || 'Are you sure you want to revert this batch?'}
          </Text>
          <Stack gap="sm" style={{ background: 'var(--ui-surface-soft)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
            <Inline align="center" justify="between">
              <Text variant="small" color="secondary">{t('historyPage.batchLabel') || 'Batch:'}</Text>
              <Text variant="small" color="primary" weight="semibold">{batch.name}</Text>
            </Inline>
            <Inline align="center" justify="between">
              <Text variant="small" color="secondary">{t('historyPage.filesLabel') || 'Files:'}</Text>
              <Text variant="small" weight="bold" style={{ color: 'var(--color-state-success)' }}>
                {t('historyPage.succeededCount', { defaultValue: '{{count}} succeeded', count: batch.success_count })}
              </Text>
            </Inline>
          </Stack>
        </Stack>
      ),
      footer: (
        <Inline gap="md" align="center" justify="end" fullWidth>
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              closeModal();
              triggerUndo(batch.id);
            }}
          >
            {t('historyPage.confirmButton') || 'Revert Action'}
          </Button>
        </Inline>
      ),
    });
  };

  const tabOptions = [
    { value: 'rename', label: t('historyPage.tabRename') || 'Rename Logs' },
    { value: 'watched', label: t('historyPage.tabWatched') || 'Playback Logs' }
  ];
  if (sessionMode === 'nsfw') {
    tabOptions.push({ value: 'peaks', label: 'Finish Logs' });
  }

  const getPageTitle = () => {
    if (activeTab === 'rename') return t('historyPage.pageTitle') || 'Rename history';
    if (activeTab === 'watched') return t('historyPage.watchedPageTitle') || 'Watched History';
    return 'Finishes';
  };

  const getPageDesc = () => {
    if (activeTab === 'rename') return t('historyPage.pageDesc') || 'Review and revert past physical organization and renaming actions.';
    if (activeTab === 'watched') return t('historyPage.watchedPageDesc') || 'See recently watched items and playback activity.';
    return 'Moments you marked with the finish button during NSFW playback.';
  };

  const renderActiveContent = () => {
    if (activeTab === 'rename') {
      return (
        <RenameHistoryList
          isLoading={isHistoryLoading}
          history={history}
          hasNextPage={hasNextHistoryPage}
          isFetchingNextPage={isFetchingNextHistoryPage}
          sentinelRef={historySentinelRef}
          isAnyTaskActive={isAnyTaskActive}
          isUndoing={isUndoing}
          revertingBatchIds={revertingBatchIds}
          onConfirmUndo={handleConfirmUndo}
          t={t}
        />
      );
    }
    if (activeTab === 'watched') {
      return (
        <WatchedHistoryList
          isLoading={isWatchedLoading}
          watchedHistory={watchedHistory}
          hasNextPage={hasNextWatchedPage}
          isFetchingNextPage={isFetchingNextWatchedPage}
          sentinelRef={watchedSentinelRef}
          playMutation={playMutation}
          handlePlay={handlePlay}
          t={t}
        />
      );
    }
    if (activeTab === 'peaks') {
      return (
        <PeaksHistoryList
          isLoading={isPeaksLoading}
          peaksData={peaksData}
          playMutation={playMutation}
          handlePlayMoment={handlePlayMoment}
          setLightboxImage={setLightboxImage}
          t={t}
        />
      );
    }
    return null;
  };

  return (
    <Page>
      {utilityBarTarget && createPortal(
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={tabOptions}
          size="sm"
          animated={true}
        />,
        utilityBarTarget
      )}
      <div className={styles['history-page']}>
        <PageHeader
          title={getPageTitle()}
          description={getPageDesc()}
        />

        {renderActiveContent()}
      </div>
      {lightboxImage && (
        <Lightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
          t={t}
        />
      )}
    </Page>
  );
}

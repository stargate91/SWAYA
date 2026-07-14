/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePreservedState } from '@/hooks/usePreservedState';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import Page from '@/ui/Page';
import Button from '@/ui/Button';
import PageHeader from '@/ui/PageHeader';
import SegmentedControl from '@/ui/SegmentedControl';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import Lightbox from '@/ui/Lightbox';
import { useHistoryQuery, useUndoMutation, useScanStatusQuery, useWatchedHistoryQuery, usePlayMediaMutation, usePeaksQuery } from '@/queries';
import { AlertTriangle } from '@/ui/icons';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import RenameHistoryList from './components/RenameHistoryList';
import WatchedHistoryList from './components/WatchedHistoryList';
import PeaksHistoryList from './components/PeaksHistoryList';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const { t } = useTranslation();
  const { openModal, closeModal, toast } = useUi();
  const [activeTab, setActiveTab] = usePreservedState('activeTab', 'rename');
  const [lightboxImage, setLightboxImage] = useState(null);
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  useScrollRestoration('.shell__content', [activeTab]);
  const navigate = useNavigate();
  const utilityBarTarget = typeof document !== 'undefined' ? document.getElementById('shell-utility-bar-center') : null;

  useEffect(() => {
    if (sessionMode !== 'nsfw' && activeTab === 'peaks') {
      navigate('/dashboard');
    }
  }, [sessionMode, activeTab, navigate]);

  // Rename History
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    fetchNextPage: fetchNextHistoryPage,
    hasNextPage: hasNextHistoryPage,
    isFetchingNextPage: isFetchingNextHistoryPage,
  } = useHistoryQuery();
  const history = historyData?.pages.flatMap((page) => Array.isArray(page) ? page : (page?.items || [])) || [];

  const { data: scanStatus } = useScanStatusQuery();
  const undoMutation = useUndoMutation();
  const [revertingBatchIds, setRevertingBatchIds] = useState(new Set());

  const isAnyTaskActive = scanStatus?.active;
  const isUndoing = scanStatus?.active && scanStatus?.phase === 'undoing';

  // Playback History
  const {
    data: watchedHistoryData,
    isLoading: isWatchedLoading,
    fetchNextPage: fetchNextWatchedPage,
    hasNextPage: hasNextWatchedPage,
    isFetchingNextPage: isFetchingNextWatchedPage,
  } = useWatchedHistoryQuery();
  const watchedHistory = watchedHistoryData?.pages.flatMap((page) => Array.isArray(page) ? page : (page?.items || [])) || [];

  const playMutation = usePlayMediaMutation();

  // Peak Moments History
  const { data: peaksData = [], isLoading: isPeaksLoading } = usePeaksQuery();

  const handlePlayMoment = (itemId, videoPosition) => {
    playMutation.mutate({ itemId, start: videoPosition });
  };

  const historySentinelRef = useInfiniteScroll({
    onIntersect: fetchNextHistoryPage,
    enabled: hasNextHistoryPage && !isFetchingNextHistoryPage && activeTab === 'rename',
    root: '.shell__content',
  });

  const watchedSentinelRef = useInfiniteScroll({
    onIntersect: fetchNextWatchedPage,
    enabled: hasNextWatchedPage && !isFetchingNextWatchedPage && activeTab === 'watched',
    root: '.shell__content',
  });

  const handleConfirmUndo = (batch) => {
    openModal({
      title: t('historyPage.confirmTitle') || 'Confirm Action Reversion',
      description: t('historyPage.confirmDesc') || 'This will physically move and rename all successfully organized files back to their previous naming scheme and folders.',
      icon: AlertTriangle,
      content: (
        <div className="history-undo-modal">
          <p className="history-undo-modal__warning">
            {t('historyPage.confirmWarning') || 'Are you sure you want to revert this batch?'}
          </p>
          <div className="history-undo-modal__details">
            <div className="history-undo-modal__row">
              <span className="history-undo-modal__label">{t('historyPage.batchLabel') || 'Batch:'}</span>
              <span className="history-undo-modal__value">{batch.name}</span>
            </div>
            <div className="history-undo-modal__row">
              <span className="history-undo-modal__label">{t('historyPage.filesLabel') || 'Files:'}</span>
              <span className="history-undo-modal__value--success">
                {t('historyPage.succeededCount', { defaultValue: '{{count}} succeeded', count: batch.success_count })}
              </span>
            </div>
          </div>
        </div>
      ),
      footer: (
        <div className="history-undo-modal__footer">
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              closeModal();
              setRevertingBatchIds((prev) => {
                const next = new Set(prev);
                next.add(batch.id);
                return next;
              });
              undoMutation.mutate(batch.id, {
                onSuccess: () => {
                  toast(t('historyPage.toastStartedDesc') || 'Reverting batch in the background...', 'success');
                },
                onError: (err) => {
                  setRevertingBatchIds((prev) => {
                    const next = new Set(prev);
                    next.delete(batch.id);
                    return next;
                  });
                  toast(err?.message || t('historyPage.toastErrorDesc') || 'Could not launch undo operation.', 'danger');
                }
              });
            }}
          >
            {t('historyPage.confirmButton') || 'Revert Action'}
          </Button>
        </div>
      ),
    });
  };

  const handlePlay = (itemId) => {
    playMutation.mutate(itemId);
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

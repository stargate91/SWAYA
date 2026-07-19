import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreservedState } from '@/hooks/usePreservedState';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import {
  useHistoryQuery,
  useUndoMutation,
  useScanStatusQuery,
  useWatchedHistoryQuery,
  usePlayMediaMutation,
  usePeaksQuery
} from '@/queries';

export default function useHistoryPage() {
  const { t } = useTranslation();
  const { openModal, closeModal, toast } = useUi();
  const [activeTab, setActiveTab] = usePreservedState('activeTab', 'rename');
  const [lightboxImage, setLightboxImage] = useState(null);
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  useScrollRestoration('.shell__content', [activeTab]);
  const navigate = useNavigate();

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

  const handlePlay = (itemId) => {
    playMutation.mutate(itemId);
  };

  const triggerUndo = (batchId, onSuccessCallback, onErrorCallback) => {
    setRevertingBatchIds((prev) => {
      const next = new Set(prev);
      next.add(batchId);
      return next;
    });
    undoMutation.mutate(batchId, {
      onSuccess: () => {
        toast(t('historyPage.toastStartedDesc') || 'Reverting batch in the background...', 'success');
        if (onSuccessCallback) onSuccessCallback();
      },
      onError: (err) => {
        setRevertingBatchIds((prev) => {
          const next = new Set(prev);
          next.delete(batchId);
          return next;
        });
        toast(err?.message || t('historyPage.toastErrorDesc') || 'Could not launch undo operation.', 'danger');
        if (onErrorCallback) onErrorCallback();
      }
    });
  };

  return {
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
  };
}

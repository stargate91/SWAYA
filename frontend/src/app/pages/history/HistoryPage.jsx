/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePreservedState } from '@/hooks/usePreservedState';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import Page from '@/ui/Page';
import EmptyState from '@/ui/EmptyState';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import Skeleton from '@/ui/Skeleton';
import PageHeader from '@/ui/PageHeader';
import SegmentedControl from '@/ui/SegmentedControl';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import Lightbox from '@/ui/Lightbox';
import { useHistoryQuery, useUndoMutation, useScanStatusQuery, useWatchedHistoryQuery, usePlayMediaMutation, usePeaksQuery } from '@/queries';
import { RotateCcw, AlertTriangle, Play, CheckCircle2, Clock, ENTITY_ICONS, Droplets, Loader2 } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import HistoryCard from './components/HistoryCard';
import './HistoryPage.css';

const LPAR = '(';
const RPAR = ')';
const PERCENT = '%';
const DASH = ' - ';
const SLASH = ' / ';
const S_CHAR = 'S';
const E_CHAR = 'E';

const formatTime = (seconds) => {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  if (h > 0) {
    return `${h}:${mStr}:${sStr}`;
  }
  return `${m}:${sStr}`;
};

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

  const renderRenameContent = () => {
    if (isHistoryLoading) {
      return (
        <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} style={{ padding: 'var(--space-xl)', background: 'var(--color-panel-soft)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                <div style={{ width: '200px' }}><Skeleton style={{ height: '24px' }} variant="rect" /></div>
                <div style={{ width: '80px' }}><Skeleton style={{ height: '24px' }} variant="rect" /></div>
              </div>
              <Skeleton style={{ height: '16px', width: '60%', marginBottom: 'var(--space-sm)' }} variant="text" />
              <Skeleton style={{ height: '16px', width: '40%' }} variant="text" />
            </div>
          ))}
        </div>
      );
    }

    if (!history || history.length === 0) {
      return (
        <div className="history-page__empty-container">
          <EmptyState
            title={t('historyPage.emptyTitle') || 'No action history'}
            description={t('historyPage.emptyDesc') || 'Reversible file organization batches will be listed here.'}
            icon={RotateCcw}
          />
        </div>
      );
    }

    return (
      <div className="history-list">
        {history.map((batch, index) => (
          <HistoryCard
            key={batch.id}
            batch={batch}
            index={index}
            isAnyTaskActive={isAnyTaskActive}
            isUndoing={isUndoing}
            isReverting={revertingBatchIds.has(batch.id)}
            onConfirmUndo={handleConfirmUndo}
          />
        ))}
        {hasNextHistoryPage && (
          <div ref={historySentinelRef} id="history-sentinel" className="history-sentinel">
            {isFetchingNextHistoryPage && <Spinner size={20} />}
          </div>
        )}
      </div>
    );
  };

  const renderWatchedContent = () => {
    if (isWatchedLoading) {
      return (
        <div className="watched-history-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 'var(--space-xl)', padding: 'var(--space-xl)', background: 'var(--color-panel-soft)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-default)' }}>
              <div style={{ width: '100px', height: '56px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                <Skeleton style={{ width: '100%', height: '100%' }} variant="rect" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', justifyContent: 'center' }}>
                <div style={{ width: '250px' }}><Skeleton style={{ height: '20px' }} variant="rect" /></div>
                <div style={{ width: '150px' }}><Skeleton style={{ height: '14px' }} variant="rect" /></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!watchedHistory || watchedHistory.length === 0) {
      return (
        <div className="watched-history-page__empty-container">
          <EmptyState
            title={t('historyPage.watchedEmptyTitle') || 'No playback history'}
            description={t('historyPage.watchedEmptyDesc') || 'Your recently watched movies and tv will be listed here.'}
            icon={Clock}
          />
        </div>
      );
    }

    return (
      <div className="watched-history-list">
        {watchedHistory.map((log, index) => {
          const isSingle = log.type === 'movie' || log.type === 'scene';
          const isScene = log.type === 'scene';
          const poster = isScene
            ? (log.backdrop_path || log.poster_path)
            : (isSingle ? log.poster_path : (log.tv_poster_path || log.poster_path));
          const posterUrl = poster ? resolveMediaImageUrl(poster, isScene ? 'backdrop' : 'poster') : '';
          const percent = log.duration > 0 ? Math.round((log.resume_position / log.duration) * 100) : 0;

          return (
            <div
              key={log.id}
              className={`watched-history-card ${log.is_active ? 'is-active' : ''}`}
              ref={(el) => {
                if (el) el.style.setProperty('--item-index', index);
              }}
            >
              <div className={`watched-history-card__poster-wrapper ${isScene ? 'is-scene' : ''}`}>
                {posterUrl ? (
                  <img 
                    src={posterUrl} 
                    alt="" 
                    className="watched-history-card__poster" 
                    onError={(e) => console.error("History image failed:", { src: posterUrl, log, e })}
                  />
                ) : (
                  <div className="watched-history-card__poster-placeholder">
                    {isScene ? (
                      <ENTITY_ICONS.episode size={18} />
                    ) : isSingle ? (
                      <ENTITY_ICONS.movie size={18} />
                    ) : (
                      <ENTITY_ICONS.tv size={18} />
                    )}
                  </div>
                )}
              </div>

              <div className="watched-history-card__content">
                <div className="watched-history-card__header">
                  {isSingle ? (
                    <div className="watched-history-card__title-group">
                      <h3 className="watched-history-card__title">{log.title}</h3>
                      {log.year && <span className="watched-history-card__year">{LPAR}{log.year}{RPAR}</span>}
                    </div>
                  ) : (
                    <div className="watched-history-card__title-group">
                      <h3 className="watched-history-card__title">
                        {log.tv_title}{DASH}{S_CHAR}{String(log.season_number).padStart(2, '0')}{E_CHAR}{String(log.episode_number).padStart(2, '0')}{DASH}{log.episode_title || log.title}
                      </h3>
                      {log.year && <span className="watched-history-card__year">{LPAR}{log.year}{RPAR}</span>}
                    </div>
                  )}
                </div>

                <div className="watched-history-card__meta">
                  <div className="watched-history-card__meta-item">
                    <Clock size={12} />
                    <span>{new Date(log.watched_at).toLocaleString()}</span>
                  </div>

                  {log.is_watched ? (
                    <div className="watched-history-card__status watched-history-card__status--watched">
                      <CheckCircle2 size={12} />
                      <span>{t('historyPage.watchedStatus') || 'Watched'}</span>
                    </div>
                  ) : log.is_active ? (
                    <div className="watched-history-card__active-info">
                      <span className="watched-history-card__percent">{percent}{PERCENT}</span>
                      <span className="watched-history-card__time">
                        {LPAR}{formatTime(log.resume_position)}{SLASH}{formatTime(log.duration)}{RPAR}
                      </span>
                    </div>
                  ) : (
                    percent > 0 && (
                      <div className="watched-history-card__progress-info">
                        <span className="watched-history-card__percent">{percent}{PERCENT}</span>
                        <span className="watched-history-card__time">
                          {LPAR}{formatTime(log.resume_position)}{SLASH}{formatTime(log.duration)}{RPAR}
                        </span>
                      </div>
                    )
                  )}
                </div>

                {!log.is_watched && (log.is_active || percent > 0) && (
                  <div className="watched-history-card__progress-bar-wrapper">
                    <div
                      className={`watched-history-card__progress-bar ${log.is_active ? 'watched-history-bar--active' : ''}`}
                      ref={(el) => {
                        if (el) el.style.width = `${Math.max(percent, log.is_active ? 2 : 0)}%`;
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="watched-history-card__right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePlay(log.media_item_id)}
                  disabled={log.is_active || (playMutation.isPending && playMutation.variables === log.media_item_id)}
                  icon={
                    playMutation.isPending && playMutation.variables === log.media_item_id ? (
                      <Spinner size={14} />
                    ) : log.is_active ? (
                      null
                    ) : log.is_watched ? (
                      <RotateCcw size={14} />
                    ) : (
                      <Play size={14} />
                    )
                  }
                >
                  {log.is_active
                    ? 'Playing'
                    : log.is_watched
                    ? t('historyPage.watchedRewatch') || 'Rewatch'
                    : t('historyPage.watchedContinue') || 'Continue'
                  }
                </Button>
              </div>
            </div>
          );
        })}
        {hasNextWatchedPage && (
          <div ref={watchedSentinelRef} id="watched-sentinel" className="watched-sentinel">
            {isFetchingNextWatchedPage && <Spinner size={20} />}
          </div>
        )}
      </div>
    );
  };

  const renderPeaksContent = () => {
    if (isPeaksLoading) {
      return (
        <div className="watched-history-page__loading-container">
          <Spinner size={32} />
        </div>
      );
    }

    if (!peaksData || peaksData.length === 0) {
      return (
        <div className="watched-history-page__empty-container">
          <EmptyState
            title={t('historyPage.peaksEmptyTitle') || 'No marked finishes'}
            description={t('historyPage.peaksEmptyDesc') || 'Moments you mark with the finish button during NSFW playback will be listed here.'}
            icon={Droplets}
          />
        </div>
      );
    }

    return (
      <div className="watched-history-list">
        {peaksData.map((log, index) => {
          const snapshotUrl = log.snapshot_path ? resolveMediaImageUrl(log.snapshot_path, 'backdrop') : '';
          const poster = log.poster_path || log.backdrop_path;
          const posterUrl = snapshotUrl || (poster ? resolveMediaImageUrl(poster, 'backdrop') : '');
          const peakText = t('historyPage.peakAt', { defaultValue: 'Finish at' }) + ' ' + formatTime(log.video_position);
          
          return (
            <div
              key={log.id}
              className="watched-history-card"
              ref={(el) => {
                if (el) el.style.setProperty('--item-index', index);
              }}
            >
              <div className="watched-history-card__poster-wrapper is-scene">
                {posterUrl ? (
                  <img 
                    src={posterUrl} 
                    alt="" 
                    className={`watched-history-card__poster${snapshotUrl ? ' is-zoomable' : ''}`} 
                    onClick={() => {
                      if (snapshotUrl) {
                        setLightboxImage(snapshotUrl);
                      }
                    }}
                  />
                ) : (
                  <div className="watched-history-card__poster-placeholder">
                    <Droplets size={18} color="var(--color-state-danger)" />
                  </div>
                )}
              </div>

              <div className="watched-history-card__content">
                <div className="watched-history-card__header">
                  <div className="watched-history-card__title-group">
                    <h3 className="watched-history-card__title">{log.title}</h3>
                  </div>
                </div>

                <div className="watched-history-card__meta">
                  <div className="watched-history-card__meta-item">
                    <Clock size={12} />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>

                  <div className="watched-history-card__status watched-history-card__status--peak">
                    <Droplets size={12} fill="currentColor" />
                    <span>{peakText}</span>
                  </div>
                </div>
              </div>

              <div className="watched-history-card__right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePlayMoment(log.media_item_id, log.video_position)}
                  disabled={playMutation.isPending && playMutation.variables?.itemId === log.media_item_id}
                  icon={
                    playMutation.isPending && playMutation.variables?.itemId === log.media_item_id ? (
                      <Loader2 className="spinner" size={14} />
                    ) : (
                      <Play size={14} />
                    )
                  }
                >
                  {t('historyPage.playMoment', { defaultValue: 'Play Moment' })}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
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
    if (activeTab === 'rename') return renderRenameContent();
    if (activeTab === 'watched') return renderWatchedContent();
    if (activeTab === 'peaks') return renderPeaksContent();
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
      <div className="history-page">
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

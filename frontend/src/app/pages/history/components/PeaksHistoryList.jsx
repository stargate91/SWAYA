import Spinner from '@/ui/Spinner';
import EmptyState from '@/ui/EmptyState';
import Button from '@/ui/Button';
import { Droplets, Clock, Play, Loader2 } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import styles from './WatchedHistoryList.module.css';
import historyPageStyles from '../HistoryPage.module.css';

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

export default function PeaksHistoryList({
  isLoading,
  peaksData,
  playMutation,
  handlePlayMoment,
  setLightboxImage,
  t
}) {
  if (isLoading) {
    return (
      <div className={historyPageStyles['history-page__loading-container']}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!peaksData || peaksData.length === 0) {
    return (
      <div className={historyPageStyles['history-page__empty-container']}>
        <EmptyState
          size="lg"
          border="dashed"
          background="solid"
          title={t('historyPage.peaksEmptyTitle') || 'No marked finishes'}
          description={t('historyPage.peaksEmptyDesc') || 'Moments you mark with the finish button during NSFW playback will be listed here.'}
          icon={Droplets}
        />
      </div>
    );
  }

  return (
    <div className={styles['watched-history-list']}>
      {peaksData.map((log, index) => {
        const snapshotUrl = log.snapshot_path ? resolveMediaImageUrl(log.snapshot_path, 'backdrop') : '';
        const poster = log.poster_path || log.backdrop_path;
        const posterUrl = snapshotUrl || (poster ? resolveMediaImageUrl(poster, 'backdrop') : '');
        const peakText = t('historyPage.peakAt', { defaultValue: 'Finish at' }) + ' ' + formatTime(log.video_position);

        return (
          <div
            key={log.id}
            className={styles['watched-history-card']}
            ref={(el) => {
              if (el) el.style.setProperty('--item-index', index);
            }}
          >
            <div className={`${styles['watched-history-card__poster-wrapper']} ${styles['is-scene']}`}>
              {posterUrl ? (
                <img 
                  src={posterUrl} 
                  alt="" 
                  className={`${styles['watched-history-card__poster']} ${snapshotUrl ? styles['is-zoomable'] : ''}`} 
                  onClick={() => {
                    if (snapshotUrl) {
                      setLightboxImage(snapshotUrl);
                    }
                  }}
                />
              ) : (
                <div className={styles['watched-history-card__poster-placeholder']}>
                  <Droplets size={18} color="var(--color-state-danger)" />
                </div>
              )}
            </div>

            <div className={styles['watched-history-card__content']}>
              <div className={styles['watched-history-card__header']}>
                <div className={styles['watched-history-card__title-group']}>
                  <h3 className={styles['watched-history-card__title']}>{log.title}</h3>
                </div>
              </div>

              <div className={styles['watched-history-card__meta']}>
                <div className={styles['watched-history-card__meta-item']}>
                  <Clock size={12} />
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>

                <div className={`${styles['watched-history-card__status']} ${styles['watched-history-card__status--peak']}`}>
                  <Droplets size={12} fill="currentColor" />
                  <span>{peakText}</span>
                </div>
              </div>
            </div>

            <div className={styles['watched-history-card__right']}>
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
}

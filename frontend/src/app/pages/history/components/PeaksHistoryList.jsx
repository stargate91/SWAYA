import Spinner from '@/ui/Spinner';
import EmptyState from '@/ui/EmptyState';
import Button from '@/ui/Button';
import { Droplets, Clock, Play, Loader2 } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import historyPageStyles from '../HistoryPage.module.css';
import Card from '@/ui/Card';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import Badge from '@/ui/Badge';
import styles from './PeaksHistoryList.module.css';

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
        <Spinner size="lg" />
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
    <div className={styles['peaks-list']}>
      {peaksData.map((log, index) => {
        const snapshotUrl = log.snapshot_path ? resolveMediaImageUrl(log.snapshot_path, 'backdrop') : '';
        const poster = log.poster_path || log.backdrop_path;
        const posterUrl = snapshotUrl || (poster ? resolveMediaImageUrl(poster, 'backdrop') : '');
        const peakText = t('historyPage.peakAt', { defaultValue: 'Finish at' }) + ' ' + formatTime(log.video_position);

        return (
          <Card
            key={log.id}
            variant="soft"
            padding="none"
            className="animate-fade-in-up"
            data-item-index={index}
          >
            <Inline align="center" className={styles['peaks-row']}>
              <Inline align="center" className={styles['peaks-item-inline']}>
                <div className="u-poster-wrapper is-scene">
                  {posterUrl ? (
                    <img 
                      src={posterUrl} 
                      alt="" 
                      className={snapshotUrl ? styles['poster-img-clickable'] : styles['poster-img']}
                      onClick={() => {
                        if (snapshotUrl) {
                          setLightboxImage(snapshotUrl);
                        }
                      }}
                    />
                  ) : (
                    <div className={styles['poster-fallback']}>
                      <Droplets size={18} color="var(--color-state-danger)" />
                    </div>
                  )}
                </div>

                <Stack gap="sm" flex={1} className={styles['peaks-item-inline']}>
                  <h3 className={styles['peak-title']}>
                    {log.title}
                  </h3>

                  <Inline gap="lg" align="center">
                    <Inline gap="xs" align="center">
                      <Clock size={12} className={styles['text-muted-icon']} />
                      <Text variant="small" color="muted">
                        {new Date(log.created_at).toLocaleString()}
                      </Text>
                    </Inline>

                    <Badge family="status" tone="danger" size="sm">
                      <Droplets size={12} fill="currentColor" className={styles['badge-icon-margin']} />
                      {peakText}
                    </Badge>
                  </Inline>
                </Stack>
              </Inline>

              <div className={styles['action-wrapper']}>
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
            </Inline>
          </Card>
        );
      })}
    </div>
  );
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
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
            style={{
              '--item-index': index,
            }}
          >
            <Inline align="center" style={{ padding: 'var(--space-lg)', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <Inline align="center" style={{ flex: 1, minWidth: 0, gap: 'var(--space-md)' }}>
                <div className="u-poster-wrapper is-scene">
                  {posterUrl ? (
                    <img 
                      src={posterUrl} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: snapshotUrl ? 'zoom-in' : 'default' }}
                      onClick={() => {
                        if (snapshotUrl) {
                          setLightboxImage(snapshotUrl);
                        }
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                      <Droplets size={18} color="var(--color-state-danger)" />
                    </div>
                  )}
                </div>

                <Stack gap="sm" flex={1} style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '20rem' }}>
                    {log.title}
                  </h3>

                  <Inline gap="lg" align="center">
                    <Inline gap="xs" align="center">
                      <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <Text variant="small" color="muted">
                        {new Date(log.created_at).toLocaleString()}
                      </Text>
                    </Inline>

                    <Badge family="status" tone="danger" size="sm">
                      <Droplets size={12} fill="currentColor" style={{ marginRight: 'var(--space-2xs)' }} />
                      {peakText}
                    </Badge>
                  </Inline>
                </Stack>
              </Inline>

              <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 'var(--z-index-step-2)' }}>
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

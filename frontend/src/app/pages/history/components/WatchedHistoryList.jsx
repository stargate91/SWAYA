import Skeleton from '@/ui/Skeleton';
import EmptyState from '@/ui/EmptyState';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import { Clock, CheckCircle2, RotateCcw, Play, ENTITY_ICONS } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import historyPageStyles from '../HistoryPage.module.css';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import Badge from '@/ui/Badge';
import Card from '@/ui/Card';
import LinearProgress from '@/ui/LinearProgress';

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

export default function WatchedHistoryList({
  isLoading,
  watchedHistory,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
  playMutation,
  handlePlay,
  t
}) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 'var(--space-lg)', padding: 'var(--space-lg)', background: 'var(--color-panel-soft)', borderRadius: 'var(--radius-lg)', border: '0.0625rem solid var(--color-border-default)' }}>
            <div style={{ width: '6.25rem', height: '3.5rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
              <Skeleton style={{ width: '100%', height: '100%' }} variant="rect" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', justifyContent: 'center' }}>
              <div style={{ width: '15.625rem', height: '1.25rem' }}><Skeleton variant="rect" /></div>
              <div style={{ width: '9.375rem', height: '0.875rem' }}><Skeleton variant="rect" /></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!watchedHistory || watchedHistory.length === 0) {
    return (
      <div className={historyPageStyles['history-page__empty-container']}>
        <EmptyState
          size="lg"
          border="dashed"
          background="solid"
          title={t('historyPage.watchedEmptyTitle') || 'No playback history'}
          description={t('historyPage.watchedEmptyDesc') || 'Your recently watched movies and tv will be listed here.'}
          icon={Clock}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
      {watchedHistory.map((log, index) => {
        const isSingle = log.type === 'movie' || log.type === 'scene';
        const isScene = log.type === 'scene';
        const poster = isScene
          ? (log.backdrop_path || log.poster_path)
          : (isSingle ? log.poster_path : (log.tv_poster_path || log.poster_path));
        const posterUrl = poster ? resolveMediaImageUrl(poster, isScene ? 'backdrop' : 'poster') : '';
        const percent = log.duration > 0 ? Math.round((log.resume_position / log.duration) * 100) : 0;

        return (
          <Card
            key={log.id}
            variant="soft"
            padding="none"
            className={`animate-fade-in-up ${log.is_active ? 'u-card-active' : ''}`}
            style={{
              '--item-index': index,
            }}
          >
            <Inline align="center" style={{ padding: 'var(--space-lg)', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <Inline align="center" style={{ flex: 1, minWidth: 0, gap: 'var(--space-md)' }}>
                <div className={`u-poster-wrapper ${isScene ? 'is-scene' : ''}`}>
                  {posterUrl ? (
                    <img 
                      src={posterUrl} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => console.error("History image failed:", { src: posterUrl, log, e })}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
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

                <Stack gap="sm" flex={1} style={{ minWidth: 0 }}>
                  <Inline gap="sm" align="baseline" style={{ flexWrap: 'wrap' }}>
                    {isSingle ? (
                      <>
                        <Text variant="body" weight="semibold" truncate style={{ maxWidth: '20rem' }}>
                          {log.title}
                        </Text>
                        {log.year && <Text variant="small" color="muted">{LPAR}{log.year}{RPAR}</Text>}
                      </>
                    ) : (
                      <>
                        <Text variant="body" weight="semibold" truncate style={{ maxWidth: '20rem' }}>
                          {log.tv_title}{DASH}{S_CHAR}{String(log.season_number).padStart(2, '0')}{E_CHAR}{String(log.episode_number).padStart(2, '0')}{DASH}{log.episode_title || log.title}
                        </Text>
                        {log.year && <Text variant="small" color="muted">{LPAR}{log.year}{RPAR}</Text>}
                      </>
                    )}
                  </Inline>

                  <Inline gap="lg" align="center">
                    <Inline gap="xs" align="center">
                      <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <Text variant="small" color="muted">
                        {new Date(log.watched_at).toLocaleString()}
                      </Text>
                    </Inline>

                    {log.is_watched ? (
                      <Badge family="status" tone="success" size="sm">
                        <CheckCircle2 size={12} style={{ marginRight: 'var(--space-2xs)' }} />
                        {t('historyPage.watchedStatus') || 'Watched'}
                      </Badge>
                    ) : log.is_active ? (
                      <Inline gap="xs" align="center">
                        {log.is_active && <span className="u-pulse-dot" />}
                        <Text variant="small" color="accent" weight="bold">{percent}{PERCENT}</Text>
                        <Text variant="small" color="accent" style={{ opacity: 0.8 }}>
                          {LPAR}{formatTime(log.resume_position)}{SLASH}{formatTime(log.duration)}{RPAR}
                        </Text>
                      </Inline>
                    ) : (
                      percent > 0 && (
                        <Inline gap="xs" align="center">
                          <Text variant="small" color="accent" weight="bold">{percent}{PERCENT}</Text>
                          <Text variant="small" color="muted">
                            {LPAR}{formatTime(log.resume_position)}{SLASH}{formatTime(log.duration)}{RPAR}
                          </Text>
                        </Inline>
                      )
                    )}
                  </Inline>

                  {!log.is_watched && (log.is_active || percent > 0) && (
                    <LinearProgress
                      value={percent}
                      variant={log.is_active ? 'accent' : 'blue'}
                      className="u-progress-bar-width"
                    />
                  )}
                </Stack>
              </Inline>

              <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 'var(--z-index-step-2)' }}>
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
            </Inline>
          </Card>
        );
      })}
      {hasNextPage && (
        <div ref={sentinelRef} id="watched-sentinel" className={historyPageStyles['watched-sentinel']}>
          {isFetchingNextPage && <Spinner size={20} />}
        </div>
      )}
    </div>
  );
}

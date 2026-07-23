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
import styles from './WatchedHistoryList.module.css';

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
      <div className={styles['skeleton-container']}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className={styles['skeleton-card']}>
            <div className={styles['skeleton-poster-box']}>
              <Skeleton className={styles['skeleton-full']} variant="rect" />
            </div>
            <div className={styles['skeleton-text-box']}>
              <div className={styles['skeleton-title-line']}><Skeleton variant="rect" /></div>
              <div className={styles['skeleton-sub-line']}><Skeleton variant="rect" /></div>
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
    <div className={styles['list-container']}>
      {watchedHistory.map((log, index) => {
        const isSingle = log.type !== 'episode';
        const isScene = log.type === 'scene' || log.type === 'video';
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
            data-item-index={index}
          >
            <Inline align="center" className={styles['row-inline']}>
              <Inline align="center" className={styles['item-inline']}>
                <div className={`u-poster-wrapper ${isScene ? 'is-scene' : ''}`}>
                  {posterUrl ? (
                    <img 
                      src={posterUrl} 
                      alt="" 
                      className={styles['poster-img']}
                      onError={(e) => console.error("History image failed:", { src: posterUrl, log, e })}
                    />
                  ) : (
                    <div className={styles['poster-fallback']}>
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

                <Stack gap="sm" flex={1} className={styles['item-inline']}>
                  <Inline gap="sm" align="baseline">
                    {isSingle ? (
                      <>
                        <Text variant="body" weight="semibold" truncate className={styles['text-title-max']}>
                          {log.title}
                        </Text>
                        {log.year && <Text variant="small" color="muted">{LPAR}{log.year}{RPAR}</Text>}
                      </>
                    ) : (
                      <>
                        <Text variant="body" weight="semibold" truncate className={styles['text-title-max']}>
                          {log.tv_title}{DASH}{S_CHAR}{String(log.season_number).padStart(2, '0')}{E_CHAR}{String(log.episode_number).padStart(2, '0')}{DASH}{log.episode_title || log.title}
                        </Text>
                        {log.year && <Text variant="small" color="muted">{LPAR}{log.year}{RPAR}</Text>}
                      </>
                    )}
                  </Inline>

                  <Inline gap="lg" align="center">
                    <Inline gap="xs" align="center">
                      <Clock size={12} className={styles['icon-muted']} />
                      <Text variant="small" color="muted">
                        {new Date(log.watched_at).toLocaleString()}
                      </Text>
                    </Inline>

                    {log.is_watched ? (
                      <Badge family="status" tone="success" size="sm">
                        <CheckCircle2 size={12} className={styles['badge-icon-margin']} />
                        {t('historyPage.watchedStatus') || 'Watched'}
                      </Badge>
                    ) : log.is_active ? (
                      <Inline gap="xs" align="center">
                        {log.is_active && <span className="u-pulse-dot" />}
                        <Text variant="small" color="accent" weight="bold">{percent}{PERCENT}</Text>
                        <Text variant="small" color="accent" className={styles['text-opacity-80']}>
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

              <div className={styles['action-wrapper']}>
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

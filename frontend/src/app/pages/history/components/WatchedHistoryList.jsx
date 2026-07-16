import Skeleton from '@/ui/Skeleton';
import EmptyState from '@/ui/EmptyState';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import { Clock, CheckCircle2, RotateCcw, Play, ENTITY_ICONS } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import styles from './WatchedHistoryList.module.css';
import historyPageStyles from '../HistoryPage.module.css';

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
      <div className={styles['watched-history-list--loading']}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className={styles['watched-history-skeleton-card']}>
            <div className={styles['watched-history-skeleton-poster-wrapper']}>
              <Skeleton className={styles['watched-history-skeleton-poster']} variant="rect" />
            </div>
            <div className={styles['watched-history-skeleton-content']}>
              <div className={styles['watched-history-skeleton-title']}><Skeleton variant="rect" /></div>
              <div className={styles['watched-history-skeleton-text']}><Skeleton variant="rect" /></div>
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
    <div className={styles['watched-history-list']}>
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
            className={`${styles['watched-history-card']} ${log.is_active ? styles['is-active'] : ''}`}
            ref={(el) => {
              if (el) el.style.setProperty('--item-index', index);
            }}
          >
            <div className={`${styles['watched-history-card__poster-wrapper']} ${isScene ? styles['is-scene'] : ''}`}>
              {posterUrl ? (
                <img 
                  src={posterUrl} 
                  alt="" 
                  className={styles['watched-history-card__poster']} 
                  onError={(e) => console.error("History image failed:", { src: posterUrl, log, e })}
                />
              ) : (
                <div className={styles['watched-history-card__poster-placeholder']}>
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

            <div className={styles['watched-history-card__content']}>
              <div className={styles['watched-history-card__title-group']}>
                {isSingle ? (
                  <>
                    <h3 className={styles['watched-history-card__title']}>{log.title}</h3>
                    {log.year && <span className={styles['watched-history-card__year']}>{LPAR}{log.year}{RPAR}</span>}
                  </>
                ) : (
                  <>
                    <h3 className={styles['watched-history-card__title']}>
                      {log.tv_title}{DASH}{S_CHAR}{String(log.season_number).padStart(2, '0')}{E_CHAR}{String(log.episode_number).padStart(2, '0')}{DASH}{log.episode_title || log.title}
                    </h3>
                    {log.year && <span className={styles['watched-history-card__year']}>{LPAR}{log.year}{RPAR}</span>}
                  </>
                )}
              </div>

              <div className={styles['watched-history-card__meta']}>
                <div className={styles['watched-history-card__meta-item']}>
                  <Clock size={12} />
                  <span>{new Date(log.watched_at).toLocaleString()}</span>
                </div>

                {log.is_watched ? (
                  <div className={`${styles['watched-history-card__status']} ${styles['watched-history-card__status--watched']}`}>
                    <CheckCircle2 size={12} />
                    <span>{t('historyPage.watchedStatus') || 'Watched'}</span>
                  </div>
                ) : log.is_active ? (
                  <div className={styles['watched-history-card__active-info']}>
                    <span className={styles['watched-history-card__percent']}>{percent}{PERCENT}</span>
                    <span className={styles['watched-history-card__time']}>
                      {LPAR}{formatTime(log.resume_position)}{SLASH}{formatTime(log.duration)}{RPAR}
                    </span>
                  </div>
                ) : (
                  percent > 0 && (
                    <div className={styles['watched-history-card__progress-info']}>
                      <span className={styles['watched-history-card__percent']}>{percent}{PERCENT}</span>
                      <span className={styles['watched-history-card__time']}>
                        {LPAR}{formatTime(log.resume_position)}{SLASH}{formatTime(log.duration)}{RPAR}
                      </span>
                    </div>
                  )
                )}
              </div>

              {!log.is_watched && (log.is_active || percent > 0) && (
                <div className={styles['watched-history-card__progress-bar-wrapper']}>
                  <div
                    className={`${styles['watched-history-card__progress-bar']} ${log.is_active ? styles['watched-history-card__progress-bar--active'] : ''}`}
                    ref={(el) => {
                      if (el) el.style.width = `${Math.max(percent, log.is_active ? 2 : 0)}%`;
                    }}
                  />
                </div>
              )}
            </div>

            <div className={styles['watched-history-card__right']}>
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
      {hasNextPage && (
        <div ref={sentinelRef} id="watched-sentinel" className={historyPageStyles['watched-sentinel']}>
          {isFetchingNextPage && <Spinner size={20} />}
        </div>
      )}
    </div>
  );
}

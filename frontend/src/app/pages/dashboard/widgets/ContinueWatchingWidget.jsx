import { Play, Minus } from '@/ui/icons';
import PosterCard from '../../../ui/PosterCard';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import Tooltip from '../../../ui/Tooltip';
import Skeleton from '../../../ui/Skeleton';
import ScrollRow from '../../../ui/ScrollRow';
import styles from './ContinueWatchingWidget.module.css';
import { formatEpisodeCode } from '../../../lib/episodeFormat';
import { useTranslation } from '../../../providers/LanguageContext';
import useContinueWatching from './hooks/useContinueWatching';

const ContinueWatchingWidget = () => {
  const { t: T } = useTranslation();
  const {
    isLoading,
    localItems,
    activePlayback,
    handlePlay,
    handleResetProgress,
  } = useContinueWatching();

  if (isLoading) {
    return (
      <div className={styles['continue-watching-widget']}>
        <div className={styles['continue-watching-header']}>
          <Skeleton variant="text" className={styles['continue-watching-title-skeleton']} />
        </div>
        <Skeleton.Row>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton
              key={idx}
              variant="rect"
              className={styles['continue-watching-card-skeleton']}
            />
          ))}
        </Skeleton.Row>
      </div>
    );
  }

  if (!localItems.length && !activePlayback) {
    return null;
  }

  return (
    <div className={styles['continue-watching-widget']}>
      <div className={styles['continue-watching-header']}>
        {T('dashboard.continue_watching.title') || 'Continue Watching'}
      </div>
      <ScrollRow>
        {localItems.map((item) => {
          const isCurrentlyPlaying = activePlayback && String(activePlayback.itemId) === String(item.id);
          const currentResumePos = isCurrentlyPlaying ? activePlayback.currentTime : item.resume_position;
          const currentDuration = isCurrentlyPlaying
            ? (activePlayback.duration || item.duration || 1)
            : (item.duration || 1);

          const progressPercent = Math.min(100, (currentResumePos / currentDuration) * 100);
          const isEpisode = item.type === 'episode';
          const episodeCode = isEpisode ? formatEpisodeCode(item.season_number, item.episode_number) : null;
          const minutesLeft = Math.max(0, Math.floor(currentDuration / 60) - Math.floor(currentResumePos / 60));
          const episodeMeta = episodeCode ? `${episodeCode} - ${(item.tv_title || '')}` : null;
          const imagePath = item.still_path || item.backdrop_path;
          const resolvedImageUrl = resolveMediaImageUrl(imagePath, item.still_path ? 'still' : 'backdrop');

          return (
            <PosterCard
              key={`cw-${item.id}`}
              aspect="landscape"
              variant="overlay-title"
              disableHoverAnimation
              title={item.title}
              subtitle={T('dashboard.continue_watching.minutes_left', { minutes: minutesLeft }) || `${minutesLeft}m left`}
              hoverSubtitle={episodeMeta}
              className={`${styles['continue-watching-card']} ${(item.is_active && activePlayback) ? styles['continue-watching-card--active'] : ''}`}
              imageWrapperClassName={styles['continue-watching-card-image-wrapper']}
              imageClassName={styles['continue-watching-card-image']}
              imageUrl={resolvedImageUrl}
              progressPercent={progressPercent}
              onClick={() => handlePlay(item)}
              topRightAction={
                <Tooltip
                  content={T('dashboard.continue_watching.remove') || 'Remove progress'}
                  side="top"
                  triggerClassName={styles['card-tooltip']}
                >
                  <button
                    type="button"
                    className={styles['continue-watching-remove']}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetProgress(item.id);
                    }}
                  >
                    <Minus size={14} />
                  </button>
                </Tooltip>
              }
              playOverlay={{
                icon: <Play size={18} fill="currentColor" />,
                onClick: () => handlePlay(item)
              }}
            />
          );
        })}
      </ScrollRow>
    </div>
  );
};

export default ContinueWatchingWidget;

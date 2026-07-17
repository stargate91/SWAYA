import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Minus } from '@/ui/icons';
import PosterCard from '../../../ui/PosterCard';
import { useContinueWatchingQuery } from '../../../queries';
import { usePlayMediaMutation, useResetProgressMutation, useSettingsQuery } from '../../../queries';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import Tooltip from '../../../ui/Tooltip';
import Skeleton from '../../../ui/Skeleton';
import ScrollRow from '../../../ui/ScrollRow';
import styles from './ContinueWatchingWidget.module.css';

import { formatEpisodeCode } from '../../../lib/episodeFormat';
import api from '../../../lib/api';
import { onIpc } from '../../../lib/electron';
import { useTranslation } from '../../../providers/LanguageContext';

const ContinueWatchingWidget = () => {
  const { t: T } = useTranslation();
  const queryClient = useQueryClient();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: itemsData, isLoading } = useContinueWatchingQuery({
    include_adult: sessionMode === 'nsfw',
  });
  const items = useMemo(() => itemsData || [], [itemsData]);
  const playMutation = usePlayMediaMutation();
  const resetProgressMutation = useResetProgressMutation();
  const { data: settings = {} } = useSettingsQuery();

  const [prevItems, setPrevItems] = useState(items);
  const [localItems, setLocalItems] = useState(items);

  if (items !== prevItems) {
    setPrevItems(items);
    setLocalItems(items);
  }

  const [activePlayback, setActivePlayback] = useState(null);

  useEffect(() => {
    const handlePlayerStateUpdate = async (event, data) => {
      if (data.event === 'start') {
        setActivePlayback({
          itemId: data.itemId,
          currentTime: data.currentTime || 0,
          duration: data.duration || 1,
        });

        // If not already in localItems, fetch it from API and prepend it
        setLocalItems((prev) => {
          const exists = prev.some(item => String(item.id) === String(data.itemId));
          if (!exists) {
            // Fetch detail asynchronously via queryClient
            queryClient.fetchQuery({
              queryKey: ['item-detail', data.itemId],
              queryFn: () => api.library.getItemDetail(data.itemId),
            }).then((detail) => {
              if (detail) {
                const newItem = {
                  id: detail.id,
                  title: detail.title,
                  tv_title: detail.tv_title,
                  still_path: detail.still_path,
                  backdrop_path: detail.backdrop_path,
                  poster_path: detail.poster_path,
                  season_number: detail.season_number,
                  episode_number: detail.episode_number,
                  duration: data.duration || detail.duration || 1,
                  resume_position: data.currentTime || 0,
                  type: detail.media_type || detail.type,
                };
                setLocalItems((current) => {
                  const filtered = current.filter(item => String(item.id) !== String(detail.id));
                  return [newItem, ...filtered];
                });
              }
            }).catch((err) => {
              console.error('Failed to fetch detail for continue watching start:', err);
            });
          }
          return prev;
        });
      } else if (data.event === 'time-pos') {
        setActivePlayback((prev) => {
          if (!prev) return null;
          return { ...prev, currentTime: data.currentTime };
        });
      } else if (data.event === 'duration') {
        setActivePlayback((prev) => {
          if (!prev) return null;
          return { ...prev, duration: data.duration };
        });
      } else if (data.event === 'close') {
        setActivePlayback(null);
      }
    };

    const unsubscribe = onIpc('player-state-update', handlePlayerStateUpdate);
    return () => {
      unsubscribe();
    };
  }, [queryClient]);

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
              onClick={() => {
                const preferredPlayer = settings.preferred_player || 'swaya';
                if (item.is_active && preferredPlayer !== 'swaya') return;
                if (item.type === 'episode' || item.type === 'movie' || item.type === 'scene') {
                  playMutation.mutate(item.id);
                }
              }}
              topRightAction={
                <Tooltip
                  content={T('dashboard.continue_watching.remove') || 'Remove progress'}
                  side="top"
                  triggerClassName={styles['card-tooltip']}
                >
                  <button
                    type="button"
                    className={styles['continue-watching-remove']}
                    onClick={async (e) => {
                      e.stopPropagation();
                      resetProgressMutation.mutate(item.id);
                    }}
                  >
                    <Minus size={14} />
                  </button>
                </Tooltip>
              }
              playOverlay={{
                icon: <Play size={18} fill="currentColor" />,
                onClick: () => {
                  const preferredPlayer = settings.preferred_player || 'swaya';
                  if (item.is_active && preferredPlayer !== 'swaya') return;
                  if (item.type === 'episode' || item.type === 'movie' || item.type === 'scene') {
                    playMutation.mutate(item.id);
                  }
                }
              }}
            />
          );
        })}
      </ScrollRow>
    </div>
  );
};

export default ContinueWatchingWidget;

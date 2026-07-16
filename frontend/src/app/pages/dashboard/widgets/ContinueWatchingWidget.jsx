import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { Play, Minus, ChevronLeft, ChevronRight } from '@/ui/icons';
import PosterCard from '../../../ui/PosterCard';
import { useContinueWatchingQuery } from '../../../queries';
import { usePlayMediaMutation, useResetProgressMutation, useSettingsQuery } from '../../../queries';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import Tooltip from '../../../ui/Tooltip';
import IconButton from '../../../ui/IconButton';
import Skeleton from '../../../ui/Skeleton';
import styles from './ContinueWatchingWidget.module.css';

import { formatEpisodeCode } from '../../../lib/episodeFormat';
import api from '../../../lib/api';
import { onIpc } from '../../../lib/electron';
import { useTranslation } from '../../../providers/LanguageContext';

const ContinueWatchingWidget = () => {
  const { t: T } = useTranslation();
  const queryClient = useQueryClient();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: items = [], isLoading } = useContinueWatchingQuery({
    include_adult: sessionMode === 'nsfw',
  });
  const playMutation = usePlayMediaMutation();
  const resetProgressMutation = useResetProgressMutation();
  const { data: settings = {} } = useSettingsQuery();
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  const [localItems, setLocalItems] = useState(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [localItems, updateArrows]);

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

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

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
      <div className={styles['continue-watching-shell']}>
        {showLeft && (
          <IconButton
            variant="carousel-arrow"
            className={styles['is-left']}
            onClick={() => scroll('left')}
          >
            <ChevronLeft size={24} />
          </IconButton>
        )}
        {showRight && (
          <IconButton
            variant="carousel-arrow"
            className={styles['is-right']}
            onClick={() => scroll('right')}
          >
            <ChevronRight size={24} />
          </IconButton>
        )}
        <div ref={scrollRef} onScroll={updateArrows} className={`${styles['continue-watching-row']} no-scrollbar`}>
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
              className={`${styles['continue-watching-card']} ${item.is_active ? styles['continue-watching-card--active'] : ''}`}
              imageWrapperClassName={styles['continue-watching-card-image-wrapper']}
              imageClassName={styles['continue-watching-card-image']}
              imageUrl={resolvedImageUrl}
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
                    className={styles['continue-watching-remove']}
                    onClick={async (e) => {
                      e.stopPropagation();
                      resetProgressMutation.mutate(item.id);
                    }}
                    aria-label={T('dashboard.continue_watching.remove') || 'Remove progress'}
                  >
                    <Minus size={14} color="var(--color-text-primary)" />
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
            >
              <div className={styles['continue-watching-overlay']} />
              <div className={styles['continue-watching-progress-track']}>
                <svg viewBox="0 0 100 4" preserveAspectRatio="none" className={styles['continue-watching-progress-svg']}>
                  <rect x="0" y="0" width="100" height="4" className={styles['continue-watching-progress-bg']} />
                  <rect x="0" y="0" width={progressPercent} height="4" className={styles['continue-watching-progress-fill']} />
                </svg>
              </div>
              <div className={styles['continue-watching-copy']}>
                <div className={styles['continue-watching-title']}>
                  {item.title}
                </div>
                <div className={`${styles['continue-watching-meta']} ${episodeMeta ? styles['continue-watching-meta--has-episode'] : ''}`}>
                  <span className={styles['continue-watching-meta-default']}>
                    {T('dashboard.continue_watching.minutes_left', { minutes: minutesLeft }) || `${minutesLeft}m left`}
                  </span>
                  {episodeMeta ? (
                    <span className={styles['continue-watching-meta-episode']}>
                      {episodeMeta}
                    </span>
                  ) : null}
                </div>
              </div>
            </PosterCard>
          );
        })}
      </div>
      </div>
    </div>
  );
};

export default ContinueWatchingWidget;

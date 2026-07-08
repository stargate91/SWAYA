import { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Play, Minus, ChevronLeft, ChevronRight } from '@/ui/icons';
import PosterCard from '../../../ui/PosterCard';
import { useContinueWatchingQuery } from '../../../queries';
import { usePlayMediaMutation, useResetProgressMutation, useSettingsQuery } from '../../../queries';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import './ContinueWatchingWidget.css';

import { formatEpisodeCode } from '../../../lib/episodeFormat';

const ContinueWatchingWidget = ({ T }) => {
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

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [items, updateArrows]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (isLoading || !items.length) {
    return null;
  }

  return (
    <div className="continue-watching-widget">
      <div className="continue-watching-header">
        {T('dashboard.continue_watching.title') || 'Continue Watching'}
      </div>
      <div className="continue-watching-shell">
        {showLeft && (
          <button className="ui-carousel-arrow is-left" onClick={() => scroll('left')}>
            <ChevronLeft size={24} />
          </button>
        )}
        {showRight && (
          <button className="ui-carousel-arrow is-right" onClick={() => scroll('right')}>
            <ChevronRight size={24} />
          </button>
        )}
        <div ref={scrollRef} onScroll={updateArrows} className="continue-watching-row no-scrollbar">
        {items.map((item) => {
          const progressPercent = Math.min(100, (item.resume_position / item.duration) * 100);
          const episodeCode = formatEpisodeCode(item.season_number, item.episode_number);
          const minutesLeft = Math.max(0, Math.floor(item.duration / 60) - Math.floor(item.resume_position / 60));
          const episodeMeta = episodeCode ? `${episodeCode} - ${item.episode_title || item.title}` : null;
          const imagePath = item.still_path || item.backdrop_path;
          const resolvedImageUrl = resolveMediaImageUrl(imagePath, item.still_path ? 'still' : 'backdrop');

          return (
            <PosterCard
              key={`cw-${item.id}`}
              aspect="landscape"
              className={`continue-watching-card ${item.is_active ? 'continue-watching-card--active' : ''}`}
              imageUrl={resolvedImageUrl}
              onClick={() => {
                const preferredPlayer = settings.preferred_player || 'swaya';
                if (item.is_active && preferredPlayer !== 'swaya') return;
                if (item.type === 'episode' || item.type === 'movie' || item.type === 'scene') {
                  playMutation.mutate(item.id);
                }
              }}
              topRightAction={
                <button
                  className="continue-watching-remove"
                  onClick={async (e) => {
                    e.stopPropagation();
                    resetProgressMutation.mutate(item.id);
                  }}
                  title={T('dashboard.continue_watching.remove') || 'Remove progress'}
                >
                  <Minus size={14} color="var(--color-text-primary)" />
                </button>
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
              <div className="continue-watching-overlay" />
              <div className="continue-watching-progress-track">
                <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="continue-watching-progress-svg">
                  <rect x="0" y="0" width="100" height="4" className="continue-watching-progress-bg" />
                  <rect x="0" y="0" width={progressPercent} height="4" className="continue-watching-progress-fill" />
                </svg>
              </div>
              <div className="continue-watching-copy">
                <div className="continue-watching-title">
                  {item.series_title || item.title}
                </div>
                <div className={`continue-watching-meta${episodeMeta ? ' continue-watching-meta--has-episode' : ''}`}>
                  <span className="continue-watching-meta-default">
                    {T('dashboard.continue_watching.minutes_left', { minutes: minutesLeft }) || `${minutesLeft}m left`}
                  </span>
                  {episodeMeta ? (
                    <span className="continue-watching-meta-episode">
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

ContinueWatchingWidget.propTypes = {
  T: PropTypes.func.isRequired,
};

export default ContinueWatchingWidget;

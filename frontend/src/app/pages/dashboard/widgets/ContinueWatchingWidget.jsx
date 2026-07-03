import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import IconButton from '../../../ui/IconButton';
import { useContinueWatchingQuery } from '../../../queries';
import { usePlayMediaMutation, useResetProgressMutation, useSettingsQuery } from '../../../queries';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';

const normalizeEpisodeNumbers = (episodeNumber) => {
  if (Array.isArray(episodeNumber)) {
    return episodeNumber.map((n) => Number(n)).filter(Number.isInteger);
  }

  if (typeof episodeNumber === 'string') {
    const trimmed = episodeNumber.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map((n) => Number(n)).filter(Number.isInteger) : [Number(parsed)].filter(Number.isInteger);
      } catch {
        return [];
      }
    }

    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s) => Number(s.trim())).filter(Number.isInteger);
    }

    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? [parsed] : [];
  }

  return Number.isInteger(episodeNumber) ? [episodeNumber] : [];
};

const formatEpisodeCode = (seasonNumber, episodeNumber) => {
  if (!seasonNumber) return null;
  const sStr = String(seasonNumber).padStart(2, '0');
  const normalized = normalizeEpisodeNumbers(episodeNumber);
  if (normalized.length === 0) return `S${sStr}`;
  if (normalized.length === 1) return `S${sStr}E${String(normalized[0]).padStart(2, '0')}`;
  const first = String(normalized[0]).padStart(2, '0');
  const last = String(normalized[normalized.length - 1]).padStart(2, '0');
  return `S${sStr}E${first}-${last}`;
};

const ContinueWatchingWidget = ({ T }) => {
  const navigate = useNavigate();
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
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollWidth > el.clientWidth && el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    updateArrows();
    const timer = setTimeout(updateArrows, 100);
    window.addEventListener('resize', updateArrows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateArrows);
    };
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
          <button className="continue-watching-arrow is-left" onClick={() => scroll('left')}>
            <ChevronLeft size={24} />
          </button>
        )}
        {showRight && (
          <button className="continue-watching-arrow is-right" onClick={() => scroll('right')}>
            <ChevronRight size={24} />
          </button>
        )}
        <div ref={scrollRef} onScroll={updateArrows} className="continue-watching-row">
        {items.map((item) => {
          const progressPercent = Math.min(100, (item.resume_position / item.duration) * 100);
          const episodeCode = formatEpisodeCode(item.season_number, item.episode_number);
          const minutesLeft = Math.max(0, Math.floor(item.duration / 60) - Math.floor(item.resume_position / 60));
          const episodeMeta = episodeCode ? `${episodeCode} - ${item.episode_title || item.title}` : null;
          const imagePath = item.still_path || item.backdrop_path;
          const resolvedImageUrl = resolveMediaImageUrl(imagePath, item.still_path ? 'still' : 'backdrop');

          return (
            <div
              key={`cw-${item.id}`}
              className={`continue-watching-card ${item.is_active ? 'continue-watching-card--active' : ''}`}
              onClick={() => {
                const preferredPlayer = settings.preferred_player || 'swaya';
                if (item.is_active && preferredPlayer !== 'swaya') return;
                if (item.type === 'episode' || item.type === 'movie' || item.type === 'scene') {
                  playMutation.mutate(item.id);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  const preferredPlayer = settings.preferred_player || 'swaya';
                  if (item.is_active && preferredPlayer !== 'swaya') return;
                  if (item.type === 'episode' || item.type === 'movie' || item.type === 'scene') {
                    playMutation.mutate(item.id);
                  }
                }
              }}
            >
              <button
                className="continue-watching-remove"
                onClick={async (e) => {
                  e.stopPropagation();
                  resetProgressMutation.mutate(item.id);
                }}
                title={T('dashboard.continue_watching.remove') || 'Remove progress'}
              >
                <X size={14} color="var(--color-text-primary)" />
              </button>

              {resolvedImageUrl ? (
                <img
                  src={resolvedImageUrl}
                  alt=""
                  className="continue-watching-image"
                />
              ) : (
                <div className="continue-watching-fallback" />
              )}

              <div className="continue-watching-overlay" />

              <IconButton
                variant="play-overlay"
                className={item.is_active ? 'continue-watching-play-active' : ''}
              >
                <Play size={18} fill="currentColor" />
              </IconButton>

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
            </div>
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

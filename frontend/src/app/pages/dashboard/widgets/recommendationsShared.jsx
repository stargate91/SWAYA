/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Star, Plus, Heart, Play, Minus } from '@/ui/icons';
import { usePlayMediaMutation } from '../../../queries';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import { normalizeMediaEntity } from '../../../lib/normalizeMediaEntity';
import { API_BASE } from '../../../lib/backend';
import Button from '../../../ui/Button';
import Badge from '../../../ui/Badge';
import Skeleton from '../../../ui/Skeleton';
import PosterCard from '../../../ui/PosterCard';
import AdultOverlay from '../../../ui/AdultOverlay';

export const ADULT_LABEL = '18+';

export const SpotlightBanner = ({ item, watchlistIds, onWatchlist, onCardClick, T }) => {
  if (!item) return null;
  const imageUrl = resolveMediaImageUrl(item.backdrop_path, 'backdrop');
  const title = item.title || item.name;
  const isWatchlisted = watchlistIds.includes(item.id);
  const imdbRating = item.rating_imdb;
  const tmdbRating = item.rating_tmdb || item.vote_average;
  const ratingToDisplay = imdbRating || tmdbRating;
  const ratingSource = imdbRating ? 'imdb' : 'tmdb';
  const year = item.release_date ? new Date(item.release_date).getFullYear() : null;

  return (
    <div className="recommend-spotlight">
      {imageUrl && <img src={imageUrl} alt={title} className="recommend-spotlight-image" />}
      <div className="recommend-spotlight-gradient recommend-spotlight-gradient--side" />
      <div className="recommend-spotlight-gradient recommend-spotlight-gradient--bottom" />

      <div className="recommend-spotlight-copy">
        <h2 className="recommend-spotlight-title" onClick={() => onCardClick(item)}>{title}</h2>
        <div className="recommend-spotlight-meta">
          {ratingToDisplay ? (
            <span className={`recommend-spotlight-rating is-${ratingSource}`}>
              <Star size={14} fill="currentColor" /> {ratingToDisplay.toFixed(1)}
            </span>
          ) : null}
          {year ? <span className="recommend-spotlight-year">{year}</span> : null}
        </div>
        <p className="recommend-spotlight-overview">{item.overview}</p>
        <div className="recommend-spotlight-actions">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onWatchlist(item.id, item.title ? 'movie' : 'tv');
            }}
            className={`recommend-watchlist-btn ${isWatchlisted ? 'is-watchlisted' : ''}`}
            variant="secondary"
          >
            {isWatchlisted ? (
              <>
                <Check size={16} /> {T('dashboard.watchlist.added') || 'Watchlisted'}
              </>
            ) : (
              <>
                <Plus size={16} /> {T('dashboard.watchlist.add') || 'Watchlist'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

SpotlightBanner.propTypes = {
  item: PropTypes.object,
  watchlistIds: PropTypes.array.isRequired,
  onWatchlist: PropTypes.func.isRequired,
  onCardClick: PropTypes.func.isRequired,
  T: PropTypes.func.isRequired,
};

export const renderUserRatingBadge = (item) => {
  const rating = Number(item?.user_rating);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  const label = Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
  return (
    <Badge className="ui-poster-card__user-rating-badge">
      <Star size={10} fill="currentColor" />
      {label}
    </Badge>
  );
};

export const renderFavoriteBadge = (item, T) => {
  if (!item?.is_favorite) return null;
  return (
    <div
      className="ui-poster-card__favorite-badge"
      title={T('library.filter.favorite') || 'Favourite'}
      aria-label={T('library.filter.favorite') || 'Favourite'}
    >
      <Heart size={14} fill="currentColor" strokeWidth={2.2} />
    </div>
  );
};

export const RecommendationCarousel = ({
  title,
  items,
  watchlistIds,
  onWatchlist,
  onCardClick,
  T,
  isAdultCarousel = false,
  onLoadMore = null,
  hasMore = false,
  isLoadingMore = false,
  settings = {},
  onPlayClick,
  playMutationPending,
}) => {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  const updateArrows = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const isNearEnd = element.scrollLeft >= element.scrollWidth - element.clientWidth - 150;

    setShowLeft(element.scrollLeft > 10);
    setShowRight(element.scrollLeft < element.scrollWidth - element.clientWidth - 10);

    if (isNearEnd && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    // Small timeout to ensure DOM styles have computed width
    const timer = setTimeout(updateArrows, 100);
    window.addEventListener('resize', updateArrows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, items]);

  if (!items?.length) {
    return null;
  }

  const scroll = (direction) => {
    const element = scrollRef.current;
    if (!element) return;
    const amount = element.clientWidth * 0.75;
    element.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="recommend-carousel">
      <h3 className="recommend-carousel-title">{title}</h3>

      <div className="recommend-carousel-shell">
        {showLeft && (
          <button
            className="ui-carousel-arrow is-left"
            onClick={() => scroll('left')}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {showRight && (
          <button
            className="ui-carousel-arrow is-right"
            onClick={() => scroll('right')}
          >
            <ChevronRight size={24} />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="recommend-carousel-track no-scrollbar"
        >
          {items.map((item) => {
            const n = normalizeMediaEntity(item, {
              context: 'recommendations',
              settings,
              sessionMode,
              isAdultContext: isAdultCarousel,
            });
            const isWatchlisted = watchlistIds.includes(item.id);
            const rawPosterUrl = n.isPerson
              ? resolveMediaImageUrl(item.profile_path || item.local_profile_path, 'personThumb')
              : resolveMediaImageUrl(n.isScene ? (item.backdrop_path || item.poster_path) : item.poster_path, n.isScene ? 'backdrop' : 'poster');
            const posterUrl = (n.shouldBlur && rawPosterUrl)
              ? `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(rawPosterUrl)}&blur=true`
              : rawPosterUrl;
            const yearLabel = n.subtitle;
            const performers = n.performers;
            const displayDate = item.release_date ? item.release_date.substring(0, 10) : '';

            let roleLabel = null;
            if (n.isPerson) {
              const dept = item.known_for_department || (item.is_adult ? 'performer' : 'artist');
              roleLabel = T(`lists.roles.${dept.toLowerCase()}`) || dept;
            }

            let subtitle;
            if (n.isPerson) {
              subtitle = (
                <div className="ui-poster-card__subtitle">
                  {roleLabel}
                </div>
              );
            } else if (n.isScene) {
              subtitle = (
                <div className="ui-poster-card__subtitle-row">
                  <span className="ui-poster-card__subtitle">
                    {performers.map((p, idx) => (
                      <span
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        className="ui-poster-card__performer-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/library/people/${p.id}`, { state: { allowAdult: true } });
                        }}
                      >
                        {idx > 0 && ', '}
                        {p.name}
                      </span>
                    ))}
                  </span>
                  {displayDate && <span className="ui-poster-card__subtitle recommend-card-scene-date">{displayDate}</span>}
                </div>
              );
            } else {
              subtitle = yearLabel;
            }

            return (
              <PosterCard
                key={item.id}
                className={`recommend-card ${n.isScene ? 'recommend-card--scene' : ''} ${n.shouldBlur ? 'is-blurred' : ''}`}
                imageUrl={posterUrl}
                onClick={() => onCardClick(item)}
                title={item.title || item.name}
                subtitle={subtitle}
                ratingImdb={n.ratingImdb}
                ratingTmdb={n.ratingTmdb}
                ratingPill={null}
                badge={renderUserRatingBadge(item)}
                topRightBadge={renderFavoriteBadge(item, T)}
                playOverlay={
                  !n.isPerson && item.in_library && onPlayClick
                    ? {
                        title: null,
                        onClick: (e) => {
                          e.stopPropagation();
                          onPlayClick(item);
                        },
                        pending: playMutationPending,
                        icon: <Play size={16} fill="currentColor" />,
                      }
                    : null
                }
              >
                {!n.isPerson && (
                  <div className="recommend-card-overlay">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onWatchlist(item.id, item.title ? 'movie' : 'tv');
                      }}
                      className={`ui-card-action-btn ${isWatchlisted ? '' : 'ui-card-action-btn--neutral'}`}
                      variant="unstyled"
                    >
                      {isWatchlisted ? (
                        <>
                          <span className="action-btn-state-default">
                            <Check size={12} strokeWidth={3} /> {T('dashboard.watchlist.added') || 'Watchlisted'}
                          </span>
                          <span className="action-btn-state-hover">
                            <Minus size={12} strokeWidth={3} /> {T('common.remove') || 'Remove'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} strokeWidth={3} /> {T('dashboard.watchlist.add_short') || 'Watchlist'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {n.shouldBlur && (
                  <div className="recommend-card-blur-overlay">
                    <AdultOverlay isNsfw={sessionMode === 'nsfw'} />
                  </div>
                )}
              </PosterCard>
            );
          })}
          {isLoadingMore && (
            <div className="recommend-card recommend-card-loading-wrapper">
              <span className="ui-spinner" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

RecommendationCarousel.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.array,
  watchlistIds: PropTypes.array.isRequired,
  onWatchlist: PropTypes.func.isRequired,
  onCardClick: PropTypes.func.isRequired,
  T: PropTypes.func.isRequired,
  isAdultCarousel: PropTypes.bool,
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  settings: PropTypes.object,
  onPlayClick: PropTypes.func,
  playMutationPending: PropTypes.bool,
};

export const RecommendationSkeleton = ({ showBanner = false }) => (
  <div className="recommend-skeleton">
    {showBanner && <Skeleton.Banner />}
    <Skeleton.Title />
    <Skeleton.Row>
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton.Card key={idx} />
      ))}
    </Skeleton.Row>
  </div>
);

RecommendationSkeleton.propTypes = {
  showBanner: PropTypes.bool,
};

import api from '../../../lib/api';

export const useRecommendationActions = () => {
  const navigate = useNavigate();
  const playMutation = usePlayMediaMutation();

  const handlePlayClick = useCallback(async (item) => {
    if (playMutation.isPending) return;

    const isTv = item.media_type === 'tv' || item.type === 'tv' || String(item.id).startsWith('tv_');
    if (!isTv) {
      const playId = item.in_library ? item.media_item_id : item.id;
      playMutation.mutate(playId);
      return;
    }

    try {
      const tvId = String(item.in_library ? item.media_item_id : item.id).replace('tv_', '').replace('tmdb_', '');
      const tvDetail = await api.library.getTvDetail(tvId);
      
      const seasons = Array.isArray(tvDetail?.seasons) ? tvDetail.seasons : [];
      let nextEpisode = null;

      for (const season of seasons) {
        const ownedEpisodes = (season.episodes || []).filter((episode) => episode.path && !episode.is_missing);
        const inProgress = ownedEpisodes.find((episode) => episode.resume_position > 0);
        if (inProgress) {
          nextEpisode = inProgress;
          break;
        }
      }

      if (!nextEpisode) {
        for (const season of seasons) {
          const ownedEpisodes = (season.episodes || []).filter((episode) => episode.path && !episode.is_missing);
          const unwatched = ownedEpisodes.find((episode) => !episode.is_watched);
          if (unwatched) {
            nextEpisode = unwatched;
            break;
          }
        }
      }

      if (!nextEpisode) {
        for (const season of seasons) {
          const ownedEpisodes = (season.episodes || []).filter((episode) => episode.path && !episode.is_missing);
          if (ownedEpisodes.length > 0) {
            nextEpisode = ownedEpisodes[0];
            break;
          }
        }
      }

      if (nextEpisode?.id) {
        playMutation.mutate(nextEpisode.id);
      }
    } catch (err) {
      console.error('Failed to play TV show:', err);
    }
  }, [playMutation]);

  const handleCardClick = useCallback((item) => {
    const type = item.media_type || (item.title ? 'movie' : (item.profile_path ? 'person' : 'tv'));
    if (type === 'person') {
      navigate(`/library/people/${item.id}`, { state: { allowAdult: true } });
      return;
    }
    if (type === 'tv' || type === 'episode') {
      navigate(`/library/tv/tmdb_${item.id}`, { state: { allowAdult: true } });
      return;
    }
    const idToUse = item.in_library ? item.media_item_id : `tmdb_${item.id}`;
    navigate(`/library/${type}/${idToUse}`, { state: { allowAdult: true } });
  }, [navigate]);

  return { handlePlayClick, handleCardClick, playMutationPending: playMutation.isPending };
};

export const useWatchlistHandler = (watchlistIdsFromQuery, addToWatchlistMutation, removeFromWatchlistMutation) => {
  const [optimisticWatchlistIds, setOptimisticWatchlistIds] = useState(null);
  const [prevWatchlistIds, setPrevWatchlistIds] = useState(null);

  if (watchlistIdsFromQuery !== prevWatchlistIds) {
    setPrevWatchlistIds(watchlistIdsFromQuery);
    setOptimisticWatchlistIds(null);
  }

  const actualWatchlistIds = useMemo(() => {
    return optimisticWatchlistIds !== null ? optimisticWatchlistIds : (watchlistIdsFromQuery || []);
  }, [optimisticWatchlistIds, watchlistIdsFromQuery]);

  const handleWatchlist = useCallback((id, type) => {
    const isWatchlisted = actualWatchlistIds.includes(id);
    if (isWatchlisted) {
      setOptimisticWatchlistIds((prev) => (prev || watchlistIdsFromQuery || []).filter((i) => i !== id));
      removeFromWatchlistMutation.mutate(id);
    } else {
      setOptimisticWatchlistIds((prev) => [...(prev || watchlistIdsFromQuery || []), id]);
      addToWatchlistMutation.mutate({ tmdbId: id, type });
    }
  }, [actualWatchlistIds, watchlistIdsFromQuery, addToWatchlistMutation, removeFromWatchlistMutation]);

  return { actualWatchlistIds, handleWatchlist };
};

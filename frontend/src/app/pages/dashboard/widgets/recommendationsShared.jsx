/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';

import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Star, Plus, Play, Minus } from '@/ui/icons';
import { usePlayMediaMutation } from '../../../queries';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import { normalizeMediaEntity } from '../../../lib/normalizeMediaEntity';
import { API_BASE } from '../../../lib/backend';
import Button from '../../../ui/Button';
import Spinner from '../../../ui/Spinner';
import Skeleton from '../../../ui/Skeleton';
import PosterCard from '../../../ui/PosterCard';
import AdultOverlay from '../../../ui/AdultOverlay';
import IconButton from '../../../ui/IconButton';

import posterCardStyles from '../../../ui/PosterCard.module.css';
import styles from './RecommendationsWidget.module.css';

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
    <div className={styles['recommend-spotlight']}>
      {imageUrl && <img src={imageUrl} alt={title} className={styles['recommend-spotlight-image']} />}
      <div className={`${styles['recommend-spotlight-gradient']} ${styles['recommend-spotlight-gradient--side']}`} />
      <div className={`${styles['recommend-spotlight-gradient']} ${styles['recommend-spotlight-gradient--bottom']}`} />

      <div className={styles['recommend-spotlight-copy']}>
        <h2 className={styles['recommend-spotlight-title']} onClick={() => onCardClick(item)}>{title}</h2>
        <div className={styles['recommend-spotlight-meta']}>
          {ratingToDisplay ? (
            <span className={`${styles['recommend-spotlight-rating']} ${styles[`is-${ratingSource}`]}`}>
              <Star size={14} fill="currentColor" /> {ratingToDisplay.toFixed(1)}
            </span>
          ) : null}
          {year ? <span className={styles['recommend-spotlight-year']}>{year}</span> : null}
        </div>
        <p className={styles['recommend-spotlight-overview']}>{item.overview}</p>
        <div className={styles['recommend-spotlight-actions']}>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              const type = item.media_type || item.type || (item.title ? 'movie' : 'tv');
              onWatchlist(item, type);
            }}
            className={`${styles['recommend-watchlist-btn']} ${isWatchlisted ? 'is-watchlisted' : ''}`}
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
    <div className={styles['recommend-carousel']}>
      <h3 className={styles['recommend-carousel-title']}>{title}</h3>

      <div className={styles['recommend-carousel-shell']}>
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

        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className={`${styles['recommend-carousel-track']} no-scrollbar`}
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

            let subtitle = null;
            if (n.isPerson) {
              subtitle = roleLabel;
            } else if (!n.isScene) {
              subtitle = yearLabel;
            }

            return (
              <PosterCard
                key={item.id}
                className={`${styles['recommend-card']} ${n.isScene ? styles['recommend-card--scene'] : ''} ${n.shouldBlur ? 'is-blurred' : ''}`}
                aspect={n.isScene ? 'mixed-landscape' : 'poster'}
                imageWrapperClassName={styles['recommend-card-image-wrapper']}
                imageUrl={posterUrl}
                onClick={() => onCardClick(item)}
                isWatched={item.is_watched}
                title={item.title || item.name}
                subtitle={subtitle}
                performers={n.isScene ? performers : null}
                date={n.isScene ? displayDate : null}
                ratingImdb={n.ratingImdb}
                ratingTmdb={n.ratingTmdb}
                ratingPill={null}
                userRating={Number(item?.user_rating) || 0}
                isFavorite={!!item?.is_favorite}
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
                  <div className={styles['recommend-card-overlay']}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        const type = n.isScene ? 'scene' : (item.media_type || item.type || (item.title ? 'movie' : 'tv'));
                        onWatchlist(item, type);
                      }}
                      className={`${posterCardStyles['action-btn']} ${isWatchlisted ? '' : posterCardStyles['action-btn--neutral']}`}
                      variant="unstyled"
                    >
                      {isWatchlisted ? (
                        <>
                          <span className={posterCardStyles['action-btn-state-default']}>
                            <Check size={12} strokeWidth={3} /> {T('dashboard.watchlist.added') || 'Watchlisted'}
                          </span>
                          <span className={posterCardStyles['action-btn-state-hover']}>
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
            <div className={`${styles['recommend-card']} ${styles['recommend-card-loading-wrapper']}`}>
              <Spinner />
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
  <div className={styles['recommend-skeleton']}>
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
    console.log('[handlePlayClick] Received item:', item);
    if (playMutation.isPending) return;

    const isTv = item.media_type === 'tv' || item.media_type === 'episode' || item.type === 'tv' || item.type === 'episode' || String(item.id).startsWith('tv_');
    console.log('[handlePlayClick] isTv:', isTv, 'media_type:', item.media_type, 'type:', item.type);
    if (!isTv) {
      const playId = item.in_library ? item.media_item_id : item.id;
      console.log('[handlePlayClick] Playing as non-TV. playId:', playId);
      playMutation.mutate(playId);
      return;
    }

    try {
      const tvId = String(item.id).replace('tv_', '').replace('tmdb_', '');
      console.log('[handlePlayClick] TV ID resolved:', tvId);
      const tvDetail = await api.library.getTvDetail(tvId, { seasonsLimit: 99, initialEpisodesLimit: 999 });
      console.log('[handlePlayClick] Fetched tvDetail:', tvDetail);
      
      const seasons = Array.isArray(tvDetail?.seasons)
        ? [...tvDetail.seasons]
            .filter((s) => s.season_number > 0)
            .sort((a, b) => Number(a.season_number || 0) - Number(b.season_number || 0))
        : [];
      let nextEpisode = null;

      for (const season of seasons) {
        const ownedEpisodes = (season.episodes || [])
          .filter((episode) => episode.path && !episode.is_missing)
          .sort((a, b) => Number(a.episode_number || 0) - Number(b.episode_number || 0));
        const inProgress = ownedEpisodes.find((episode) => episode.resume_position > 0);
        if (inProgress) {
          nextEpisode = inProgress;
          break;
        }
      }

      if (!nextEpisode) {
        for (const season of seasons) {
          const ownedEpisodes = (season.episodes || [])
            .filter((episode) => episode.path && !episode.is_missing)
            .sort((a, b) => Number(a.episode_number || 0) - Number(b.episode_number || 0));
          const unwatched = ownedEpisodes.find((episode) => !episode.is_watched);
          if (unwatched) {
            nextEpisode = unwatched;
            break;
          }
        }
      }

      if (!nextEpisode) {
        for (const season of seasons) {
          const ownedEpisodes = (season.episodes || [])
            .filter((episode) => episode.path && !episode.is_missing)
            .sort((a, b) => Number(a.episode_number || 0) - Number(b.episode_number || 0));
          if (ownedEpisodes.length > 0) {
            nextEpisode = ownedEpisodes[0];
            break;
          }
        }
      }

      console.log('[handlePlayClick] Resolved nextEpisode:', nextEpisode);

      if (nextEpisode?.id) {
        console.log('[handlePlayClick] Mutating with nextEpisode.id:', nextEpisode.id);
        playMutation.mutate(nextEpisode.id);
      } else if (item.media_item_id) {
        console.log('[handlePlayClick] Fallback: mutating with item.media_item_id:', item.media_item_id);
        playMutation.mutate(item.media_item_id);
      } else {
        console.log('[handlePlayClick] No episode or media_item_id found!');
      }
    } catch (err) {
      console.error('Failed to play TV show:', err);
      if (item.media_item_id) {
        console.log('[handlePlayClick] Catch fallback: mutating with item.media_item_id:', item.media_item_id);
        playMutation.mutate(item.media_item_id);
      }
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

  const handleWatchlist = useCallback((item, type) => {
    const id = item.id;
    const isWatchlisted = actualWatchlistIds.includes(id);
    if (isWatchlisted) {
      setOptimisticWatchlistIds((prev) => (prev || watchlistIdsFromQuery || []).filter((i) => i !== id));
      removeFromWatchlistMutation.mutate(id);
    } else {
      setOptimisticWatchlistIds((prev) => [...(prev || watchlistIdsFromQuery || []), id]);
      addToWatchlistMutation.mutate({
        tmdbId: item.in_library ? undefined : id,
        mediaItemId: item.in_library ? id : undefined,
        type
      });
    }
  }, [actualWatchlistIds, watchlistIdsFromQuery, addToWatchlistMutation, removeFromWatchlistMutation]);

  return { actualWatchlistIds, handleWatchlist };
};

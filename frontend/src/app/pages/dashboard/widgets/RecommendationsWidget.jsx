import { useCallback, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Star, Plus, Minus, Play, Heart } from '@/ui/icons';
import { useUi } from '../../../providers/UiProvider';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import { normalizeMediaEntity } from '../../../lib/normalizeMediaEntity';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../../../queries/dashboardQueries';
import { useSettingsQuery } from '../../../queries/settingsQueries';
import { usePlayMediaMutation } from '../../../queries';
import Button from '../../../ui/Button';
import IconButton from '../../../ui/IconButton';
import Badge from '../../../ui/Badge';
import CardMetadata from '../../../ui/CardMetadata';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import { API_BASE } from '../../../lib/backend';
import api from '../../../lib/api';
import TMDBDiscoveryWidget from './TMDBDiscoveryWidget';
import Skeleton from '../../../ui/Skeleton';
import PosterCard from '../../../ui/PosterCard';
import AdultOverlay from '../../../ui/AdultOverlay';

const ADULT_LABEL = '18+';

const SpotlightBanner = ({ item, watchlistIds, onWatchlist, onCardClick, T }) => {
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

const renderUserRatingBadge = (item) => {
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

const renderFavoriteBadge = (item, T) => {
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

const RecommendationCarousel = ({
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
  const [showRight, setShowRight] = useState(true);
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
                <div className="recommend-card-person-subtitle">
                  {roleLabel}
                </div>
              );
            } else if (n.isScene) {
              subtitle = (
                <div className="recommend-card-scene-subtitle">
                  <span className="recommend-card-performers">
                    {performers.map((p, idx) => (
                      // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
                      <span
                        key={p.id}
                        className="recommend-card-performer-link"
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
                  {displayDate && <span>{displayDate}</span>}
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
                ratingPorndb={n.ratingPorndb}
                topRightBadge={renderFavoriteBadge(item, T)}
                badge={renderUserRatingBadge(item)}
                previewItemId={item.id}
                previewEnabled={n.isScene && !n.shouldBlur}
                playOverlay={!n.isPerson && item.in_library && onPlayClick ? {
                  icon: <Play size={12} fill="currentColor" />,
                  onClick: (e) => onPlayClick(e, item),
                  title: T('library.details.play') || 'Play',
                  disabled: playMutationPending
                } : null}
              >
                {n.shouldBlur && (
                  <AdultOverlay variant="blur" badgeText={ADULT_LABEL} />
                )}
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

const RecommendationSkeleton = ({ showBanner = false }) => (
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

const RecommendationsWidget = ({ language, T, visibleWidgets = {} }) => {
  const { toast } = useUi();
  const navigate = useNavigate();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings } = useSettingsQuery();
  const includeAdult = sessionMode === 'nsfw';
  const { data: recommendations, isLoading } = useRecommendationsQuery(language, includeAdult);
  const addToWatchlist = useAddToWatchlistMutation();
  const removeFromWatchlist = useRemoveFromWatchlistMutation();
  const playMutation = usePlayMediaMutation();

  const [recentlyAddedItems, setRecentlyAddedItems] = useState([]);
  const [recentlyAddedPage, setRecentlyAddedPage] = useState(1);
  const [hasMoreRecentlyAdded, setHasMoreRecentlyAdded] = useState(true);
  const [isLoadingMoreAdded, setIsLoadingMoreAdded] = useState(false);

  const [recentlyActivePeople, setRecentlyActivePeople] = useState([]);
  const [recentlyActivePage, setRecentlyActivePage] = useState(1);
  const [hasMorePeople, setHasMorePeople] = useState(true);
  const [isLoadingMorePeople, setIsLoadingMorePeople] = useState(false);

  const [prevRecommendations, setPrevRecommendations] = useState(null);
  if (recommendations && recommendations !== prevRecommendations) {
    setPrevRecommendations(recommendations);
    setRecentlyAddedItems(recommendations.recently_added || []);
    setRecentlyAddedPage(1);
    setHasMoreRecentlyAdded((recommendations.recently_added || []).length === 20);

    setRecentlyActivePeople(recommendations.recently_activated_people || []);
    setRecentlyActivePage(1);
    setHasMorePeople((recommendations.recently_activated_people || []).length === 20);
  }

  const handleLoadMoreAdded = async () => {
    if (isLoadingMoreAdded || !hasMoreRecentlyAdded) return;
    setIsLoadingMoreAdded(true);
    const nextPage = recentlyAddedPage + 1;
    try {
      const data = await api.recommendations.getRecentlyAdded(nextPage, 20, includeAdult, language);
      if (data && data.length > 0) {
        setRecentlyAddedItems((prev) => [...prev, ...data]);
        setRecentlyAddedPage(nextPage);
        setHasMoreRecentlyAdded(data.length === 20);
      } else {
        setHasMoreRecentlyAdded(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMoreAdded(false);
    }
  };

  const handleLoadMorePeople = async () => {
    if (isLoadingMorePeople || !hasMorePeople) return;
    setIsLoadingMorePeople(true);
    const nextPage = recentlyActivePage + 1;
    try {
      const data = await api.recommendations.getRecentlyActivatedPeople(nextPage, 20, includeAdult);
      if (data && data.length > 0) {
        setRecentlyActivePeople((prev) => [...prev, ...data]);
        setRecentlyActivePage(nextPage);
        setHasMorePeople(data.length === 20);
      } else {
        setHasMorePeople(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMorePeople(false);
    }
  };

  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids;
  const [prevWatchlistIds, setPrevWatchlistIds] = useState(null);
  const [optimisticWatchlistIds, setOptimisticWatchlistIds] = useState(null);

  if (watchlistIdsFromQuery !== prevWatchlistIds) {
    setPrevWatchlistIds(watchlistIdsFromQuery);
    setOptimisticWatchlistIds(null);
  }

  const actualWatchlistIds = optimisticWatchlistIds !== null ? optimisticWatchlistIds : (watchlistIdsFromQuery || []);

  const handleWatchlist = async (tmdbId, type) => {
    const isWatchlisted = actualWatchlistIds.includes(tmdbId);

    // Optimistic toggle
    if (isWatchlisted) {
      setOptimisticWatchlistIds(actualWatchlistIds.filter((id) => id !== tmdbId));
    } else {
      setOptimisticWatchlistIds([...actualWatchlistIds, tmdbId]);
    }

    try {
      if (isWatchlisted) {
        await removeFromWatchlist.mutateAsync(tmdbId);
      } else {
        await addToWatchlist.mutateAsync({ tmdbId, type });
      }
    } catch (error) {
      console.error(error);
      // Revert optimistic update
      if (isWatchlisted) {
        setOptimisticWatchlistIds(actualWatchlistIds.filter((id) => id !== tmdbId).concat(tmdbId));
      } else {
        setOptimisticWatchlistIds(actualWatchlistIds.filter((id) => id !== tmdbId));
      }
      toast(T(isWatchlisted ? 'dashboard.watchlist.remove_failed' : 'dashboard.watchlist.add_failed') || 'Action failed', 'danger');
    }
  };

  const handlePlayClick = useCallback(async (event, item) => {
    event.stopPropagation();
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
    } catch {
      // Ignore
    }
  }, [playMutation]);

  const handleCardClick = (item) => {
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
  };

  const isWidgetVisible = (key) => visibleWidgets[key] !== false;

  return (
    <>
      {isLoading && isWidgetVisible('spotlight') && <RecommendationSkeleton showBanner />}

      {!isLoading && isWidgetVisible('spotlight') && recommendations?.trending?.length > 0 && (
        <SpotlightBanner
          item={recommendations.trending[0]}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          T={T}
        />
      )}

      {isLoading && (isWidgetVisible('movies_discovery') || isWidgetVisible('tv_discovery') || (isWidgetVisible('adult') && settings?.include_adult)) && (
        <RecommendationSkeleton />
      )}

      {!isLoading && isWidgetVisible('recently_added') && recentlyAddedItems?.length > 0 && (
        <RecommendationCarousel
          title={T('dashboard.recommendations.recently_added') || 'Recently Added'}
          items={recentlyAddedItems}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          T={T}
          onLoadMore={handleLoadMoreAdded}
          hasMore={hasMoreRecentlyAdded}
          isLoadingMore={isLoadingMoreAdded}
          settings={settings}
          onPlayClick={handlePlayClick}
          playMutationPending={playMutation.isPending}
        />
      )}

      {!isLoading && isWidgetVisible('recently_activated_people') && recentlyActivePeople?.length > 0 && (
        <RecommendationCarousel
          title={T(includeAdult ? 'dashboard.recommendations.recently_activated_people_adult' : 'dashboard.recommendations.recently_activated_people') || (includeAdult ? 'Recently Followed Adult Stars' : 'Recently Tracked People')}
          items={recentlyActivePeople.map(p => ({
            ...p,
            media_type: 'person'
          }))}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          T={T}
          onLoadMore={handleLoadMorePeople}
          hasMore={hasMorePeople}
          isLoadingMore={isLoadingMorePeople}
        />
      )}

      {!isLoading && isWidgetVisible('movies_discovery') && recommendations?.discover_movies?.length > 0 && (
        <RecommendationCarousel
          title={T('dashboard.recommendations.discover_movies') || 'Discover Movies'}
          items={recommendations.discover_movies}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          T={T}
          onPlayClick={handlePlayClick}
          playMutationPending={playMutation.isPending}
        />
      )}

      {!isLoading && isWidgetVisible('tv_discovery') && recommendations?.discover_tv?.length > 0 && (
        <RecommendationCarousel
          title={T('dashboard.recommendations.discover_series') || 'Discover TV Shows'}
          items={recommendations.discover_tv}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          T={T}
          onPlayClick={handlePlayClick}
          playMutationPending={playMutation.isPending}
        />
      )}

      {isWidgetVisible('top_20') && settings?.tmdb_api_key && <TMDBDiscoveryWidget T={T} />}

      {!isLoading && isWidgetVisible('adult') && settings?.include_adult && recommendations?.discover_adult?.length > 0 && (
        <RecommendationCarousel
          title={T('dashboard.recommendations.discover_adult') || 'Discover Adult Movies'}
          items={recommendations.discover_adult}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          T={T}
          isAdultCarousel={true}
          onPlayClick={handlePlayClick}
          playMutationPending={playMutation.isPending}
        />
      )}
    </>
  );
};

RecommendationsWidget.propTypes = {
  language: PropTypes.string,
  T: PropTypes.func.isRequired,
  visibleWidgets: PropTypes.object,
};

export default RecommendationsWidget;

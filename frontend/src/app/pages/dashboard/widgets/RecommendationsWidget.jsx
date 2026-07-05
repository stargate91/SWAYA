import { useCallback, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Star, Plus, Minus } from '@/ui/icons';
import { useUi } from '../../../providers/UiProvider';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../../../queries/dashboardQueries';
import { useSettingsQuery } from '../../../queries/settingsQueries';
import Button from '../../../ui/Button';
import Pill from '../../../ui/Pill';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import { API_BASE } from '../../../lib/backend';
import api from '../../../lib/api';
import TMDBDiscoveryWidget from './TMDBDiscoveryWidget';

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
            className="recommend-carousel-arrow is-left"
            onClick={() => scroll('left')}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {showRight && (
          <button
            className="recommend-carousel-arrow is-right"
            onClick={() => scroll('right')}
          >
            <ChevronRight size={24} />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="recommend-carousel-track"
        >
          {items.map((item) => {
            const isWatchlisted = watchlistIds.includes(item.id);
            const isPerson = item.media_type === 'person' || (!item.hasOwnProperty('title') && item.hasOwnProperty('profile_path'));
            const isScene = item.media_type === 'scene';
            const rawPosterUrl = isPerson
              ? resolveMediaImageUrl(item.profile_path || item.local_profile_path, 'personThumb')
              : resolveMediaImageUrl(isScene ? (item.backdrop_path || item.poster_path) : item.poster_path, isScene ? 'backdrop' : 'poster');
            const shouldBlur = (isAdultCarousel || isScene) && sessionMode !== 'nsfw';
            const posterUrl = (shouldBlur && rawPosterUrl)
              ? `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(rawPosterUrl)}&blur=true`
              : rawPosterUrl;
            const ratingImdb = item.rating_imdb;
            const ratingTmdb = item.rating_tmdb || item.vote_average;
            const ratingPorndb = item.rating_porndb;
            const hasRating = (ratingImdb && ratingImdb > 0) || (ratingTmdb && ratingTmdb > 0) || (ratingPorndb && ratingPorndb > 0);

            const isTv = !isPerson && !isScene && (item.media_type === 'tv' || item.media_type === 'episode' || !item.title);
            let yearLabel = null;
            if (isPerson || isScene) {
              // No year label
            } else if (isTv) {
              const firstAirYear = item.first_air_date ? new Date(item.first_air_date).getFullYear() : null;
              const lastAirYear = item.last_air_date ? new Date(item.last_air_date).getFullYear() : null;
              const isEnded = item.release_status?.toLowerCase() === 'ended';
              if (firstAirYear) {
                yearLabel = isEnded && lastAirYear
                  ? `${firstAirYear} - ${lastAirYear}`
                  : `${firstAirYear} - `;
              }
            } else {
              yearLabel = item.release_date ? new Date(item.release_date).getFullYear() : null;
            }

            const genderPref = settings?.adult_gender_preference;
            const allPeople = item.people || [];
            const filteredPeople = genderPref && genderPref !== 'all'
              ? allPeople.filter(p => {
                if (genderPref === 'female') return p.gender === 1;
                if (genderPref === 'male') return p.gender === 2;
                return true;
              })
              : allPeople;
            const performers = filteredPeople.slice(0, 3);
            const displayDate = item.release_date ? item.release_date.substring(0, 10) : '';

            let roleLabel = null;
            if (isPerson) {
              const dept = item.known_for_department || (item.is_adult ? 'performer' : 'artist');
              roleLabel = T(`lists.roles.${dept.toLowerCase()}`) || dept;
            }

            return (
              <div
                key={item.id}
                className={`recommend-card ${isScene ? 'recommend-card--scene' : ''}`}
                onClick={() => onCardClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onCardClick(item);
                  }
                }}
              >
                <div className={`recommend-card-poster-shell ${shouldBlur ? 'is-blurred' : ''}`}>
                  {posterUrl && (
                    <img
                      key={posterUrl}
                      src={posterUrl}
                      alt={item.title || item.name}
                      className="recommend-card-image"
                    />
                  )}
                  {shouldBlur && (
                    <div className="recommend-card-blur-overlay">
                      <span className="settings-badge settings-badge--danger">{ADULT_LABEL}</span>
                    </div>
                  )}
                  {!isPerson && (
                    <div className="recommend-card-overlay">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onWatchlist(item.id, item.title ? 'movie' : 'tv');
                        }}
                        className={`recommend-card-watchlist-btn ${isWatchlisted ? 'is-active' : ''}`}
                        variant="unstyled"
                      >
                        {isWatchlisted ? (
                          <>
                            <span className="watchlist-btn-state-default">
                              <Check size={12} strokeWidth={3} /> {T('dashboard.watchlist.added') || 'Watchlisted'}
                            </span>
                            <span className="watchlist-btn-state-hover">
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
                </div>

                <div className="recommend-card-meta">
                  <div className="recommend-card-name" title={item.title || item.name}>{item.title || item.name}</div>
                  {isPerson ? (
                    <div className="recommend-card-secondary" style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {roleLabel}
                    </div>
                  ) : isScene ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {performers.map((p, idx) => (
                          <span
                            key={p.id}
                            style={{ cursor: 'pointer', color: 'var(--color-accent-blue-soft, #56a5ff)' }}
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
                  ) : (
                    (yearLabel || hasRating) ? (
                      <div className="recommend-card-secondary">
                        {yearLabel ? <span className="recommend-card-year">{yearLabel}</span> : null}
                        <div className="recommend-card-ratings">
                          {ratingImdb && ratingImdb > 0 ? (
                            <Pill variant="imdb">
                              <Star size={10} fill="currentColor" /> {ratingImdb.toFixed(1)}
                            </Pill>
                          ) : (ratingTmdb && ratingTmdb > 0) ? (
                            <Pill variant="tmdb">
                              <Star size={10} fill="currentColor" /> {ratingTmdb.toFixed(1)}
                            </Pill>
                          ) : (ratingPorndb && ratingPorndb > 0) ? (
                            <Pill variant="porndb">
                              <Star size={10} fill="currentColor" /> {ratingPorndb.toFixed(1)}
                            </Pill>
                          ) : null}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
          {isLoadingMore && (
            <div className="recommend-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '150px', height: '225px' }}>
              <div className="dashboard-spinner" style={{ width: '24px', height: '24px' }} />
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
};

const RecommendationSkeleton = ({ showBanner = false }) => (
  <div className="recommend-skeleton">
    {showBanner && (
      <div className="recommend-skeleton-banner dashboard-widget-shell-skeleton" />
    )}
    <div className="recommend-skeleton-title dashboard-widget-shell-skeleton" />
    <div className="recommend-skeleton-row">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="recommend-skeleton-card dashboard-widget-shell-skeleton"
        />
      ))}
    </div>
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

  const [recentlyAddedItems, setRecentlyAddedItems] = useState([]);
  const [recentlyAddedPage, setRecentlyAddedPage] = useState(1);
  const [hasMoreRecentlyAdded, setHasMoreRecentlyAdded] = useState(true);
  const [isLoadingMoreAdded, setIsLoadingMoreAdded] = useState(false);

  const [recentlyActivePeople, setRecentlyActivePeople] = useState([]);
  const [recentlyActivePage, setRecentlyActivePage] = useState(1);
  const [hasMorePeople, setHasMorePeople] = useState(true);
  const [isLoadingMorePeople, setIsLoadingMorePeople] = useState(false);

  useEffect(() => {
    if (!recommendations) return;
    setRecentlyAddedItems(recommendations.recently_added || []);
    setRecentlyAddedPage(1);
    setHasMoreRecentlyAdded((recommendations.recently_added || []).length === 20);

    setRecentlyActivePeople(recommendations.recently_activated_people || []);
    setRecentlyActivePage(1);
    setHasMorePeople((recommendations.recently_activated_people || []).length === 20);
  }, [recommendations]);

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

      {isLoading && (isWidgetVisible('movies_discovery') || isWidgetVisible('tv_discovery') || isWidgetVisible('adult')) && (
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
        />
      )}

      {!isLoading && isWidgetVisible('recently_activated_people') && recentlyActivePeople?.length > 0 && (
        <RecommendationCarousel
          title={T('dashboard.recommendations.recently_activated_people') || 'Recently Tracked People'}
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
        />
      )}

      {isWidgetVisible('top_20') && <TMDBDiscoveryWidget T={T} />}

      {!isLoading && isWidgetVisible('adult') && recommendations?.discover_adult?.length > 0 && (
        <RecommendationCarousel
          title={T('dashboard.recommendations.discover_adult') || 'Discover Adult Movies'}
          items={recommendations.discover_adult}
          watchlistIds={actualWatchlistIds}
          onWatchlist={handleWatchlist}
          onCardClick={handleCardClick}
          T={T}
          isAdultCarousel={true}
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

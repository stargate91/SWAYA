import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, Minus, ChevronLeft, ChevronRight } from '@/ui/icons';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../../../queries/dashboardQueries';
import Button from '../../../ui/Button';
import CardMetadata from '../../../ui/CardMetadata';
import Dropdown from '../../../ui/Dropdown';
import DashboardWidgetShell from './DashboardWidgetShell';
import { API_BASE } from '../../../lib/backend';
import PosterCard from '../../../ui/PosterCard';

const GENRES = [
  { value: '', label: 'All Genres' },
  { value: 28, label: 'Action' },
  { value: 12, label: 'Adventure' },
  { value: 16, label: 'Animation' },
  { value: 35, label: 'Comedy' },
  { value: 80, label: 'Crime' },
  { value: 99, label: 'Documentary' },
  { value: 18, label: 'Drama' },
  { value: 10751, label: 'Family' },
  { value: 14, label: 'Fantasy' },
  { value: 36, label: 'History' },
  { value: 27, label: 'Horror' },
  { value: 10402, label: 'Music' },
  { value: 9648, label: 'Mystery' },
  { value: 10749, label: 'Romance' },
  { value: 878, label: 'Sci-Fi' },
  { value: 53, label: 'Thriller' },
  { value: 10752, label: 'War' },
  { value: 37, label: 'Western' },
];

const YEARS = (() => {
  const currentYear = new Date().getFullYear();
  const list = [{ value: '', label: 'All Time' }];
  for (let y = currentYear; y >= 1950; y--) {
    list.push({ value: y, label: String(y) });
  }
  return list;
})();

const TMDBDiscoveryWidget = ({ T }) => {
  const navigate = useNavigate();
  const [genreId, setGenreId] = useState('');
  const [year, setYear] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const { data: recommendations } = useRecommendationsQuery();
  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids || [];
  const [prevWatchlistIds, setPrevWatchlistIds] = useState(null);
  const [optimisticWatchlistIds, setOptimisticWatchlistIds] = useState(null);

  if (watchlistIdsFromQuery !== prevWatchlistIds) {
    setPrevWatchlistIds(watchlistIdsFromQuery);
    setOptimisticWatchlistIds(null);
  }

  const actualWatchlistIds = optimisticWatchlistIds !== null ? optimisticWatchlistIds : watchlistIdsFromQuery;

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();

  const updateArrows = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setShowLeft(element.scrollLeft > 10);
    setShowRight(element.scrollLeft < element.scrollWidth - element.clientWidth - 10);
  }, []);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/api/v1/recommendations/discover?`;
        if (genreId) url += `genre_id=${genreId}&`;
        if (year) url += `year=${year}&`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setItems(data || []);
            // Reset scroll position and recalculate arrows
            if (scrollRef.current) {
              scrollRef.current.scrollLeft = 0;
            }
            setTimeout(updateArrows, 100);
          }
        }
      } catch (err) {
        console.error('Failed to discover items:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [genreId, year, updateArrows]);

  const handleWatchlist = async (tmdbId, isWatchlisted) => {
    // Optimistic toggle
    if (isWatchlisted) {
      setOptimisticWatchlistIds(actualWatchlistIds.filter((id) => id !== tmdbId));
    } else {
      setOptimisticWatchlistIds([...actualWatchlistIds, tmdbId]);
    }

    try {
      if (isWatchlisted) {
        await removeFromWatchlistMutation.mutateAsync(tmdbId);
      } else {
        await addToWatchlistMutation.mutateAsync({ tmdbId, type: 'movie' });
      }
    } catch (error) {
      console.error(error);
      // Revert optimistic update
      if (isWatchlisted) {
        setOptimisticWatchlistIds(actualWatchlistIds.filter((id) => id !== tmdbId).concat(tmdbId));
      } else {
        setOptimisticWatchlistIds(actualWatchlistIds.filter((id) => id !== tmdbId));
      }
    }
  };

  const handleCardClick = (item) => {
    const type = item.media_type || 'movie';
    const idToUse = item.in_library ? item.media_item_id : `tmdb_${item.id}`;
    navigate(`/library/${type}/${idToUse}`, { state: { allowAdult: true } });
  };

  const scroll = (direction) => {
    const element = scrollRef.current;
    if (!element) return;
    const amount = element.clientWidth * 0.75;
    element.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const translatedGenres = useMemo(() => {
    return GENRES.map(g => ({
      value: g.value,
      label: g.value === '' ? (T('dashboard.recommendations.genres_all') || 'All Genres') : (T(`library.genres.${g.label}`, { defaultValue: g.label }) || g.label)
    }));
  }, [T]);

  const translatedYears = useMemo(() => {
    return YEARS.map(y => ({
      value: y.value,
      label: y.value === '' ? (T('dashboard.recommendations.years_all') || 'All Time') : y.label
    }));
  }, [T]);

  return (
    <div className="recommend-carousel">
      <div className="recommend-carousel-header">
        <h3 className="recommend-carousel-title recommend-carousel-title--header">
          {T('dashboard.recommendations.discovery_title') || 'Top 20 Discoveries'}
        </h3>
        
        <div className="recommend-carousel-filters">
          <Dropdown
            options={translatedGenres}
            value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            className="recommend-carousel-filter-genre"
          />

          <Dropdown
            options={translatedYears}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="recommend-carousel-filter-year"
          />
        </div>
      </div>

      <DashboardWidgetShell loading={loading} size="lg" transparent={true}>
        {items.length === 0 ? (
          <div className="recommend-carousel-no-results">
            {T('dashboard.recommendations.discovery_no_results') || 'No popular movies found matching filters.'}
          </div>
        ) : (
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
              className={`recommend-carousel-track no-scrollbar ${loading ? 'is-loading' : ''}`}
              onScroll={updateArrows}
            >
              {items.map((item) => {
                const posterUrl = resolveMediaImageUrl(item.poster_path, 'poster');
                const isWatchlisted = actualWatchlistIds.includes(item.id);
                const ratingImdb = item.rating_imdb;
                const ratingTmdb = item.rating_tmdb || item.vote_average;
                const yearLabel = item.release_date ? new Date(item.release_date).getFullYear() : null;

                return (
                  <PosterCard
                    key={item.id}
                    className="recommend-card"
                    imageUrl={posterUrl}
                    onClick={() => handleCardClick(item)}
                    title={item.title}
                    subtitle={yearLabel ? String(yearLabel) : null}
                    ratingImdb={ratingImdb}
                    ratingTmdb={ratingTmdb}
                  >
                    <div className="recommend-card-overlay">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWatchlist(item.id, isWatchlisted);
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
                  </PosterCard>
                );
              })}
            </div>
          </div>
        )}
      </DashboardWidgetShell>
    </div>
  );
};

TMDBDiscoveryWidget.propTypes = {
  T: PropTypes.func.isRequired,
};

export default TMDBDiscoveryWidget;

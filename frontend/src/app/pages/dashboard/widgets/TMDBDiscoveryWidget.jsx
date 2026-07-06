import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Plus, Minus, ChevronLeft, ChevronRight } from '@/ui/icons';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../../../queries/dashboardQueries';
import Button from '../../../ui/Button';
import Pill from '../../../ui/Pill';
import Dropdown from '../../../ui/Dropdown';
import DashboardWidgetShell from './DashboardWidgetShell';
import { API_BASE } from '../../../lib/backend';

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
  const watchlistIds = recommendations?.watchlist_item_ids || [];

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

  const handleWatchlist = (tmdbId, isWatchlisted) => {
    if (isWatchlisted) {
      removeFromWatchlistMutation.mutate(tmdbId);
    } else {
      addToWatchlistMutation.mutate({ tmdbId, type: 'movie' });
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
      <div className="recommend-carousel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
        <h3 className="recommend-carousel-title" style={{ margin: 0 }}>
          {T('dashboard.recommendations.discovery_title') || 'Top 20 Discoveries'}
        </h3>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <Dropdown
            options={translatedGenres}
            value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            style={{ width: '160px' }}
          />

          <Dropdown
            options={translatedYears}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ width: '130px' }}
          />
        </div>
      </div>

      <DashboardWidgetShell loading={loading} size="lg" transparent={true}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted, #888899)' }}>
            {T('dashboard.recommendations.discovery_no_results') || 'No popular movies found matching filters.'}
          </div>
        ) : (
          <div className="recommend-carousel-shell">
            {showLeft && (
              <button
                className="recommend-carousel-arrow is-left"
                onClick={() => scroll('left')}
                style={{ zIndex: 10 }}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {showRight && (
              <button
                className="recommend-carousel-arrow is-right"
                onClick={() => scroll('right')}
                style={{ zIndex: 10 }}
              >
                <ChevronRight size={24} />
              </button>
            )}

            <div
              ref={scrollRef}
              className="recommend-carousel-track"
              onScroll={updateArrows}
              style={{
                opacity: loading ? 0.5 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {items.map((item) => {
                const posterUrl = resolveMediaImageUrl(item.poster_path, 'poster');
                const isWatchlisted = watchlistIds.includes(item.id);
                const ratingImdb = item.rating_imdb;
                const ratingTmdb = item.rating_tmdb || item.vote_average;
                const yearLabel = item.release_date ? new Date(item.release_date).getFullYear() : null;

                return (
                  <div
                    key={item.id}
                    className="recommend-card"
                    onClick={() => handleCardClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCardClick(item);
                      }
                    }}
                  >
                    <div className="recommend-card-poster-shell">
                      {posterUrl && (
                        <img
                          src={posterUrl}
                          alt={item.title}
                          className="recommend-card-image"
                          loading="lazy"
                        />
                      )}
                      <div className="recommend-card-overlay">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWatchlist(item.id, isWatchlisted);
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
                    </div>

                    <div className="recommend-card-meta">
                      <div className="recommend-card-name" style={{ fontSize: '14px', fontWeight: '600' }}>
                        {item.title}
                      </div>
                      <div className="recommend-card-secondary">
                        {yearLabel ? <span className="recommend-card-year">{yearLabel}</span> : null}
                        <div className="recommend-card-ratings">
                          {ratingImdb && ratingImdb > 0 ? (
                            <Pill variant="imdb">
                              <Star size={10} fill="currentColor" /> {ratingImdb.toFixed(1)}
                            </Pill>
                          ) : null}
                          {ratingTmdb && ratingTmdb > 0 ? (
                            <Pill variant="tmdb">
                              <Star size={10} fill="currentColor" /> {ratingTmdb.toFixed(1)}
                            </Pill>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
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

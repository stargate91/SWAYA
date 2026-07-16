import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from '@/ui/icons';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
  useDiscoverQuery,
} from '../../../queries/dashboardQueries';
import Dropdown from '../../../ui/Dropdown';
import WidgetShell from '@/ui/WidgetShell';
import PosterCard from '../../../ui/PosterCard';
import IconButton from '../../../ui/IconButton';
import posterCardStyles from '../../../ui/PosterCard.module.css';
import styles from './RecommendationsWidget.module.css';
import { useWatchlistHandler } from './hooks/useWatchlistHandler';
import Button from '../../../ui/Button';
import Inline from '../../../ui/Inline';
import { Check, Plus, Minus } from '@/ui/icons';
import { useTranslation } from '../../../providers/LanguageContext';

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

const TMDBDiscoveryWidget = () => {
  const { t: T } = useTranslation();
  const navigate = useNavigate();
  const [genreId, setGenreId] = useState('');
  const [year, setYear] = useState('');

  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const { data: recommendations } = useRecommendationsQuery();
  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids;

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();

  const { actualWatchlistIds, handleWatchlist } = useWatchlistHandler(
    watchlistIdsFromQuery,
    addToWatchlistMutation,
    removeFromWatchlistMutation
  );

  const { data: items = [], isLoading: loading } = useDiscoverQuery(genreId, year);

  const updateArrows = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setShowLeft(element.scrollLeft > 10);
    setShowRight(element.scrollLeft < element.scrollWidth - element.clientWidth - 10);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    setTimeout(updateArrows, 100);
  }, [genreId, year, items, updateArrows]);

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
    <div className={styles['recommend-carousel']}>
      <Inline gap="lg" align="center" className={styles['recommend-carousel-header']}>
        <h3 className={`${styles['recommend-carousel-title']} ${styles['recommend-carousel-title--header']}`}>
          {T('dashboard.recommendations.discovery_title') || 'Top 20 Discoveries'}
        </h3>
        
        <Inline gap="md" align="center" className={styles['recommend-carousel-filters']}>
          <Dropdown
            options={translatedGenres}
            value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            className={styles['recommend-carousel-filter-genre']}
          />

          <Dropdown
            options={translatedYears}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={styles['recommend-carousel-filter-year']}
          />
        </Inline>
      </Inline>

      <WidgetShell loading={loading} size="lg" transparent={true}>
        {items.length === 0 ? (
          <div className={styles['recommend-carousel-no-results']}>
            {T('dashboard.recommendations.discovery_no_results') || 'No popular movies found matching filters.'}
          </div>
        ) : (
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
              className={`${styles['recommend-carousel-track']} no-scrollbar ${loading ? styles['is-loading'] : ''}`}
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
                    className={styles['recommend-card']}
                    imageWrapperClassName={styles['recommend-card-image-wrapper']}
                    imageUrl={posterUrl}
                    onClick={() => handleCardClick(item)}
                    title={item.title}
                    subtitle={yearLabel ? String(yearLabel) : null}
                    ratingImdb={ratingImdb}
                    ratingTmdb={ratingTmdb}
                  >
                    <div className={styles['recommend-card-overlay']}>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          const type = item.media_type || 'movie';
                          handleWatchlist(item, type);
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
                  </PosterCard>
                );
              })}
            </div>
          </div>
        )}
      </WidgetShell>
    </div>
  );
};

export default TMDBDiscoveryWidget;

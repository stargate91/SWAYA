import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
  useDiscoverQuery,
} from '@/queries/dashboardQueries';
import { useTranslation } from '@/providers/LanguageContext';
import { useWatchlistHandler } from './useWatchlistHandler';

export const GENRES = [
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

export const YEARS = (() => {
  const currentYear = new Date().getFullYear();
  const list = [{ value: '', label: 'All Time' }];
  for (let y = currentYear; y >= 1950; y--) {
    list.push({ value: y, label: String(y) });
  }
  return list;
})();

export default function useTMDBDiscovery() {
  const { t: T } = useTranslation();
  const navigate = useNavigate();
  const [genreId, setGenreId] = useState('');
  const [year, setYear] = useState('');

  const scrollRef = useRef(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [genreId, year, items]);

  const handleCardClick = (item) => {
    const type = item.media_type || 'movie';
    const idToUse = item.in_library ? item.media_item_id : `tmdb_${item.id}`;
    navigate(`/library/${type}/${idToUse}`, { state: { allowAdult: true } });
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

  return {
    genreId,
    setGenreId,
    year,
    setYear,
    scrollRef,
    items,
    loading,
    actualWatchlistIds,
    handleWatchlist,
    handleCardClick,
    translatedGenres,
    translatedYears,
  };
}

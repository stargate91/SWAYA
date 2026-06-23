import { useState, useMemo } from 'react';
import { MEDIA_TYPES, toMetadataMediaType } from '@/lib/mediaTypes';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import api from '@/lib/api';

const getDefaultType = (row) => toMetadataMediaType(row?.rawType, MEDIA_TYPES.MOVIE);

const getDefaultQuery = (row) => {
  const payload = row?.rawPayload || {};
  return payload.title || payload.fn_title || payload.fd_title || row?.source || '';
};

const getDefaultYear = (row) => {
  const payload = row?.rawPayload || {};
  return payload.year || payload.fn_year || payload.fd_year || '';
};

const getDefaultSeason = (row) => {
  const payload = row?.rawPayload || {};
  return payload.season ?? payload.fn_season ?? payload.fd_season ?? payload.it_season ?? '';
};

const getDefaultEpisode = (row) => {
  const payload = row?.rawPayload || {};
  return payload.episode ?? payload.fn_episode ?? payload.fd_episode ?? payload.it_episode ?? '';
};

export function useMatchSearch({ rows = [], t, toast }) {
  const primaryRow = rows[0] || null;
  const isBulk = rows.length > 1;
  const [query, setQuery] = useState(() => (isBulk ? '' : getDefaultQuery(primaryRow)));
  const [mode, setMode] = useState(() => (isBulk ? MEDIA_TYPES.TV : getDefaultType(primaryRow)));
  const [year, setYear] = useState(() => (isBulk ? '' : String(getDefaultYear(primaryRow) || '')));
  const [season, setSeason] = useState(() => (isBulk ? '' : String(getDefaultSeason(primaryRow) || '')));
  const [episode, setEpisode] = useState(() => (isBulk ? '' : String(getDefaultEpisode(primaryRow) || '')));
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const includeAdult = sessionMode === 'nsfw';
  const [provider, setProvider] = useState(() => (sessionMode === 'nsfw' ? 'porndb' : 'tmdb'));
  const isTvMode = mode === MEDIA_TYPES.TV && provider !== 'porndb';

  const [isSearching, setIsSearching] = useState(false);

  const existingCandidates = useMemo(
    () => {
      if (rows.length > 1) {
        return [];
      }
      return (primaryRow?.rawPayload?.matches || [])
        .filter((match) => (match.provider || 'tmdb') === provider)
        .map((match) => ({
          id: match.tmdb_id,
          tmdb_id: match.tmdb_id,
          type: match.type,
          title: match.title,
          release_date: match.year ? `${match.year}-01-01` : null,
          first_air_date: match.year ? `${match.year}-01-01` : null,
          poster_path: match.poster_path,
          vote_average: match.vote_average,
          confidence: match.confidence,
          is_active: match.is_active,
          source: 'existing',
          provider: match.provider || 'tmdb',
        }));
    },
    [primaryRow, rows.length, provider],
  );

  const performSearch = async (resetBrowser, searchMode = mode, searchProvider = provider) => {
    console.log('[DEBUG] performSearch called with searchMode:', searchMode, 'searchProvider:', searchProvider, 'query:', query);
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      toast(t('organizer.toasts.matchSearchMissingQuery'), 'danger');
      return false;
    }

    setHasSearched(true);
    resetBrowser();
    setIsSearching(true);
    try {
      console.log('[DEBUG] performSearch: calling api.metadata.search with options:', {
        query: trimmedQuery,
        itemType: searchMode,
        year,
        season,
        episode,
        includeAdult,
        provider: searchProvider,
      });
      const data = await api.metadata.search({
        query: trimmedQuery,
        itemType: searchMode,
        year,
        season,
        episode,
        includeAdult,
        provider: searchProvider,
      });
      console.log('[DEBUG] performSearch success, received data length:', data?.length);
      const searchResults = Array.isArray(data)
        ? data.map((candidate) => ({
            ...candidate,
            media_type: toMetadataMediaType(candidate.media_type || candidate.type || searchMode, searchMode),
          }))
        : [];
      setResults(searchResults);
      return searchResults;
    } catch (error) {
      console.error('[DEBUG] performSearch failed with error:', error);
      toast(error.message || t('organizer.toasts.matchSearchFailed'), 'danger');
      return false;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    query,
    setQuery,
    mode,
    setMode,
    year,
    setYear,
    season,
    setSeason,
    episode,
    setEpisode,
    results,
    setResults,
    hasSearched,
    setHasSearched,
    isSearching,
    isTvMode,
    existingCandidates,
    performSearch,
    provider,
    setProvider,
    sessionMode,
  };
}

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Clapperboard } from '@/ui/icons';
import api from '@/lib/api';
import { useSettingsQuery } from '@/queries/settingsQueries';
import { useTranslation } from '@/providers/LanguageContext';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';

export const SOURCES = [
  { id: 'tmdb', name: 'TMDb', adult: false },
  { id: 'stashdb', name: 'StashDB', adult: true },
  { id: 'fansdb', name: 'FansDB', adult: true },
  { id: 'porndb', name: 'PornDB', adult: true },
];

export const TYPES_BY_SOURCE = {
  tmdb: [
    { id: 'all', name: 'All', icon: Clapperboard },
    { id: 'movie', name: 'Movies', icon: Clapperboard },
    { id: 'tv', name: 'TV Shows', icon: Clapperboard },
    { id: 'person', name: 'People', icon: Clapperboard },
  ],
  stashdb: [
    { id: 'scene', name: 'Scenes', icon: Clapperboard },
    { id: 'person', name: 'Performers', icon: Clapperboard },
  ],
  fansdb: [
    { id: 'scene', name: 'Scenes', icon: Clapperboard },
    { id: 'person', name: 'Performers', icon: Clapperboard },
  ],
  porndb: [
    { id: 'movie', name: 'Movies', icon: Clapperboard },
    { id: 'scene', name: 'Scenes', icon: Clapperboard },
    { id: 'person', name: 'Performers', icon: Clapperboard },
  ],
};

export default function useSearchPageController() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: settings } = useSettingsQuery();
  const { sessionMode } = useLibraryModeStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const urlQuery = searchParams.get('q') || '';
  const urlSource = searchParams.get('source') || 'tmdb';
  const urlType = searchParams.get('type') || 'all';

  // Local state for the input field
  const [localQuery, setLocalQuery] = useState(urlQuery);

  // Component states for results and loading
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);

  const hasAdult = settings?.include_adult;
  const filteredSources = useMemo(() => {
    return SOURCES.filter(s => !s.adult || hasAdult);
  }, [hasAdult]);

  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setLocalQuery(urlQuery);
  }

  const [prevCriteria, setPrevCriteria] = useState({ query: urlQuery, source: urlSource, type: urlType });
  if (urlQuery !== prevCriteria.query || urlSource !== prevCriteria.source || urlType !== prevCriteria.type) {
    setPrevCriteria({ query: urlQuery, source: urlSource, type: urlType });
    setLoadedPage(1);
    setHasMorePages(true);
    if (!urlQuery.trim()) {
      setResults([]);
    }
  }

  // Execute search when URL params change or loadedPage increases
  useEffect(() => {
    if (!urlQuery.trim()) {
      return;
    }

    let isCancelled = false;
    const fetchSearch = async () => {
      if (loadedPage === 1) {
        setIsLoading(true);
      } else {
        setIsMoreLoading(true);
      }
      try {
        const data = await api.metadata.globalSearch({
          query: urlQuery,
          source: urlSource,
          searchType: urlType,
          includeAdult: hasAdult,
          page: loadedPage,
        });
        if (!isCancelled) {
          if (loadedPage === 1) {
            setResults(data || []);
          } else {
            setResults((prev) => [...prev, ...(data || [])]);
          }
          if (!data || data.length < 20) {
            setHasMorePages(false);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
        if (!isCancelled) {
          if (loadedPage === 1) {
            setResults([]);
          }
          setHasMorePages(false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsMoreLoading(false);
        }
      }
    };

    fetchSearch();

    return () => {
      isCancelled = true;
    };
  }, [urlQuery, urlSource, urlType, hasAdult, loadedPage]);

  // Client-side preference filtering for adult performers is offloaded to the backend
  const filteredResults = useMemo(() => {
    return results;
  }, [results]);

  const handleCardClick = (item) => {
    if (item.target_path) {
      navigate(item.target_path, { state: { allowAdult: true } });
      return;
    }
    const provider = item.provider || urlSource;
    if (item.media_type === 'movie') {
      const prefix = provider === 'porndb' ? 'porndb_' : 'tmdb_';
      const id = String(item.id).startsWith(prefix) ? item.id : `${prefix}${item.id}`;
      navigate(`/library/movie/${id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'tv') {
      navigate(`/library/tv/${item.id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'person') {
      navigate(`/library/people/${item.id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'scene') {
      const prefix = provider === 'porndb' ? 'porndb' : provider === 'fansdb' ? 'fansdb' : 'stash';
      const id = String(item.id).startsWith(`${prefix}_`) ? item.id : `${prefix}_${item.id}`;
      navigate(`/library/scene/${id}`, { state: { allowAdult: true } });
    }
  };

  // Handle changing source (applies type fallback logic)
  const handleSourceChange = (newSource) => {
    const availableTypes = TYPES_BY_SOURCE[newSource] || [];
    const hasSameType = availableTypes.some(t => t.id === urlType);
    const nextType = hasSameType ? urlType : (availableTypes[0]?.id || 'all');
    
    setSearchParams({
      q: urlQuery,
      source: newSource,
      type: nextType,
    });
  };

  const handleTypeChange = (newType) => {
    setSearchParams({
      q: urlQuery,
      source: urlSource,
      type: newType,
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({
      q: localQuery.trim(),
      source: urlSource,
      type: urlType,
    });
  };

  const sourceOptions = useMemo(() => {
    return filteredSources.map(s => ({
      value: s.id,
      label: s.name,
    }));
  }, [filteredSources]);

  const typeOptions = useMemo(() => {
    const types = TYPES_BY_SOURCE[urlSource] || [];
    return types.map(t => ({
      value: t.id,
      label: t.name,
    }));
  }, [urlSource]);

  return {
    t,
    localQuery,
    setLocalQuery,
    urlQuery,
    urlSource,
    urlType,
    isLoading,
    isMoreLoading,
    setLoadedPage,
    hasMorePages,
    filteredResults,
    sourceOptions,
    typeOptions,
    handleSourceChange,
    handleTypeChange,
    handleSearchSubmit,
    handleCardClick,
    sessionMode,
  };
}

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  useLibraryQuery,
  usePeopleQuery,
  useUpdatePersonStatusMutation,
  useUpdateMediaStatusMutation,
  useSettingsQuery
} from '@/queries';
import { resolveLibraryBackendTab } from '@/lib/libraryTabs';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { useDebounce } from '@/hooks/useDebounce';
import { resolveMediaImageUrl } from '@/lib/imageUrls';

export function useRatingsPageState() {
  const { data: settings } = useSettingsQuery();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const [activeTab, setActiveTab] = useState('unrated'); // 'unrated' | 'rated' | 'analytics'
  const [mediaType, setMediaType] = useState('movies'); // 'movies' | 'series' | 'scenes' | 'people'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [sortKey, setSortKey] = useState('title'); // 'title' | 'rating'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const hasAdultSupport = settings?.include_adult;
  const activeSessionMode = hasAdultSupport ? sessionMode : 'sfw';
  const resolvedAdultGenderPreference =
    activeSessionMode === 'nsfw' && settings?.adult_gender_preference && settings.adult_gender_preference !== 'all'
      ? settings.adult_gender_preference
      : undefined;

  const effectiveMediaType = activeSessionMode !== 'nsfw' && mediaType === 'scenes'
    ? 'movies'
    : mediaType;

  // Fetch all media items in parallel to display unified dashboard stats
  const moviesQuery = useLibraryQuery({
    tab: resolveLibraryBackendTab('movies', activeSessionMode),
    page: 1,
    pageSize: 5000,
    filter_ownership: 'all',
    filter_status: 'all',
    include_adult: activeSessionMode === 'nsfw',
  });

  const tvQuery = useLibraryQuery({
    tab: resolveLibraryBackendTab('tv', activeSessionMode),
    page: 1,
    pageSize: 5000,
    filter_ownership: 'all',
    filter_status: 'all',
    include_adult: activeSessionMode === 'nsfw',
  });

  const scenesQuery = useLibraryQuery(
    activeSessionMode === 'nsfw'
      ? {
          tab: resolveLibraryBackendTab('scenes', activeSessionMode),
          page: 1,
          pageSize: 5000,
          filter_ownership: 'all',
          filter_status: 'all',
          include_adult: true,
        }
      : null
  );

  const videosQuery = useLibraryQuery({
    tab: resolveLibraryBackendTab('videos', activeSessionMode),
    page: 1,
    pageSize: 5000,
    filter_ownership: 'all',
    filter_status: 'all',
    include_adult: activeSessionMode === 'nsfw',
  });

  const peopleQuery = usePeopleQuery({
    include_inactive: false,
    pageSize: 5000,
    adult_only: activeSessionMode === 'nsfw',
    gender: resolvedAdultGenderPreference,
  });

  const rawItems = useMemo(() => {
    if (effectiveMediaType === 'people') {
      return peopleQuery.data?.items || [];
    }
    if (effectiveMediaType === 'movies') {
      return moviesQuery.data?.items || [];
    }
    if (effectiveMediaType === 'series') {
      return tvQuery.data?.items || [];
    }
    if (effectiveMediaType === 'scenes') {
      return scenesQuery?.data?.items || [];
    }
    if (effectiveMediaType === 'videos') {
      return videosQuery.data?.items || [];
    }
    return [];
  }, [effectiveMediaType, moviesQuery.data, tvQuery.data, scenesQuery?.data, videosQuery.data, peopleQuery.data]);

  const isLoading = useMemo(() => {
    if (effectiveMediaType === 'people') return peopleQuery.isLoading;
    if (effectiveMediaType === 'movies') return moviesQuery.isLoading;
    if (effectiveMediaType === 'series') return tvQuery.isLoading;
    if (effectiveMediaType === 'scenes') return scenesQuery?.isLoading || false;
    if (effectiveMediaType === 'videos') return videosQuery.isLoading;
    return false;
  }, [effectiveMediaType, moviesQuery.isLoading, tvQuery.isLoading, scenesQuery?.isLoading, videosQuery.isLoading, peopleQuery.isLoading]);

  const isStatsLoading =
    moviesQuery.isLoading ||
    tvQuery.isLoading ||
    (activeSessionMode === 'nsfw' && (scenesQuery?.isLoading ?? false)) ||
    videosQuery.isLoading ||
    peopleQuery.isLoading;

  // Mutations
  const updateMediaMutation = useUpdateMediaStatusMutation();
  const updatePersonMutation = useUpdatePersonStatusMutation();

  const handleRateItem = async (item, rating) => {
    if (effectiveMediaType === 'people') {
      await updatePersonMutation.mutateAsync({
        personId: item.id,
        payload: { user_rating: rating },
      });
    } else {
      await updateMediaMutation.mutateAsync({
        itemId: item.id,
        payload: { user_rating: rating },
      });
    }
  };

  const handleToggleFavorite = async (item) => {
    if (effectiveMediaType === 'people') {
      await updatePersonMutation.mutateAsync({
        personId: item.id,
        payload: { is_favorite: !item.is_favorite },
      });
    }
  };

  const handleSaveComment = async (item, comment) => {
    if (effectiveMediaType === 'people') {
      await updatePersonMutation.mutateAsync({
        personId: item.id,
        payload: { user_comment: comment },
      });
    } else {
      await updateMediaMutation.mutateAsync({
        itemId: item.id,
        payload: { user_comment: comment },
      });
    }
  };

  // Filter items by Tab (Unrated vs Rated)
  const tabFilteredItems = useMemo(() => {
    return rawItems.filter((item) => {
      const hasRating = item.user_rating !== null && item.user_rating !== undefined;
      const hasComment = item.user_comment !== null && item.user_comment !== undefined && String(item.user_comment).trim() !== '';
      const isFavorite = item.is_favorite === true;

      if (activeTab === 'unrated') {
        return !hasRating;
      }
      if (activeTab === 'rated') {
        return hasRating || hasComment || isFavorite;
      }
      return true;
    });
  }, [rawItems, activeTab]);

  // Filter items by Search
  const searchFilteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return tabFilteredItems;
    return tabFilteredItems.filter((item) => {
      const name = (item.name || item.title || item.displayTitle || '').toLowerCase();
      return name.includes(query);
    });
  }, [tabFilteredItems, searchQuery]);

  // Sort items
  const sortedItems = useMemo(() => {
    const items = [...searchFilteredItems];
    items.sort((a, b) => {
      let valA;
      let valB;

      if (sortKey === 'rating') {
        valA = a.user_rating ?? -1;
        valB = b.user_rating ?? -1;
      } else if (sortKey === 'comment') {
        valA = a.user_comment || '';
        valB = b.user_comment || '';
      } else {
        // Default to name / title sorting
        valA = a.name || a.title || a.displayTitle || '';
        valB = b.name || b.title || b.displayTitle || '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [searchFilteredItems, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // Wrap state setters to reset pagination
  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSetMediaType = (type) => {
    setMediaType(type);
    setCurrentPage(1);
  };

  const handleSetSearchQuery = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Compute Analytics Stats (calculated over all items that have rating/comment/fav)
  const computeStats = (items, isPeople = false) => {
    const ratedItems = items.filter((item) => item.user_rating !== null && item.user_rating !== undefined);
    const totalRated = ratedItems.length;
    const totalUnrated = items.length - totalRated;
    const favoritesCount = isPeople ? items.filter((item) => item.is_favorite === true).length : 0;

    const sum = ratedItems.reduce((acc, curr) => acc + Number(curr.user_rating), 0);
    const average = totalRated > 0 ? (sum / totalRated).toFixed(1) : '0.0';

    // Distribution 0.5-10 (20 slots)
    const distribution = Array(20).fill(0);
    ratedItems.forEach((item) => {
      const val = Number(item.user_rating);
      if (val >= 0.5 && val <= 10) {
        const idx = Math.round(val * 2) - 1;
        if (idx >= 0 && idx < 20) {
          distribution[idx]++;
        }
      }
    });

    return {
      average,
      totalRated,
      totalUnrated,
      favoritesCount,
      distribution,
    };
  };

  const moviesStats = useMemo(() => computeStats(moviesQuery.data?.items || []), [moviesQuery.data]);
  const tvStats = useMemo(() => computeStats(tvQuery.data?.items || []), [tvQuery.data]);
  const scenesStats = useMemo(() => computeStats(scenesQuery?.data?.items || []), [scenesQuery?.data]);
  const videosStats = useMemo(() => computeStats(videosQuery.data?.items || []), [videosQuery.data]);
  const peopleStats = useMemo(() => computeStats(peopleQuery.data?.items || [], true), [peopleQuery.data]);

  const handleSortToggle = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Tooltip state
  const [tooltipRow, setTooltipRow] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipInitialCoords, setTooltipInitialCoords] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);

  const handleMouseEnter = useCallback((e, row) => {
    setTooltipRow(row);
    setTooltipInitialCoords({ x: e.clientX, y: e.clientY });
    setTooltipVisible(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate3d(${e.clientX + 15}px, ${e.clientY + 15}px, 0)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipVisible(false);
    setTooltipRow(null);
  }, []);

  const getTooltipImageUrl = () => {
    if (!tooltipRow) return null;
    if (effectiveMediaType === 'people') {
      return tooltipRow.profile_path ? resolveMediaImageUrl(tooltipRow.profile_path, 'poster') : null;
    }
    if (effectiveMediaType === 'scenes' || effectiveMediaType === 'videos') {
      return tooltipRow.still_path
        ? resolveMediaImageUrl(tooltipRow.still_path, 'still')
        : (tooltipRow.backdrop_path
          ? resolveMediaImageUrl(tooltipRow.backdrop_path, 'backdrop')
          : (tooltipRow.backdrop
            ? resolveMediaImageUrl(tooltipRow.backdrop, 'backdrop')
            : null));
    }
    return tooltipRow.poster_path ? resolveMediaImageUrl(tooltipRow.poster_path, 'poster') : null;
  };

  const tooltipImageUrl = getTooltipImageUrl();
  const tooltipAspect = (effectiveMediaType === 'scenes' || effectiveMediaType === 'videos') ? 'landscape' : 'poster';

  // Review Drawer state
  const [editingItem, setEditingItem] = useState(null);
  const [reviewText, setReviewText] = useState('');

  const handleOpenReviewDrawer = useCallback((e, item) => {
    e.stopPropagation();
    setEditingItem(item);
    setReviewText(item.user_comment || '');
  }, []);

  const handleSaveReview = useCallback(async () => {
    if (!editingItem) return;
    await handleSaveComment(editingItem, reviewText);
    setEditingItem(null);
  }, [editingItem, reviewText, handleSaveComment]);

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setEditingItem(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Local Search Input with Debounce Sync
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 150);

  const stateRef = useRef({ searchQuery, setSearchQuery: handleSetSearchQuery });
  useEffect(() => {
    stateRef.current = { searchQuery, setSearchQuery: handleSetSearchQuery };
  });

  useEffect(() => {
    if (debouncedSearch !== stateRef.current.searchQuery) {
      stateRef.current.setSearchQuery(debouncedSearch);
    }
  }, [debouncedSearch]);

  return {
    activeTab,
    setActiveTab: handleSetActiveTab,
    mediaType: effectiveMediaType,
    setMediaType: handleSetMediaType,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortKey,
    sortDirection,
    handleSortToggle,
    isLoading,
    isStatsLoading,
    paginatedItems,
    totalPages,
    totalItems: sortedItems.length,
    moviesStats,
    tvStats,
    scenesStats,
    videosStats,
    peopleStats,
    handleRateItem,
    handleToggleFavorite,
    handleSaveComment,
    activeSessionMode,
    hasAdultSupport,
    // UI exports
    tooltipRow,
    tooltipVisible,
    tooltipInitialCoords,
    tooltipRef,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
    tooltipImageUrl,
    tooltipAspect,
    editingItem,
    setEditingItem,
    reviewText,
    setReviewText,
    handleOpenReviewDrawer,
    handleSaveReview,
    localSearch,
    setLocalSearch,
  };
}

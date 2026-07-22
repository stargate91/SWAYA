import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  useLibraryQuery,
  usePeopleQuery,
  useUpdatePersonStatusMutation,
  useUpdateMediaStatusMutation,
  useSettingsQuery,
  useRatingsStatsQuery
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

  const getSortParam = (key, dir) => {
    if (key === 'rating') {
      return dir === 'desc' ? 'rating_desc' : 'user_rating_asc';
    }
    if (key === 'comment') {
      return dir === 'desc' ? 'comment_desc' : 'comment_asc';
    }
    return dir === 'desc' ? 'title_desc' : 'title_asc';
  };

  // Fetch all media items in parallel to display unified dashboard stats
  // Active tab/type paginated query
  const activeListQuery = useLibraryQuery(
    activeTab !== 'analytics' && effectiveMediaType !== 'people'
      ? {
          tab: resolveLibraryBackendTab(effectiveMediaType, activeSessionMode),
          page: currentPage,
          pageSize: pageSize,
          search: searchQuery,
          filter_ownership: 'all',
          filter_status: 'all',
          include_adult: activeSessionMode === 'nsfw',
          filter_rating: activeTab,
          sort_by: getSortParam(sortKey, sortDirection),
        }
      : null
  );

  const activePeopleQuery = usePeopleQuery(
    activeTab !== 'analytics' && effectiveMediaType === 'people'
      ? {
          include_inactive: false,
          page: currentPage,
          pageSize: pageSize,
          search: searchQuery,
          adult_only: activeSessionMode === 'nsfw',
          gender: resolvedAdultGenderPreference,
          filter_rating: activeTab,
          sort_by: getSortParam(sortKey, sortDirection),
        }
      : null
  );

  // Fetch pre-aggregated statistics from the backend on the analytics tab
  const ratingsStatsQuery = useRatingsStatsQuery(
    activeSessionMode === 'nsfw',
    resolvedAdultGenderPreference
  );

  const rawItems = useMemo(() => {
    if (activeTab !== 'analytics') {
      if (effectiveMediaType === 'people') {
        return activePeopleQuery.data?.items || [];
      }
      return activeListQuery.data?.items || [];
    }
    return [];
  }, [activeTab, effectiveMediaType, activeListQuery.data, activePeopleQuery.data]);

  const isLoading = useMemo(() => {
    if (activeTab !== 'analytics') {
      return effectiveMediaType === 'people' ? activePeopleQuery.isLoading : activeListQuery.isLoading;
    }
    return ratingsStatsQuery.isLoading;
  }, [activeTab, effectiveMediaType, activeListQuery.isLoading, activePeopleQuery.isLoading, ratingsStatsQuery.isLoading]);

  const isStatsLoading = ratingsStatsQuery.isLoading;

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

  const handleSaveComment = useCallback(async (item, comment) => {
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
  }, [effectiveMediaType, updatePersonMutation, updateMediaMutation]);

  // Pagination and Items (fully managed by backend)
  const totalPages = useMemo(() => {
    if (activeTab !== 'analytics') {
      const total = effectiveMediaType === 'people' ? (activePeopleQuery.data?.total_items || 0) : (activeListQuery.data?.total_items || 0);
      return Math.max(1, Math.ceil(total / pageSize));
    }
    return 1;
  }, [activeTab, effectiveMediaType, activeListQuery.data, activePeopleQuery.data, pageSize]);

  const paginatedItems = useMemo(() => {
    if (activeTab !== 'analytics') {
      return rawItems;
    }
    return [];
  }, [activeTab, rawItems]);

  const sortedItems = paginatedItems;

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

  // Compute Analytics Stats from pre-aggregated backend query
  const ratingsStats = ratingsStatsQuery.data || {};
  const defaultStat = { average: '0.0', totalRated: 0, totalUnrated: 0, favoritesCount: 0, distribution: Array(20).fill(0) };

  const moviesStats = ratingsStats.movies || defaultStat;
  const tvStats = ratingsStats.tv || defaultStat;
  const scenesStats = ratingsStats.scenes || defaultStat;
  const videosStats = ratingsStats.videos || defaultStat;
  const peopleStats = ratingsStats.people || defaultStat;

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

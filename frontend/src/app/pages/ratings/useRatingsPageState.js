import { useState, useMemo } from 'react';
import { useLibraryQuery, usePeopleQuery } from '@/queries/libraryQueries';
import { useUpdateMediaStatusMutation } from '@/queries/mediaQueries';
import { useUpdatePersonStatusMutation } from '@/queries/libraryQueries';
import { useSettingsQuery } from '@/queries/settingsQueries';
import { resolveLibraryBackendTab } from '@/lib/libraryTabs';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';

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

  // Compute resolved tab name for backend
  const resolvedBackendTab = useMemo(() => {
    if (effectiveMediaType === 'series') {
      return resolveLibraryBackendTab('tv', activeSessionMode);
    }
    return resolveLibraryBackendTab(effectiveMediaType, activeSessionMode);
  }, [effectiveMediaType, activeSessionMode]);

  // Fetch media items
  const mediaQuery = useLibraryQuery(
    effectiveMediaType !== 'people'
      ? {
          tab: resolvedBackendTab,
          page: 1,
          pageSize: 5000,
          filter_ownership: 'owned',
          filter_status: 'all', // Include inactive items that might have ratings/comments
          include_adult: activeSessionMode === 'nsfw',
        }
      : null
  );

  // Fetch people items
  const peopleQuery = usePeopleQuery(
    effectiveMediaType === 'people'
      ? {
          include_inactive: true,
          limit: 5000,
          adult_only: activeSessionMode === 'nsfw',
          gender: resolvedAdultGenderPreference,
        }
      : null
  );

  const rawItems = useMemo(() => {
    if (effectiveMediaType === 'people') {
      return peopleQuery.data?.items || [];
    }
    return mediaQuery.data?.items || [];
  }, [effectiveMediaType, mediaQuery.data, peopleQuery.data]);

  const isLoading = effectiveMediaType === 'people' ? peopleQuery.isLoading : mediaQuery.isLoading;

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
      let valA = a.name || a.title || a.displayTitle || '';
      let valB = b.name || b.title || b.displayTitle || '';

      if (sortKey === 'rating') {
        valA = a.user_rating ?? -1;
        valB = b.user_rating ?? -1;
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

  // Compute Analytics Stats (calculated over all rawItems that have rating/comment/fav)
  const analytics = useMemo(() => {
    const ratedItems = rawItems.filter((item) => {
      return item.user_rating !== null && item.user_rating !== undefined;
    });
    const totalRated = ratedItems.length;
    const totalUnrated = rawItems.length - totalRated;
    const favoritesCount = rawItems.filter((item) => item.is_favorite === true).length;

    const sum = ratedItems.reduce((acc, curr) => acc + Number(curr.user_rating), 0);
    const average = totalRated > 0 ? (sum / totalRated).toFixed(1) : '0.0';

    // Distribution 1-10
    const distribution = Array(10).fill(0);
    ratedItems.forEach((item) => {
      const val = Math.round(Number(item.user_rating));
      if (val >= 1 && val <= 10) {
        distribution[val - 1]++;
      }
    });

    return {
      average,
      totalRated,
      totalUnrated,
      favoritesCount,
      distribution,
    };
  }, [rawItems]);

  const handleSortToggle = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

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
    paginatedItems,
    totalPages,
    totalItems: sortedItems.length,
    analytics,
    handleRateItem,
    handleToggleFavorite,
    handleSaveComment,
    activeSessionMode,
  };
}

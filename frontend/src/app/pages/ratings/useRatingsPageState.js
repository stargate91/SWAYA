import { useState, useMemo } from 'react';
import { useLibraryQuery, usePeopleQuery } from '@/queries/libraryQueries';
import { useUpdateMediaStatusMutation } from '@/queries/mediaQueries';
import { useUpdatePersonStatusMutation } from '@/queries/libraryQueries';

export function useRatingsPageState() {
  const [activeTab, setActiveTab] = useState('unrated'); // 'unrated' | 'rated' | 'analytics'
  const [mediaType, setMediaType] = useState('movies'); // 'movies' | 'series' | 'scenes' | 'people'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState('title'); // 'title' | 'rating'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [activeSessionMode] = useState(() => {
    try {
      return localStorage.getItem('session_mode') || 'sfw';
    } catch {
      return 'sfw';
    }
  });

  // Compute resolved tab name for backend
  const resolvedBackendTab = useMemo(() => {
    if (mediaType === 'people') return activeSessionMode === 'nsfw' ? 'adult_people' : 'people';
    if (mediaType === 'series') return activeSessionMode === 'nsfw' ? 'adult_series' : 'series';
    if (mediaType === 'scenes') return 'adult_scenes';
    return activeSessionMode === 'nsfw' ? 'adult' : 'movies';
  }, [mediaType, activeSessionMode]);

  // Fetch media items
  const mediaQuery = useLibraryQuery(
    mediaType !== 'people'
      ? {
          tab: resolvedBackendTab,
          page: 1,
          pageSize: 5000,
          filter_ownership: 'owned',
          filter_status: 'all', // Include inactive items that might have ratings/comments
        }
      : null
  );

  // Fetch people items
  const peopleQuery = usePeopleQuery(
    mediaType === 'people'
      ? {
          include_inactive: true,
          limit: 5000,
          adult_only: activeSessionMode === 'nsfw',
        }
      : null
  );

  const rawItems = useMemo(() => {
    if (mediaType === 'people') {
      return peopleQuery.data?.items || [];
    }
    return mediaQuery.data?.items || [];
  }, [mediaType, mediaQuery.data, peopleQuery.data]);

  const isLoading = mediaType === 'people' ? peopleQuery.isLoading : mediaQuery.isLoading;

  // Mutations
  const updateMediaMutation = useUpdateMediaStatusMutation();
  const updatePersonMutation = useUpdatePersonStatusMutation();

  const handleRateItem = async (item, rating) => {
    if (mediaType === 'people') {
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
    if (mediaType === 'people') {
      await updatePersonMutation.mutateAsync({
        personId: item.id,
        payload: { is_favorite: !item.is_favorite },
      });
    }
  };

  const handleSaveComment = async (item, comment) => {
    if (mediaType === 'people') {
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
    mediaType,
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
  };
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useOrganizerTabState } from './hooks/useOrganizerTabState';
import { useOrganizerPaginationSort } from './hooks/useOrganizerPaginationSort';
import { useOrganizerDetailsState } from './hooks/useOrganizerDetailsState';
import { useFileSelection } from './hooks/useFileSelection';
import { useOrganizerDismissState } from './hooks/useOrganizerDismissState';
import { useOrganizerFocus } from './hooks/useOrganizerFocus';
import { mapOrganizerItemRow, mapExtraRow } from './organizerMappers';
import { useOrganizerQuery } from '@/queries';

const isAdultMovieMode = (scanMode, sessionMode) => scanMode === 'movies_tv' && sessionMode === 'nsfw';

export function useOrganizerPageState({ t, scanMode, sessionMode }) {
  const dismissScopeKey = `${sessionMode || 'sfw'}:${scanMode || 'movies_tv'}`;
  const [pendingResolvedIds, setPendingResolvedIds] = useState(new Set());

  const addPendingResolvedIds = useCallback((ids) => {
    setPendingResolvedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setTimeout(() => {
      setPendingResolvedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 15000);
  }, []);

  const removePendingResolvedIds = useCallback((ids) => {
    setPendingResolvedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const {
    activeMainTab,
    setActiveMainTab,
    activeExtrasTab,
    setActiveExtrasTab,
    activeManualTab,
    setActiveManualTab,
  } = useOrganizerTabState();

  const {
    dismissedRowIds,
    dismissRows,
    restoreDismissedRows,
    dismissedCount,
  } = useOrganizerDismissState({ dismissScopeKey });

  // 1. We first initialize the pagination/sort helper with a temporary/actual count of items.
  const [totalItems, setTotalItems] = useState(0);

  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortConfig,
    handleSortToggle,
    totalPages,
    pageStart,
    pageEnd,
    setPageAndScrollToTop,
  } = useOrganizerPaginationSort({
    activeMainTab,
    activeExtrasTab,
    activeManualTab,
    totalItems,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // 2. Query data from backend using the current states.
  const subTab = activeMainTab === 'manual' ? activeManualTab : (activeMainTab === 'extras' ? activeExtrasTab : null);
  const organizerQuery = useOrganizerQuery(
    scanMode,
    sessionMode,
    currentPage,
    pageSize,
    activeMainTab,
    subTab,
    searchQuery,
    sortConfig?.key || 'source',
    sortConfig?.direction || 'asc',
    isLoaded
  );
  
  const organizer = organizerQuery.data || { items: [], total_items: 0, tab_counts: {} };

  const fetchedTotalItems = organizer.total_items || 0;
  const [prevFetchedTotalItems, setPrevFetchedTotalItems] = useState(0);

  if (fetchedTotalItems !== prevFetchedTotalItems) {
    setPrevFetchedTotalItems(fetchedTotalItems);
    setTotalItems(fetchedTotalItems);
  }

  const tabCounts = useMemo(() => {
    const counts = organizer.tab_counts || {};
    return {
      manualCount: counts.manualCount || 0,
      manualMoviesCount: counts.manualMoviesCount || 0,
      manualEpisodesCount: counts.manualEpisodesCount || 0,
      manualScenesCount: counts.manualScenesCount || 0,
      moviesCount: counts.moviesCount || 0,
      episodesCount: counts.episodesCount || 0,
      scenesCount: counts.scenesCount || 0,
      extrasCount: counts.extrasCount || 0,
    };
  }, [organizer.tab_counts]);

  // Map backend items to frontend rows
  const paginatedRows = useMemo(() => {
    const items = organizer.items || [];
    return items.map((item) => {
      if (activeMainTab === 'extras') {
        return mapExtraRow(item, t);
      }
      return mapOrganizerItemRow(item, t);
    });
  }, [organizer.items, activeMainTab, t]);

  // Instantly filter out dismissed or resolved items from the current page
  const visiblePaginatedRows = useMemo(() => {
    return paginatedRows.filter(
      (row) => !dismissedRowIds.has(row.id)
        && !pendingResolvedIds?.has(row.id)
        && (row.rawType !== 'extra' || (!dismissedRowIds.has(`item-${row.parent_id}`) && !pendingResolvedIds?.has(`item-${row.parent_id}`)))
    );
  }, [paginatedRows, dismissedRowIds, pendingResolvedIds]);

  const {
    activeRowId,
    setActiveRowId,
    activeRow,
  } = useOrganizerDetailsState({
    sortedRows: visiblePaginatedRows,
    paginatedRows: visiblePaginatedRows,
  });

  const {
    selectedRowIds,
    setSelectedRowIds,
    selectedRows,
    handleToggleRow,
    handleToggleAll,
    clearSelectedRows,
  } = useFileSelection({
    sortedRows: visiblePaginatedRows,
    paginatedRows: visiblePaginatedRows,
  });

  useEffect(() => {
    setSelectedRowIds((current) => {
      const visibleIds = new Set(visiblePaginatedRows.map((row) => row.id));
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visiblePaginatedRows, setSelectedRowIds]);

  const { focusFirstAvailableResult } = useOrganizerFocus({
    organizer,
    t,
    activeRowId,
    setActiveRowId,
    setActiveMainTab,
    setActiveExtrasTab,
    setActiveManualTab,
    setSearchQuery,
    setSelectedRowIds,
    setCurrentPage,
    setIsDetailsCollapsed: () => {},
    scanMode,
    activeMainTab,
    activeManualTab,
    activeExtrasTab,
    pendingResolvedIds,
  });

  useEffect(() => {
    const allowedMainTabs = scanMode === 'offline'
      ? ['scenes', 'extras']
      : (scanMode === 'scenes')
        ? ['manual', 'scenes', 'extras']
        : isAdultMovieMode(scanMode, sessionMode)
          ? ['manual', 'movies', 'extras']
          : ['manual', 'movies', 'episodes', 'extras'];
    const allowedManualTabs = (scanMode === 'scenes' || scanMode === 'offline')
      ? ['scenes']
      : isAdultMovieMode(scanMode, sessionMode)
        ? ['movies']
        : ['movies', 'episodes'];

    if (!allowedMainTabs.includes(activeMainTab)) {
      setActiveMainTab(allowedMainTabs.includes('manual') ? 'manual' : allowedMainTabs[0]);
    }
    if (!allowedManualTabs.includes(activeManualTab)) {
      setActiveManualTab(allowedManualTabs[0]);
    }
  }, [activeMainTab, activeManualTab, scanMode, sessionMode, setActiveMainTab, setActiveManualTab]);

  return {
    dismissRows,
    restoreDismissedRows,
    dismissedCount,
    dismissedRowIds,
    pendingResolvedIds,
    addPendingResolvedIds,
    removePendingResolvedIds,
    visibleMediaCount: tabCounts.moviesCount + tabCounts.episodesCount + tabCounts.scenesCount,
    visibleExtraCount: tabCounts.extrasCount,
    sessionVisibleMediaCount: tabCounts.moviesCount + tabCounts.episodesCount + tabCounts.scenesCount,
    sessionVisibleExtraCount: tabCounts.extrasCount,
    activeExtrasTab,
    activeManualTab,
    activeMainTab,
    activeRow,
    currentPage,
    handleSortToggle,
    handleToggleAll,
    handleToggleRow,
    pageSize,
    pageStart,
    pageEnd,
    paginatedRows: visiblePaginatedRows,
    searchQuery,
    selectedRows,
    selectedRowIds,
    clearSelectedRows,
    setActiveExtrasTab,
    setActiveManualTab,
    setActiveMainTab,
    setActiveRowId,
    setPageAndScrollToTop,
    setPageSize,
    setSearchQuery,
    focusFirstAvailableResult,
    sortConfig,
    sortedRows: visiblePaginatedRows,
    tabCounts,
    totalPages,
    organizerQuery,
    isLoaded,
    setIsLoaded,
  };
}

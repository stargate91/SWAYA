import { useEffect, useState, useCallback } from 'react';
import { useOrganizerTabState } from './hooks/useOrganizerTabState';
import { useOrganizerPaginationSort } from './hooks/useOrganizerPaginationSort';
import { useOrganizerDetailsState } from './hooks/useOrganizerDetailsState';
import { useFileSelection } from './hooks/useFileSelection';
import { useOrganizerDismissState } from './hooks/useOrganizerDismissState';
import { useOrganizerFilteredRows } from './hooks/useOrganizerFilteredRows';
import { useOrganizerFocus } from './hooks/useOrganizerFocus';

const isPornDbMovieMode = (scanMode) => scanMode === 'porndb_movie';

export function useOrganizerPageState({ organizer, t, scanMode, sessionMode }) {
  const dismissScopeKey = `${sessionMode || 'sfw'}:${scanMode || 'movies_tv'}`;
  const [pendingResolvedIds, setPendingResolvedIds] = useState(new Set());

  const addPendingResolvedIds = useCallback((ids) => {
    setPendingResolvedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    // Safety net fallback in case API or refresh fails/stalls
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
    dismissedCount,
    dismissRows,
    restoreDismissedRows,
  } = useOrganizerDismissState({ organizer, scopeKey: dismissScopeKey });

  const {
    visibleMediaCount,
    visibleExtraCount,
    sessionVisibleMediaCount,
    sessionVisibleExtraCount,
    tabCounts,
    tabFilteredRows,
    modeVisibleMatchedItems,
    modeVisibleExtrasForRename,
  } = useOrganizerFilteredRows({
    organizer,
    t,
    activeMainTab,
    activeExtrasTab,
    activeManualTab,
    dismissedRowIds,
    pendingResolvedIds,
    scanMode,
    sessionMode,
  });
  useEffect(() => {
    const allowedMainTabs = scanMode === 'offline'
      ? ['scenes', 'extras']
      : (scanMode === 'scenes')
        ? ['manual', 'scenes', 'extras']
        : isPornDbMovieMode(scanMode)
          ? ['manual', 'movies', 'extras']
          : ['manual', 'movies', 'episodes', 'extras'];
    const allowedManualTabs = (scanMode === 'scenes' || scanMode === 'offline')
      ? ['scenes']
      : isPornDbMovieMode(scanMode)
        ? ['movies']
        : ['movies', 'episodes'];

    if (!allowedMainTabs.includes(activeMainTab)) {
      setActiveMainTab(allowedMainTabs.includes('manual') ? 'manual' : allowedMainTabs[0]);
    }
    if (!allowedManualTabs.includes(activeManualTab)) {
      setActiveManualTab(allowedManualTabs[0]);
    }
  }, [activeMainTab, activeManualTab, scanMode, setActiveMainTab, setActiveManualTab]);


  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortConfig,
    handleSortToggle,
    sortedRows,
    totalPages,
    paginatedRows,
    pageStart,
    pageEnd,
    setPageAndScrollToTop,
  } = useOrganizerPaginationSort({
    tabFilteredRows,
    activeMainTab,
    activeExtrasTab,
    activeManualTab,
  });

  const {
    activeRowId,
    setActiveRowId,
    activeRow,
  } = useOrganizerDetailsState({
    sortedRows,
    paginatedRows,
  });

  const {
    selectedRowIds,
    setSelectedRowIds,
    selectedRows,
    handleToggleRow,
    handleToggleAll,
    clearSelectedRows,
  } = useFileSelection({
    sortedRows,
    paginatedRows,
  });

  useEffect(() => {
    setSelectedRowIds((current) => {
      const visibleIds = new Set(paginatedRows.map((row) => row.id));
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [paginatedRows, setSelectedRowIds]);

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
    setIsDetailsCollapsed: () => {}, // No-op, details sidebar is gone
    scanMode,
    activeMainTab,
    activeManualTab,
    activeExtrasTab,
    pendingResolvedIds,
  });

  return {
    dismissRows,
    restoreDismissedRows,
    dismissedCount,
    dismissedRowIds,
    pendingResolvedIds,
    addPendingResolvedIds,
    removePendingResolvedIds,
    visibleMediaCount,
    visibleExtraCount,
    sessionVisibleMediaCount,
    sessionVisibleExtraCount,
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
    paginatedRows,
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
    sortedRows,
    tabCounts,
    totalPages,
    modeVisibleMatchedItems,
    modeVisibleExtrasForRename,
  };
}


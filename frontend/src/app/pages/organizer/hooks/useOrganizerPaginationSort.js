import { useState, useEffect, useMemo } from 'react';
import { useOrganizerSort } from '../useOrganizerSort';
import { compareOrganizerValues } from '../organizerMappers';
import { scrollOrganizerToTop } from '../organizerScroll';
import { useLocalListSearch } from '../../../hooks/useLocalListSearch';

const ORGANIZER_SEARCH_KEYS = ['source', 'target', 'type', 'status', 'category', 'language', 'extension'];

export function useOrganizerPaginationSort({
  tabFilteredRows = [],
  activeMainTab,
  activeExtrasTab,
  activeManualTab,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const { sortConfig, setSortConfig, handleSortToggle } = useOrganizerSort('source', 'asc');

  const [prevTabs, setPrevTabs] = useState({
    main: activeMainTab,
    extras: activeExtrasTab,
    manual: activeManualTab,
    search: searchQuery,
  });

  const tabChanged = activeMainTab !== prevTabs.main ||
    activeExtrasTab !== prevTabs.extras ||
    activeManualTab !== prevTabs.manual;

  if (tabChanged || searchQuery !== prevTabs.search) {
    setPrevTabs({
      main: activeMainTab,
      extras: activeExtrasTab,
      manual: activeManualTab,
      search: searchQuery,
    });
    setCurrentPage(1);
    if (tabChanged) {
      setSortConfig({ key: 'source', direction: 'asc' });
    }
  }

  const filteredRows = useLocalListSearch(tabFilteredRows, searchQuery, ORGANIZER_SEARCH_KEYS);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((left, right) => {
      const comparison = compareOrganizerValues(left?.[sortConfig.key], right?.[sortConfig.key]);
      return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
    return rows;
  }, [filteredRows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  // Sync current page with total pages during render
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, sortedRows]);

  const pageStart = sortedRows.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const pageEnd = Math.min(sortedRows.length, currentPage * pageSize);

  const setPageAndScrollToTop = (nextPage) => {
    setCurrentPage(nextPage);
    scrollOrganizerToTop();
  };

  return {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortConfig,
    setSortConfig,
    handleSortToggle,
    filteredRows,
    sortedRows,
    totalPages,
    paginatedRows,
    pageStart,
    pageEnd,
    setPageAndScrollToTop,
  };
}

import { useState } from 'react';
import { useOrganizerSort } from '../useOrganizerSort';
import { scrollOrganizerToTop } from '../organizerScroll';


export function useOrganizerPaginationSort({
  activeMainTab,
  activeExtrasTab,
  activeManualTab,
  totalItems = 0,
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

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Sync current page with total pages during render
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const pageStart = totalItems === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const pageEnd = Math.min(totalItems, currentPage * pageSize);

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
    totalPages,
    pageStart,
    pageEnd,
    setPageAndScrollToTop,
  };
}

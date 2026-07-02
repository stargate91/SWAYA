import PaginationBar from '@/ui/PaginationBar';

export default function LibraryPagination({
  state,
  isTagFocusMode,
  showPageSizes = false,
}) {
  const hasItems = state.paginatedItems.length > 0;
  
  if (!state.shouldShowPagination || isTagFocusMode) {
    return null;
  }

  if (!showPageSizes && !hasItems) {
    return null;
  }

  return (
    <PaginationBar
      summaryText={state.summaryText}
      currentPage={state.currentPage}
      totalPages={state.totalPages}
      pageSize={state.pageSize}
      pageSizeOptions={showPageSizes ? [20, 40, 80, 160] : undefined}
      showPageSizes={showPageSizes}
      onPageChange={state.setCurrentPage}
      onPageSizeChange={showPageSizes ? state.setPageSize : undefined}
      labels={state.t('organizer.pagination')}
    />
  );
}

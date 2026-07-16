import EmptyState from '../../ui/EmptyState';
import PaginationBar from '../../ui/PaginationBar';
import Spinner from '../../ui/Spinner';
import Table from '../../ui/Table';
import FileDropZone from '../../ui/FileDropZone';
import { usePaginationVisibility } from '../../hooks/usePaginationVisibility';
import { useOrganizerModals } from './useOrganizerModals';
import styles from './OrganizerResultsPanel.module.css';

export default function OrganizerResultsPanel({
  activeRowId,
  columns,
  currentPage,
  dropOverlayDescription,
  dropOverlayLabel,
  onDropPaths,
  isDropzoneDisabled = false,
  emptyActions,
  emptyState,
  emptyText,
  labels,
  loadingState,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  pageSize,
  pageSizeOptions,
  rows,
  showPageSizes = false,
  summaryText,
  totalItems = 0,
  totalPages,
}) {
  const {
    bulkActionBar,
    rowActions,
    selectedRows,
    openBulkDeleteModal,
    openMatchModal,
    openBulkOverrideModal,
    dismissRows,
    clearSelectedRows,
  } = useOrganizerModals();
  const shouldShowPagination = usePaginationVisibility(totalItems, pageSize);

  return (
    <FileDropZone
      className={styles['organizer-results']}
      onDropPaths={onDropPaths}
      disabled={isDropzoneDisabled}
      label={dropOverlayLabel}
      description={dropOverlayDescription}
    >
      {loadingState ? (
        <div className={`${styles['organizer-results']} ${styles['organizer-results--empty']}`}>
          <div className={`${styles['organizer-empty-state']} ${styles['organizer-empty-state--loading']}`}>
            <Spinner
              className={styles['organizer-spinner-state']}
              label={loadingState.label}
              description={loadingState.description}
            />
          </div>
        </div>
      ) : emptyState ? (
        <div className={`${styles['organizer-results']} ${styles['organizer-results--empty']}`}>
          <EmptyState
            actions={emptyActions}
            className={styles['organizer-empty-state']}
            description={emptyState.description}
            icon={emptyState.icon}
            title={emptyState.title}
          />
        </div>
      ) : (
        <>
          {bulkActionBar}
          {shouldShowPagination ? (
            <PaginationBar
              summaryText={summaryText}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              showPageSizes={showPageSizes}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              labels={labels}
            />
          ) : null}

          <div className={styles['organizer-table-block']}>
            <div className={styles['organizer-content']}>
              <Table
                columns={columns}
                rows={rows}
                activeRowId={activeRowId}
                onRowClick={onRowClick}
                emptyText={emptyText}
                emptyContent={<EmptyState size="sm" border="none" background="none" title={emptyText} />}
                rowActions={rowActions}
                selectedRows={selectedRows}
                openBulkDeleteModal={openBulkDeleteModal}
                openMatchModal={openMatchModal}
                openBulkOverrideModal={openBulkOverrideModal}
                dismissRows={dismissRows}
                clearSelectedRows={clearSelectedRows}
              />
            </div>
          </div>
        </>
      )}
    </FileDropZone>
  );
}

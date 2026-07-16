import EmptyState from '../../ui/EmptyState';
import PaginationBar from '../../ui/PaginationBar';
import Spinner from '../../ui/Spinner';
import Table from '../../ui/Table';
import FileDropZone from '../../ui/FileDropZone';
import Stack from '../../ui/Stack';
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
      fill={true}
      onDropPaths={onDropPaths}
      disabled={isDropzoneDisabled}
      label={dropOverlayLabel}
      description={dropOverlayDescription}
    >
      {loadingState ? (
        <Stack fill align="center" justify="center">
          <Spinner
            label={loadingState.label}
            description={loadingState.description}
          />
        </Stack>
      ) : emptyState ? (
        <Stack>
          <EmptyState
            actions={emptyActions}
            description={emptyState.description}
            icon={emptyState.icon}
            title={emptyState.title}
          />
        </Stack>
      ) : (
        <Stack fill gap="xl">
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

          <div className={styles['table-wrapper']}>
            <Stack fill>
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
            </Stack>
          </div>
        </Stack>
      )}
    </FileDropZone>
  );
}

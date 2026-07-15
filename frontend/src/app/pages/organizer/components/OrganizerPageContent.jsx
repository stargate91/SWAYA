import Page from '../../../ui/Page';
import OrganizerDetailsPanel from '../OrganizerDetailsPanel';
import OrganizerHeaderPanel from '../OrganizerHeaderPanel';
import OrganizerResultsPanel from '../OrganizerResultsPanel';
import { useOrganizerColumns } from '../useOrganizerColumns.jsx';
import { normalizeStatusTone, PAGE_SIZE_OPTIONS } from '../organizerMappers';
import styles from '../OrganizerPage.module.css';

export default function OrganizerPageContent({
  activeExtrasTab,
  activeManualTab,
  activeImage,
  activeImageIndex,
  setActiveImageIndex,
  activeImages,
  activeMainTab,
  activeRow,
  currentPage,
  handleSortToggle,
  handleToggleAll,
  handleToggleDetails,
  handleToggleRow,
  isDetailsCollapsed,
  pageSize,
  paginatedRows,
  searchQuery,
  selectedRowIds,
  setActiveExtrasTab,
  setActiveManualTab,
  setActiveMainTab,
  setActiveRowId,
  setPageAndScrollToTop,
  setPageSize,
  setSearchQuery,
  shouldShowDetailsCarousel,
  shouldShowDetailsPoster,
  sortConfig,
  sortedRows,
  totalPages,
  settingsQuery,
  organizerQuery,
  computedExtrasTabs,
  computedManualTabs,
  computedMainTabs,
  organizerEmptyState,
  organizerLoadingState,
  shouldShowDetailsPanel,
  summaryText,
  emptyStateActions,
  headerActions,
  onDropPaths,
  isDropzoneDisabled,
  scanMode,
  scanModeOptions,
  setScanMode,
  sessionMode,
  provider,
  setProvider,
  t,
}) {
  const { columns } = useOrganizerColumns({
    activeExtrasTab,
    activeMainTab,
    collisionStrategy: settingsQuery.data?.collision_strategy,
    handleSortToggle,
    handleToggleAll,
    handleToggleRow,
    normalizeStatusTone,
    paginatedRows,
    selectedRowIds,
    sortConfig,
    t,
  });

  const currentContextLabel =
    activeMainTab === 'manual'
      ? computedManualTabs.find((tab) => tab.value === activeManualTab)?.label || t('organizer.tabs.manual')
      : activeMainTab === 'extras'
        ? computedExtrasTabs.find((tab) => tab.value === activeExtrasTab)?.label || t('organizer.tabs.extras')
        : computedMainTabs.find((tab) => tab.value === activeMainTab)?.label || t('organizer.tabs.manual');

  const organizerInlineEmptyText = organizerQuery.isLoading
    ? t('organizer.table.emptyLoading')
    : searchQuery.trim()
      ? t('organizer.table.emptySearch', { context: currentContextLabel }) || `No items match your search in ${currentContextLabel}.`
      : t('organizer.table.emptyCategory', { context: currentContextLabel }) || `No items in ${currentContextLabel}.`;

  return (
    <Page viewport={true} className={`organizer-page ${styles['organizer-page']}`}>
      <div className={`organizer-main ${!shouldShowDetailsPanel ? 'is-details-hidden' : isDetailsCollapsed ? 'is-details-collapsed' : ''}`}>
        <div className={styles['organizer-main__content']}>
          <OrganizerHeaderPanel
            activeExtrasTab={activeExtrasTab}
            activeManualTab={activeManualTab}
            activeMainTab={activeMainTab}
            actions={headerActions}
            scanMode={scanMode}
            scanModeLabel={t('organizer.scanModeLabel')}
            scanModeOptions={scanModeOptions}
            onChangeScanMode={setScanMode}
            computedExtrasTabs={computedExtrasTabs}
            computedManualTabs={computedManualTabs}
            computedMainTabs={computedMainTabs}
            onChangeExtrasTab={setActiveExtrasTab}
            onChangeManualTab={setActiveManualTab}
            onChangeMainTab={setActiveMainTab}
            provider={provider}
            onChangeProvider={setProvider}
            sessionMode={sessionMode}
            searchPlaceholder={
              activeMainTab === 'manual'
                ? t('organizer.searchPlaceholderManual')
                : activeMainTab === 'movies'
                  ? t('organizer.searchPlaceholderMovies')
                  : activeMainTab === 'episodes'
                    ? t('organizer.searchPlaceholderEpisodes')
                    : activeMainTab === 'extras'
                      ? t('organizer.searchPlaceholderExtras')
                      : t('organizer.searchPlaceholder')
            }
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            title={t('organizer.title')}
          />

          <OrganizerResultsPanel
            activeRowId={activeRow?.id || null}
            columns={columns}
            currentPage={currentPage}
            dropOverlayDescription={t('organizer.dropzone.description')}
            dropOverlayLabel={t('organizer.dropzone.label')}
            onDropPaths={onDropPaths}
            isDropzoneDisabled={isDropzoneDisabled}
            emptyActions={emptyStateActions}
            emptyState={organizerEmptyState}
            emptyText={organizerInlineEmptyText}
            labels={t('organizer.pagination')}
            loadingState={organizerLoadingState}
            onPageChange={setPageAndScrollToTop}
            onPageSizeChange={setPageSize}
            onRowClick={(row) => setActiveRowId(row.id)}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            rows={paginatedRows}
            showPageSizes
            summaryText={summaryText}
            totalItems={sortedRows.length}
            totalPages={totalPages}
          />
        </div>

        {shouldShowDetailsPanel ? (
          <OrganizerDetailsPanel
            activeImage={activeImage}
            activeImageIndex={activeImageIndex}
            activeImages={activeImages}
            activeRow={activeRow}
            isDetailsCollapsed={isDetailsCollapsed}
            onSelectImage={setActiveImageIndex}
            onToggleDetails={handleToggleDetails}
            shouldShowDetailsCarousel={shouldShowDetailsCarousel}
            shouldShowDetailsPoster={shouldShowDetailsPoster}
          />
        ) : null}
      </div>
    </Page>
  );
}

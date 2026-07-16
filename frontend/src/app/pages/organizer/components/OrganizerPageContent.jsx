import Page from '../../../ui/Page';
import OrganizerDetailsPanel from '../OrganizerDetailsPanel';
import PanelHeader from '../../../ui/PanelHeader';
import panelHeaderStyles from '../../../ui/PanelHeader.module.css';
import { Tabs } from '../../../ui/Tabs';
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
  sessionMode,
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
      <div
        className={styles['organizer-main']}
        data-details-hidden={!shouldShowDetailsPanel || undefined}
        data-details-collapsed={isDetailsCollapsed || undefined}
      >
        <div className={styles['organizer-main__content']}>
          <PanelHeader
            title={t('organizer.title')}
            sessionMode={sessionMode}
            actions={headerActions}
            tabs={computedMainTabs}
            activeTab={activeMainTab}
            onTabChange={setActiveMainTab}
            showSearch={true}
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
            onSearchQueryChange={(event) => setSearchQuery(event.target.value)}
          >
            {activeMainTab === 'manual' && computedManualTabs.length > 1 && (
              <PanelHeader.Row>
                <Tabs
                  tabs={computedManualTabs}
                  value={activeManualTab}
                  onChange={setActiveManualTab}
                  variant="sub"
                  tabClassName={panelHeaderStyles['panel-tab']}
                />
              </PanelHeader.Row>
            )}
            {activeMainTab === 'extras' && (
              <PanelHeader.Row>
                <Tabs
                  tabs={computedExtrasTabs}
                  value={activeExtrasTab}
                  onChange={setActiveExtrasTab}
                  variant="sub"
                  tabClassName={panelHeaderStyles['panel-tab']}
                />
              </PanelHeader.Row>
            )}
          </PanelHeader>

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

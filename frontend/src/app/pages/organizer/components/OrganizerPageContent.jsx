import { useState, useRef } from 'react';
import Page from '../../../ui/Page';
import PanelHeader from '../../../ui/PanelHeader';
import panelHeaderStyles from '../../../ui/PanelHeader.module.css';
import { Tabs } from '../../../ui/Tabs';
import OrganizerResultsPanel from '../OrganizerResultsPanel';
import { useOrganizerColumns } from '../useOrganizerColumns.jsx';
import { normalizeStatusTone, PAGE_SIZE_OPTIONS } from '../organizerMappers';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '../../../lib/backend';
import ImageTooltip from '../../../ui/ImageTooltip';
import Stack from '../../../ui/Stack';

export default function OrganizerPageContent({
  activeExtrasTab,
  activeManualTab,
  activeMainTab,
  activeRow,
  currentPage,
  handleSortToggle,
  handleToggleAll,
  handleToggleRow,
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
  summaryText,
  emptyStateActions,
  headerActions,
  onDropPaths,
  isDropzoneDisabled,
  sessionMode,
  t,
}) {
  const [tooltipRow, setTooltipRow] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipInitialCoords, setTooltipInitialCoords] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);

  const handleMouseEnterSource = (e, row) => {
    setTooltipRow(row);
    setTooltipInitialCoords({ x: e.clientX, y: e.clientY });
    setTooltipVisible(true);
  };

  const handleMouseMoveSource = (e) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.transform = `translate3d(${e.clientX + 15}px, ${e.clientY + 15}px, 0)`;
    }
  };

  const handleMouseLeaveSource = () => {
    setTooltipVisible(false);
    setTooltipRow(null);
  };

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
    onMouseEnterSource: handleMouseEnterSource,
    onMouseMoveSource: handleMouseMoveSource,
    onMouseLeaveSource: handleMouseLeaveSource,
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

  const tooltipImageUrl = tooltipRow?.images?.length > 0
    ? resolveMediaImageUrl(tooltipRow.images[0].path, 'poster', API_BASE)
    : null;

  return (
    <Page viewport={true}>
      <Stack fill gap="3xl">
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
      </Stack>

      <ImageTooltip
        ref={tooltipRef}
        imageUrl={tooltipImageUrl}
        visible={tooltipVisible}
        x={tooltipInitialCoords.x}
        y={tooltipInitialCoords.y}
      />
    </Page>
  );
}

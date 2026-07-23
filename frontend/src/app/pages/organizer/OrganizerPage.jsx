import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import OrganizerPageContent from './components/OrganizerPageContent';
import Button from '../../ui/Button';
import SegmentedControl from '../../ui/SegmentedControl';
import SplitButton from '../../ui/SplitButton';
import { getFirstEnabledProvider, getOrganizerProviderOptions } from '../../lib/providerAvailability';
import Inline from '../../ui/Inline';

import { useOrganizerCountQuery, useOrganizerQuery, useScanStatusQuery, useSettingsQuery } from '../../queries';
import { useUi } from '@/providers/UiProvider';
import { useTranslation } from '../../providers/LanguageContext';
import { EMPTY_ORGANIZER } from './organizerConstants';
import { useOrganizerActions } from './useOrganizerActions.jsx';
import { useOrganizerPageState } from './useOrganizerPageState';
import { useOrganizerTabs } from './useOrganizerTabs';
import { useOrganizerViewModel } from './useOrganizerViewModel';
import { OrganizerModalProvider } from './providers/OrganizerModalProvider';
import { useOrganizerDeleteActions } from './useOrganizerDeleteActions';
import { useLibraryModeStore } from '../../stores/useLibraryModeStore';

const EMPTY_SETTINGS = {};

const getRestoreDismissedLabel = (t, count) => `${t('organizer.buttons.restoreDismissed')} (${count})`;


export default function OrganizerPage() {
  const { t } = useTranslation();
  const { closeModal, openModal, toast } = useUi();
  const queryClient = useQueryClient();
  const settingsQuery = useSettingsQuery();
  const scanStatusQuery = useScanStatusQuery({
    select: (data) => ({
      active: Boolean(data?.active),
      phase: data?.phase || 'idle',
      stop_requested: Boolean(data?.stop_requested),
      last_completed: data?.last_completed || 0,
    }),
  });
  const scanStatus = scanStatusQuery.data || null;
  const settings = settingsQuery.data || EMPTY_SETTINGS;
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  const scanModeOptions = useMemo(() => {
    const hasTmdb = Boolean(String(settings.tmdb_api_key || '').trim());
    const hasPornDb = Boolean(String(settings.porndb_api_key || settings.porndb_api_token || '').trim());
    const hasStashDb = Boolean(String(settings.stashdb_api_key || '').trim());
    const hasFansDb = Boolean(String(settings.fansdb_api_key || '').trim());

    const moviesTvDisabled = sessionMode === 'nsfw'
      ? (!hasTmdb && !hasPornDb)
      : !hasTmdb;

    const scenesDisabled = !hasStashDb && !hasPornDb && !hasFansDb;

    if (settings.include_adult && sessionMode === 'nsfw') {
      return [
        { value: 'movies_tv', label: t('organizer.scanModes.moviesTv'), disabled: moviesTvDisabled },
        { value: 'scenes', label: t('organizer.scanModes.scenes'), disabled: scenesDisabled },
        { value: 'offline', label: t('organizer.scanModes.offline'), disabled: false },
      ];
    }
    return [
      { value: 'movies_tv', label: t('organizer.scanModes.moviesTv'), disabled: moviesTvDisabled },
      { value: 'offline', label: t('organizer.scanModes.offline'), disabled: false },
    ];
  }, [sessionMode, settings, t]);

  const [scanMode, setScanMode] = useState('movies_tv');

  // Adjust scanMode if the current option is disabled or invalid
  const currentOption = scanModeOptions.find((option) => option.value === scanMode);
  if (!currentOption || currentOption.disabled) {
    const firstEnabled = scanModeOptions.find((option) => !option.disabled);
    if (firstEnabled) {
      setScanMode(firstEnabled.value);
    }
  }

  const {
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
    dismissRows,
    restoreDismissedRows,
    dismissedCount,
    dismissedRowIds,
    addPendingResolvedIds,
    removePendingResolvedIds,
    visibleExtraCount,
    visibleMediaCount,
    organizerQuery,
    isLoaded,
    setIsLoaded,
  } = useOrganizerPageState({ t, scanMode, sessionMode });

  const organizer = organizerQuery.data || EMPTY_ORGANIZER;
  const organizerCountQuery = useOrganizerCountQuery(scanMode, sessionMode);
  const [provider, setProvider] = useState('tmdb');
  const providerOptions = useMemo(() => getOrganizerProviderOptions(scanMode, settings), [scanMode, settings]);
  const [utilityBarTarget, setUtilityBarTarget] = useState(null);

  const [prevScanMode, setPrevScanMode] = useState(scanMode);
  const [prevProviderOptions, setPrevProviderOptions] = useState(providerOptions);

  if (prevScanMode !== scanMode || prevProviderOptions !== providerOptions) {
    setPrevScanMode(scanMode);
    setPrevProviderOptions(providerOptions);
    const fallbackProvider = scanMode === 'scenes' ? 'stashdb' : 'tmdb';
    setProvider((current) => getFirstEnabledProvider(providerOptions, current || fallbackProvider));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUtilityBarTarget(document.getElementById('page-bar-top-center'));
  }, []);
  const isScanActive = Boolean(scanStatus?.active);
  const rawOrganizerItemCount = organizerCountQuery.data?.count ?? null;
  const organizerItemCount = rawOrganizerItemCount == null ? null : Number(rawOrganizerItemCount);
  const isOrganizerCountReady = Number.isFinite(organizerItemCount);
  const organizerRuleSignature = useMemo(() => JSON.stringify({
    collision_strategy: settings.collision_strategy || 'keep_both',
    collision_duration_tolerance_seconds: settings.collision_duration_tolerance_seconds || '10',
    naming_filename_casing: settings.naming_filename_casing || 'default',
    naming_word_separator: settings.naming_word_separator || 'space',
    naming_movie_template: settings.naming_movie_template || '',
    naming_episode_template: settings.naming_episode_template || '',
    naming_custom_tag: settings.naming_custom_tag || '',
    naming_video_exts: settings.naming_video_exts || '',
    folder_organization_enabled: settings.folder_organization_enabled !== false,
    folder_move_to_library: settings.folder_move_to_library !== false,
    folder_sort_by_type: settings.folder_sort_by_type !== false,
    folder_movies_name: settings.folder_movies_name || '',
    folder_tv_name: settings.folder_tv_name || '',
    folder_videos_name: settings.folder_videos_name || '',
    folder_adult_name: settings.folder_adult_name || '',
    naming_adult_subfolders_enabled: settings.naming_adult_subfolders_enabled !== false,
    folder_adult_movies_name: settings.folder_adult_movies_name || '',
    folder_adult_tv_name: settings.folder_adult_tv_name || '',
    folder_adult_scenes_name: settings.folder_adult_scenes_name || '',
    folder_adult_videos_name: settings.folder_adult_videos_name || '',
    naming_scene_template: settings.naming_scene_template || '',
    naming_scene_date_format: settings.naming_scene_date_format || '',
    naming_scene_prevent_title_performer: settings.naming_scene_prevent_title_performer !== false,
    scene_tag_limit: settings.scene_tag_limit ?? 0,
    scene_tag_separator: settings.scene_tag_separator ?? ' ',
    scene_tag_blacklist: settings.scene_tag_blacklist || '',
    naming_squeeze_studio_names: Boolean(settings.naming_squeeze_studio_names),
    naming_performer_limit: settings.naming_performer_limit || '3',
    naming_performer_limit_keep: Boolean(settings.naming_performer_limit_keep),
    naming_performer_splitchar: settings.naming_performer_splitchar || '',
    naming_performer_gender_filter: settings.naming_performer_gender_filter || 'all',
    naming_performer_sort: settings.naming_performer_sort || 'order',
    scene_grouping_mode: settings.scene_grouping_mode || 'none',
    folder_scene_template: settings.folder_scene_template || '',
    folder_create_movie_subdir: settings.folder_create_movie_subdir !== false,
    folder_movie_template: settings.folder_movie_template || '',
    folder_create_show_dir: settings.folder_create_show_dir !== false,
    folder_tv_template: settings.folder_tv_template || '',
    folder_create_video_subdir: settings.folder_create_video_subdir !== false,
    folder_create_season_dir: settings.folder_create_season_dir !== false,
    folder_season_template: settings.folder_season_template || '',
    folder_create_episode_dir: Boolean(settings.folder_create_episode_dir),
    folder_episode_template: settings.folder_episode_template || '',
    folder_remove_empty: settings.folder_remove_empty !== false,
    folder_create_collection_dir: settings.folder_create_collection_dir !== false,
    folder_collection_mode: settings.folder_collection_mode || '',
    folder_collection_threshold: settings.folder_collection_threshold || '',
    folder_collection_template: settings.folder_collection_template || '',
    extras_enabled: settings.extras_enabled !== false,
    extras_folder_mode: settings.extras_folder_mode || '',
    extras_subfolder_name: settings.extras_subfolder_name || '',
    extras_video_action: settings.extras_video_action || 'rename',
    extras_sub_action: settings.extras_sub_action || 'rename',
    extras_audio_action: settings.extras_audio_action || 'rename',
    extras_img_action: settings.extras_img_action || 'rename',
    extras_meta_action: settings.extras_meta_action || 'rename',
    extras_video_template: settings.extras_video_template || '',
    extras_sub_template: settings.extras_sub_template || '',
    extras_audio_template: settings.extras_audio_template || '',
    extras_img_template: settings.extras_img_template || '',
    extras_meta_template: settings.extras_meta_template || '',
    include_adult: Boolean(settings.include_adult),
  }), [
    settings,
  ]);
  const previousRuleSignatureRef = useRef(null);
  const {
    handleBrowseAndScan,
    handleLoadAll,
    handleRename,
    handleScanPaths,
    handleRetryMatch,
    isBrowseStarting,
    isLoadingAll,
    isRenamePending,
    isRenameStarting,
    isRetryPending,
  } = useOrganizerActions({
    defaultScanDir: settingsQuery.data?.default_scan_dir,
    organizerCountQuery,
    organizerQuery,
    isScanActive,
    onResultsReady: focusFirstAvailableResult,
    queryClient,
    t,
    toast,
    openModal,
    closeModal,
    sortedRows,
    scanStatusQuery,
    scanMode,
    sessionMode,
    includeAdult: Boolean(settings.include_adult && sessionMode === 'nsfw'),
    provider,
    settings,
    setIsLoaded,
  });

  useEffect(() => {
    if (isScanActive) {
      setIsLoaded(true);
    }
  }, [isScanActive, setIsLoaded]);


  const { computedExtrasTabs, computedManualTabs, computedMainTabs } = useOrganizerTabs({
    t,
    tabCounts,
    scanMode,
    sessionMode,
  });

  const {
    browseButtonLabel,
    emptyState: organizerEmptyState,
    hasDatabaseItems,
    hasVisibleItems,
    loadAllButtonLabel,
    loadRestButtonLabel,
    loadingState: organizerLoadingState,
    renameButtonLabel,
    shouldShowLoadRest,
    summaryText,
  } = useOrganizerViewModel({
    organizerItemCount,
    isBrowseStarting,
    isOrganizerCountReady,
    isLoadingAll,
    isRenamePending,
    isRenameStarting,
    isScanActive,
    pageEnd,
    pageStart,
    scanPhase: scanStatus?.phase,
    sortedRows,
    t,
    visibleExtraCount,
    visibleMediaCount,
  });
  const emptyStateActions = organizerEmptyState ? (
    <>
      {hasDatabaseItems ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBrowseAndScan}
            disabled={isScanActive || isBrowseStarting}
          >
            {browseButtonLabel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleLoadAll}
            disabled={isLoadingAll}
          >
            {loadAllButtonLabel}
          </Button>
        </>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={handleBrowseAndScan}
          disabled={isScanActive || isBrowseStarting}
        >
          {browseButtonLabel}
        </Button>
      )}
    </>
  ) : null;

  const handleRemoveAll = () => {
    const allItems = [
      ...(organizer.manual || []),
      ...(organizer.movies || []),
      ...(organizer.tv || []),
      ...(organizer.collisions || []),
    ];
    const ids = allItems.map((item) => `item-${item.id}`);
    dismissRows(ids);
  };

  const allMediaItems = [
    ...(organizer.manual || []),
    ...(organizer.movies || []),
    ...(organizer.tv || []),
    ...(organizer.collisions || []),
  ];
  const hasActiveVisibleItems = allMediaItems.some(item => !dismissedRowIds.has(`item-${item.id}`));

  const hasReviewNeeded = (organizer.manual || []).some(item => ['no_match', 'uncertain', 'multiple', 'error'].includes(item.status));

  const headerActions = (hasVisibleItems || dismissedCount > 0) ? (
    <>
      {hasActiveVisibleItems ? (
        <Button
          variant="secondary-neutral"
          size="sm"
          className="organizer-panel__browse-btn"
          onClick={handleRemoveAll}
        >
          {t('organizer.buttons.removeAll')}
        </Button>
      ) : null}
      {hasReviewNeeded ? (
        <Button
          variant="secondary"
          size="sm"
          className="organizer-panel__browse-btn"
          onClick={handleRetryMatch}
          disabled={isScanActive || isRetryPending}
        >
          {isRetryPending ? t('organizer.buttons.retrying') || 'Retrying...' : t('organizer.buttons.retryMatch') || 'Retry Match'}
        </Button>
      ) : null}
      {dismissedCount > 0 ? (
        <Button
          variant="secondary-neutral"
          size="sm"
          onClick={restoreDismissedRows}
        >
          {getRestoreDismissedLabel(t, dismissedCount)}
        </Button>
      ) : null}
      {hasVisibleItems ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBrowseAndScan}
            disabled={isScanActive || isBrowseStarting}
          >
            {browseButtonLabel}
          </Button>
          {shouldShowLoadRest ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLoadAll}
              disabled={isLoadingAll}
            >
              {loadRestButtonLabel}
            </Button>
          ) : null}
          <SplitButton
            variant="primary"
            size="sm"
            label={renameButtonLabel}
            onClick={() => handleRename(false)}
            disabled={(isScanActive && scanStatus?.phase === 'organizing') || isRenamePending || isRenameStarting}
            options={[
              {
                label: renameButtonLabel,
                onClick: () => handleRename(false),
              },
              {
                label: t('organizer.renameModal.organizeInPlace') || 'Organize in Place',
                onClick: () => handleRename(true),
              }
            ]}
          />
        </>
      ) : null}
    </>
  ) : null;

  const { refreshOrganizer } = useOrganizerDeleteActions({
    t,
    closeModal,
    toast,
    queryClient,
    focusFirstAvailableResult,
    clearSelectedRows,
    scanMode,
    sessionMode,
    addPendingResolvedIds,
    removePendingResolvedIds,
  });

  useEffect(() => {
    if (previousRuleSignatureRef.current === organizerRuleSignature) {
      return;
    }

    previousRuleSignatureRef.current = organizerRuleSignature;

    if (!organizerQuery.data || isScanActive) {
      return;
    }

    refreshOrganizer().catch(() => {
      toast(t('organizer.toasts.refreshRulesFailed'), 'danger');
    });
  }, [
    organizerQuery.data,
    focusFirstAvailableResult,
    isScanActive,
    organizerRuleSignature,
    queryClient,
    toast,
    refreshOrganizer,
    t,
  ]);

  return (
    <OrganizerModalProvider
      focusFirstAvailableResult={focusFirstAvailableResult}
      clearSelectedRows={clearSelectedRows}
      dismissRows={dismissRows}
      selectedRows={selectedRows}
      scanMode={scanMode}
      sessionMode={sessionMode}
      provider={provider}
      addPendingResolvedIds={addPendingResolvedIds}
      removePendingResolvedIds={removePendingResolvedIds}
    >
      {utilityBarTarget && scanModeOptions.length > 1 && createPortal(
        <Inline gap="md" align="center" className="utility-bar-wrapper">
          <SegmentedControl
            value={scanMode}
            onChange={setScanMode}
            options={scanModeOptions}
            size="sm"
            animated={true}
            className="main-scan-mode"
          />
          {sessionMode === 'nsfw' && scanMode !== 'offline' && providerOptions.length > 0 && (
            <div key={scanMode} className="provider-segmented-control-wrapper animate-slide-in">
              <SegmentedControl
                variant="filter"
                size="sm"
                animated={true}
                value={provider}
                onChange={setProvider}
                options={providerOptions}
              />
            </div>
          )}
        </Inline>,
        utilityBarTarget
      )}
      <OrganizerPageContent
        activeExtrasTab={activeExtrasTab}
        activeManualTab={activeManualTab}
        activeMainTab={activeMainTab}
        activeRow={activeRow}
        currentPage={currentPage}
        handleSortToggle={handleSortToggle}
        handleToggleAll={handleToggleAll}
        handleToggleRow={handleToggleRow}
        pageSize={pageSize}
        paginatedRows={paginatedRows}
        searchQuery={searchQuery}
        selectedRowIds={selectedRowIds}
        setActiveExtrasTab={setActiveExtrasTab}
        setActiveManualTab={setActiveManualTab}
        setActiveMainTab={setActiveMainTab}
        setActiveRowId={setActiveRowId}
        setPageAndScrollToTop={setPageAndScrollToTop}
        setPageSize={setPageSize}
        setSearchQuery={setSearchQuery}
        sortConfig={sortConfig}
        sortedRows={sortedRows}
        totalPages={totalPages}
        settingsQuery={settingsQuery}
        organizerQuery={organizerQuery}
        computedExtrasTabs={computedExtrasTabs}
        computedManualTabs={computedManualTabs}
        computedMainTabs={computedMainTabs}
        organizerEmptyState={organizerEmptyState}
        organizerLoadingState={organizerLoadingState}
        summaryText={summaryText}
        emptyStateActions={emptyStateActions}
        headerActions={headerActions}
        onDropPaths={handleScanPaths}
        isDropzoneDisabled={isScanActive || isBrowseStarting || isLoadingAll || isRenamePending || isRenameStarting}
        sessionMode={sessionMode}
        t={t}
      />
    </OrganizerModalProvider>
  );
}









import Page from '@/ui/Page';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import LibraryPagination from './components/LibraryPagination';
import { useLibraryState } from './hooks/useLibraryState';
import { useLibraryModals } from './hooks/useLibraryModals';
import LibraryHeader from './components/LibraryHeader';
import LibraryFilters from './components/LibraryFilters';
import LibraryGrid from './components/LibraryGrid';
import { useDeleteTagMutation } from '@/queries';
import { X } from '@/ui/icons';
import IconButton from '@/ui/IconButton';
import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { isLibraryTagsTab } from '@/lib/libraryTabs';
import { useUi } from '@/providers/UiProvider';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import UniversalImagePickerModal from './modals/UniversalImagePickerModal';
import SegmentedControl from '@/ui/SegmentedControl';
import './LibraryPage.css';

export default function LibraryPage({ initialTab = 'movies', lockTab = false, showTabs = true, pageTitle = null }) {
  const queryClient = useQueryClient();
  const state = useLibraryState({ initialTab, lockTab, includeTagsTab: true });
  const isInitialLoadRef = useRef(true);
  const [focusedTagName, setFocusedTagName] = useState(null);
  const [imagePickerData, setImagePickerData] = useState(null);
  const { toast } = useUi();
  const deleteTagMutation = useDeleteTagMutation();
  const modals = useLibraryModals({
    state,
    focusedTagName,
    setFocusedTagName,
    deleteTagMutation,
  });

  const isAdultMode = state.activeSessionMode === 'nsfw';
  const utilityBarTarget = typeof document !== 'undefined' ? document.getElementById('shell-utility-bar-center') : null;
  const showOwnershipSegment = state.resolvedTab === 'movies' || state.resolvedTab === 'tv' || state.resolvedTab === 'scenes';

  useEffect(() => {
    if (imagePickerData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [imagePickerData]);

  useEffect(() => {
    if (!state.isTags && focusedTagName !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusedTagName(null);
    }
  }, [state.isTags, focusedTagName]);
  
  // Smooth scroll to top after page change finishes loading new data
  useEffect(() => {
    if (state.paginationMode === 'infinite') return;
    if (isInitialLoadRef.current) {
      if (!state.isDataLoading && !state.isLoading) {
        isInitialLoadRef.current = false;
      }
      return;
    }
    if (!state.isDataLoading) {
      const container = document.querySelector('.shell__content');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [state.currentPage, state.isDataLoading, state.isLoading, state.paginationMode]);

  // Save & Restore scroll position
  useScrollRestoration('.shell__content', [state.isLoading, state.isDataLoading]);

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (state.paginationMode !== 'infinite') return;
    if (state.currentPage >= state.totalPages) return;
    if (state.isDataLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          state.setCurrentPage(state.currentPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.paginationMode, state.currentPage, state.totalPages, state.isDataLoading, state.setCurrentPage]);



  const focusedTag = useMemo(() => {
    if (!state.isTags || !focusedTagName) return null;
    return state.sortedItems.find((item) => item.name === focusedTagName) || null;
  }, [focusedTagName, state.isTags, state.sortedItems]);

  const isTagFocusMode = state.isTags && !!focusedTag;



  if (state.isLoading) {
    return (
      <Page className="library-page">
        <div className="library-loading">
          <div className="library-spinner" />
        </div>
      </Page>
    );
  }

  return (
    <Page className={`library-page ${isAdultMode ? 'library-page--nsfw' : ''}`}>
      {utilityBarTarget && showOwnershipSegment && createPortal(
        <SegmentedControl
          value={state.ownershipFilter}
          onChange={(val) => {
            state.setOwnershipFilter(val);
            state.setCurrentPage(1);
          }}
          options={[
            { value: 'owned', label: state.t('library.filter.have') || 'Have' },
            { value: 'unowned', label: state.t('library.filter.missing') || 'Missing' },
          ]}
        />,
        utilityBarTarget
      )}
      <div className="library-main">
        <div className={`organizer-panel ${isAdultMode ? 'organizer-panel--nsfw' : ''}`}>
          <LibraryHeader
            t={state.t}
            pageTitle={pageTitle}
            tabs={state.tabs}
            resolvedTab={state.resolvedTab}
            setActiveTab={state.setActiveTab}
            searchPlaceholder={state.searchPlaceholder}
            setSearchQuery={state.setSearchQuery}
            onAddPeople={modals.openAddPeopleModal}
            onCreateTag={modals.openCreateTagModal}
            showTabs={showTabs}
            sortKey={state.sortKey}
            setSortKey={state.setSortKey}
            sortDirection={state.sortDirection}
            setSortDirection={state.setSortDirection}
            setCurrentPage={state.setCurrentPage}
            activeSessionMode={state.activeSessionMode}
          />

          {!(isLibraryTagsTab(state.resolvedTab) && !showTabs) ? (
            <LibraryFilters
              t={state.t}
              settings={state.settings}
              resolvedTab={state.resolvedTab}
              isCollections={state.isCollections}
              isPeople={state.isPeople}
              activeSessionMode={state.activeSessionMode}
              sortKey={state.sortKey}
              setSortKey={state.setSortKey}
              sortDirection={state.sortDirection}
              setSortDirection={state.setSortDirection}
              setCurrentPage={state.setCurrentPage}
              collectionStatusFilter={state.collectionStatusFilter}
              setCollectionStatusFilter={state.setCollectionStatusFilter}
              peopleRoleFilter={state.peopleRoleFilter}
              setPeopleRoleFilter={state.setPeopleRoleFilter}
              genderFilter={state.genderFilter}
              setGenderFilter={state.setGenderFilter}
              ownershipFilter={state.ownershipFilter}
              setOwnershipFilter={state.setOwnershipFilter}
              watchedFilter={state.watchedFilter}
              setWatchedFilter={state.setWatchedFilter}
              genreFilter={state.genreFilter}
              setGenreFilter={state.setGenreFilter}
              decadeFilter={state.decadeFilter}
              setDecadeFilter={state.setDecadeFilter}
              yearFilter={state.yearFilter}
              setYearFilter={state.setYearFilter}
              timeFilterMode={state.timeFilterMode}
              setTimeFilterMode={state.setTimeFilterMode}
              activeFilters={state.activeFilters}
              isAdultMode={isAdultMode}
              genresFilter={state.genresFilter}
              setGenresFilter={state.setGenresFilter}
              countriesFilter={state.countriesFilter}
              setCountriesFilter={state.setCountriesFilter}
              studiosFilter={state.studiosFilter}
              setStudiosFilter={state.setStudiosFilter}
              subtitlesFilter={state.subtitlesFilter}
              setSubtitlesFilter={state.setSubtitlesFilter}
              selectedTags={state.selectedTags}
              setSelectedTags={state.setSelectedTags}
              directorsFilter={state.directorsFilter}
              setDirectorsFilter={state.setDirectorsFilter}
              ratingsFilter={state.ratingsFilter}
              setRatingsFilter={state.setRatingsFilter}
              ageRatingsFilter={state.ageRatingsFilter}
              setAgeRatingsFilter={state.setAgeRatingsFilter}
              resolutionsFilter={state.resolutionsFilter}
              setResolutionsFilter={state.setResolutionsFilter}
              hairColorFilter={state.hairColorFilter}
              setHairColorFilter={state.setHairColorFilter}
              eyeColorFilter={state.eyeColorFilter}
              setEyeColorFilter={state.setEyeColorFilter}
              ethnicityFilter={state.ethnicityFilter}
              setEthnicityFilter={state.setEthnicityFilter}
              tattoosFilter={state.tattoosFilter}
              setTattoosFilter={state.setTattoosFilter}
              piercingsFilter={state.piercingsFilter}
              setPiercingsFilter={state.setPiercingsFilter}
              breastTypeFilter={state.breastTypeFilter}
              setBreastTypeFilter={state.setBreastTypeFilter}
              buttShapeFilter={state.buttShapeFilter}
              setButtShapeFilter={state.setButtShapeFilter}
              buttSizeFilter={state.buttSizeFilter}
              setButtSizeFilter={state.setButtSizeFilter}
              favoriteFilter={state.favoriteFilter}
              setFavoriteFilter={state.setFavoriteFilter}
              performerFilter={state.performerFilter}
              setPerformerFilter={state.setPerformerFilter}
              studioFilter={state.studioFilter}
              setStudioFilter={state.setStudioFilter}
              filterData={state.filterData}
            />
          ) : null}
        </div>

        <LibraryPagination
          state={state}
          isTagFocusMode={isTagFocusMode}
          showPageSizes
        />

        <div className="library-grid-container">
          <LibraryGrid
            key={state.resolvedTab}
            t={state.t}
            isDataLoading={state.isDataLoading}
            paginatedItems={state.paginatedItems}
            isTags={state.isTags}
            isCollections={state.isCollections}
            resolvedTab={state.resolvedTab}
            emptyTitle={state.emptyTitle}
            emptyDescription={state.emptyDescription}
            emptyStateVariant={state.emptyStateVariant}
            emptyIcon={state.emptyIcon}
            hasActiveFilters={state.hasActiveFilters}
            onAddPeople={modals.openAddPeopleModal}
            onCreateTag={modals.openCreateTagModal}
            onEditTag={modals.openEditTagModal}
            onDeleteTag={modals.openDeleteTagModal}
            focusedTag={focusedTag}
            onFocusTag={setFocusedTagName}
            onExitTagFocus={() => setFocusedTagName(null)}
            activeSessionMode={state.activeSessionMode}
            onEditImage={setImagePickerData}
            sortKey={state.sortKey}
          />

          {state.paginationMode === 'infinite' && state.currentPage < state.totalPages && (
            <div ref={sentinelRef} className="library-infinite-sentinel">
              <div className="library-spinner library-infinite-spinner" />
            </div>
          )}

          <LibraryPagination
            state={state}
            isTagFocusMode={isTagFocusMode}
          />
        </div>
      </div>

      {/* Image Picker Drawer */}
      {imagePickerData && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="entity-detail-page__drawer-backdrop ui-drawer-backdrop entity-detail-page__drawer-backdrop--transparent"
            role="button"
            tabIndex={-1}
            onClick={() => setImagePickerData(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setImagePickerData(null);
              }
            }}
          />
          <div className="entity-detail-page__drawer ui-drawer ui-drawer--md entity-detail-page__drawer--poster">
            <div className="entity-detail-page__drawer-header">
              <h3 className="entity-detail-page__drawer-title">
                {imagePickerData.title}
              </h3>
              <IconButton
                type="button"
                variant="close"
                onClick={() => setImagePickerData(null)}
                label={state.t('common.close') || 'Close'}
                size="sm"
              >
                <X size={16} />
              </IconButton>
            </div>
            <div className="entity-detail-page__drawer-content entity-detail-page__drawer-content--padded">
              <UniversalImagePickerModal
                entityId={imagePickerData.entityId}
                tmdbId={imagePickerData.tmdbId}
                imageType={imagePickerData.imageType}
                entityType={imagePickerData.entityType}
                currentPath={imagePickerData.currentPath}
                t={state.t}
                toast={toast}
                externalIds={imagePickerData.externalIds}
                item={imagePickerData.item}
                onClose={() => {
                  queryClient.invalidateQueries({ queryKey: QK.library });
                  queryClient.invalidateQueries({ queryKey: QK.libraryCollections });
                }}
              />
            </div>
          </div>
        </>,
        document.body
      )}
    </Page>
  );
}

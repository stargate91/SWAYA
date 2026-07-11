import Page from '@/ui/Page';
import Spinner from '@/ui/Spinner';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import LibraryPagination from './components/LibraryPagination';
import { useLibraryState } from './hooks/useLibraryState';
import { useLibraryModals } from './hooks/useLibraryModals';
import LibraryHeader from './components/LibraryHeader';
import LibraryFilters from './components/LibraryFilters';
import LibraryGrid from './components/LibraryGrid';
import { useDeleteTagMutation } from '@/queries';
import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { isLibraryTagsTab } from '@/lib/libraryTabs';
import { useUi } from '@/providers/UiProvider';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import ImagePickerDrawer from './components/ImagePickerDrawer';
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
    if (!state.isTags && focusedTagName !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusedTagName(null);
    }
  }, [state.isTags, focusedTagName]);
  
  const lastPageRef = useRef(state.currentPage);
  
  // Smooth scroll to top after page change finishes loading new data
  useEffect(() => {
    if (state.paginationMode === 'infinite') return;
    if (isInitialLoadRef.current) {
      if (!state.isDataLoading && !state.isLoading) {
        isInitialLoadRef.current = false;
        lastPageRef.current = state.currentPage;
      }
      return;
    }
    if (!state.isDataLoading) {
      if (state.currentPage !== lastPageRef.current) {
        lastPageRef.current = state.currentPage;
        const container = document.querySelector('.shell__content');
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
  }, [state.currentPage, state.isDataLoading, state.isLoading, state.paginationMode]);


  // Save & Restore scroll position
  useScrollRestoration('.shell__content', [state.isLoading, state.isDataLoading]);

  const sentinelRef = useInfiniteScroll({
    onIntersect: () => state.setCurrentPage(state.currentPage + 1),
    enabled: state.paginationMode === 'infinite' && state.currentPage < state.totalPages && !state.isDataLoading,
    root: '.shell__content',
  });



  const focusedTag = useMemo(() => {
    if (!state.isTags || !focusedTagName) return null;
    return state.sortedItems.find((item) => item.name === focusedTagName) || null;
  }, [focusedTagName, state.isTags, state.sortedItems]);

  const isTagFocusMode = state.isTags && !!focusedTag;



  if (state.isLoading) {
    return (
      <Page className="library-page">
        <Spinner />
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
            searchQuery={state.searchQuery}
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

      <ImagePickerDrawer
        isOpen={!!imagePickerData}
        onClose={() => setImagePickerData(null)}
        title={imagePickerData?.title}
        entityId={imagePickerData?.entityId}
        tmdbId={imagePickerData?.tmdbId}
        imageType={imagePickerData?.imageType}
        entityType={imagePickerData?.entityType}
        currentPath={imagePickerData?.currentPath}
        t={state.t}
        toast={toast}
        externalIds={imagePickerData?.externalIds}
        item={imagePickerData?.item}
        closeOnSelect={false}
        onClosePicker={() => {
          queryClient.invalidateQueries({ queryKey: QK.library });
          queryClient.invalidateQueries({ queryKey: QK.libraryCollections });
        }}
      />
    </Page>
  );
}

/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import Page from '@/ui/Page';
import Skeleton from '@/ui/Skeleton';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import LibraryPagination from './components/LibraryPagination';
import { useLibraryState } from './hooks/useLibraryState';
import { useLibraryModals } from './hooks/useLibraryModals';
import LibraryHeader from './components/LibraryHeader';
import LibraryGrid from './components/LibraryGrid';
import LibraryFilters from './components/LibraryFilters';
import { useDeleteTagMutation, usePlayMediaMutation, useUpdatePersonStatusMutation } from '@/queries';
import api from '@/lib/api';
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

  const playMutation = usePlayMediaMutation();

  const handleRandomPlay = async () => {
    const playableItems = state.paginatedItems.filter(item => 
      item.type !== 'person' && item.type !== 'people' && item.type !== 'tag' && item.type !== 'tags'
    );
    if (!playableItems.length) return;

    const randomItem = playableItems[Math.floor(Math.random() * playableItems.length)];
    
    const isTv = randomItem.type === 'tv' || String(randomItem.id).startsWith('tv_');
    if (!isTv) {
      playMutation.mutate(randomItem.id);
      return;
    }

    try {
      const tvId = String(randomItem.id).replace('tv_', '').replace('tmdb_', '');
      const tvDetail = await api.library.getTvDetail(tvId);
      const seasons = Array.isArray(tvDetail?.seasons) ? tvDetail.seasons : [];
      let nextEpisode = null;

      for (const season of seasons) {
        const owned = (season.episodes || []).filter(ep => ep.path && !ep.is_missing);
        const inProgress = owned.find(ep => ep.resume_position > 0);
        if (inProgress) {
          nextEpisode = inProgress;
          break;
        }
      }
      if (!nextEpisode) {
        for (const season of seasons) {
          const owned = (season.episodes || []).filter(ep => ep.path && !ep.is_missing);
          const unwatched = owned.find(ep => !ep.is_watched);
          if (unwatched) {
            nextEpisode = unwatched;
            break;
          }
        }
      }
      if (!nextEpisode) {
        for (const season of seasons) {
          const owned = (season.episodes || []).filter(ep => ep.path && !ep.is_missing);
          if (owned.length > 0) {
            nextEpisode = owned[0];
            break;
          }
        }
      }

      if (nextEpisode?.id) {
        playMutation.mutate(nextEpisode.id);
      }
    } catch (err) {
      console.error("Failed to play random TV show:", err);
    }
  };

  const isPlayableTab = ['movies', 'tv', 'scenes', 'videos', 'adult_scenes', 'adult_videos'].includes(state.resolvedTab);

  const updatePersonStatusMutation = useUpdatePersonStatusMutation();

  const handleUnfollowPerson = (person) => {
    updatePersonStatusMutation.mutate({
      personId: person.id,
      payload: {
        is_active: false,
      },
    });
  };

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
        <div style={{ padding: 'var(--space-2xl) 0', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4xl)' }}>
            <div style={{ width: '250px' }}>
              <Skeleton.Title style={{ marginBottom: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <Skeleton style={{ width: '80px', height: '36px' }} variant="rect" />
              <Skeleton style={{ width: '80px', height: '36px' }} variant="rect" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-xl)', marginBottom: 'var(--space-4xl)', padding: 'var(--space-lg)', background: 'var(--color-panel-soft)', borderRadius: 'var(--radius-lg)' }}>
            <Skeleton style={{ width: '120px', height: '32px' }} variant="rect" />
            <Skeleton style={{ width: '100px', height: '32px' }} variant="rect" />
            <Skeleton style={{ width: '150px', height: '32px' }} variant="rect" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-2xl)' }}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <Skeleton.Card key={idx} style={{ width: '100%', height: '270px', minWidth: 0 }} />
            ))}
          </div>
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
            isPlayableTab={isPlayableTab}
            onRandomPlay={handleRandomPlay}
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
            onUnfollowPerson={handleUnfollowPerson}
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

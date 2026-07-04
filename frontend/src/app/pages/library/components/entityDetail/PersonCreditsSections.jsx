import { useState, useRef, useEffect, useMemo } from 'react';
import { usePlayMediaMutation } from '@/queries';
import { usePersonCreditsQuery, usePersonCreditsInfiniteQuery } from '@/queries/metadataQueries';
import { usePersonCreditsStore } from '@/stores/usePersonCreditsStore';
import Spinner from '@/ui/Spinner';
import PersonCreditsRow from './PersonCreditsRow';
import PersonCreditsCard from './PersonCreditsCard';
import './PersonCreditsShared.css';


export default function PersonCreditsSections({ id, item, navigate, t }) {
  const playMutation = usePlayMediaMutation();
  const hasStashDb = !!item?.external_ids?.stashdb_id;
  const hasFansDb = !!item?.external_ids?.fansdb_id;
  const hasPornDb = !!item?.external_ids?.theporndb_id || !!item?.external_ids?.porndb_id || !!item?.external_ids?.porndb;

  const hasTmdbMovies = !!item?.external_ids?.tmdb && Number(item?.total_movie_credits) > 0;
  const hasMovies = hasTmdbMovies || (item?.is_adult && hasPornDb);
  const hasTv = !!item?.external_ids?.tmdb && Number(item?.total_tv_credits) > 0;

  const hasScenes = Number(item?.total_scene_credits) > 0 || (item?.is_adult && (hasStashDb || hasFansDb || hasPornDb));

  // Static queries to populate the "My Library" list
  const tmdbMoviesLibQuery = usePersonCreditsQuery(id, 'movies', 1, 100, { enabled: hasTmdbMovies, local_only: true });
  const porndbMoviesLibQuery = usePersonCreditsQuery(id, 'movies', 1, 100, { enabled: !!(item?.is_adult && hasPornDb), source: 'porndb', local_only: true });
  const tmdbTvLibQuery = usePersonCreditsQuery(id, 'tv', 1, 100, { enabled: hasTv, local_only: true });
  const stashdbScenesLibQuery = usePersonCreditsQuery(id, 'scenes', 1, 100, { enabled: !!(item?.is_adult && hasStashDb), source: 'stashdb', local_only: true });
  const fansdbScenesLibQuery = usePersonCreditsQuery(id, 'scenes', 1, 100, { enabled: !!(item?.is_adult && hasFansDb), source: 'fansdb', local_only: true });
  const porndbScenesLibQuery = usePersonCreditsQuery(id, 'scenes', 1, 100, { enabled: !!(item?.is_adult && hasPornDb), source: 'porndb', local_only: true });

  // Extract "My Library" items
  const myMovies = useMemo(() => {
    const list = [];
    const addUniqueById = (targetList, creditItem) => {
      const cid = creditItem.library_item_id || creditItem.id;
      if (!targetList.some(x => (x.library_item_id || x.id) === cid)) {
        targetList.push(creditItem);
      }
    };
    if (tmdbMoviesLibQuery.data?.items) {
      tmdbMoviesLibQuery.data.items.forEach(c => { if (c.in_library) addUniqueById(list, { ...c, source: 'tmdb' }); });
    }
    if (porndbMoviesLibQuery.data?.items) {
      porndbMoviesLibQuery.data.items.forEach(c => { if (c.in_library) addUniqueById(list, { ...c, source: 'porndb' }); });
    }
    return list;
  }, [tmdbMoviesLibQuery.data, porndbMoviesLibQuery.data]);

  const myTv = useMemo(() => {
    const list = [];
    const addUniqueById = (targetList, creditItem) => {
      const cid = creditItem.library_item_id || creditItem.id;
      if (!targetList.some(x => (x.library_item_id || x.id) === cid)) {
        targetList.push(creditItem);
      }
    };
    if (tmdbTvLibQuery.data?.items) {
      tmdbTvLibQuery.data.items.forEach(c => { if (c.in_library) addUniqueById(list, { ...c, source: 'tmdb' }); });
    }
    return list;
  }, [tmdbTvLibQuery.data]);

  const myScenes = useMemo(() => {
    const list = [];
    const addUniqueById = (targetList, creditItem) => {
      const cid = creditItem.library_item_id || creditItem.id;
      if (!targetList.some(x => (x.library_item_id || x.id) === cid)) {
        targetList.push(creditItem);
      }
    };
    if (stashdbScenesLibQuery.data?.items) {
      stashdbScenesLibQuery.data.items.forEach(c => { if (c.in_library) addUniqueById(list, { ...c, source: 'stashdb' }); });
    }
    if (fansdbScenesLibQuery.data?.items) {
      fansdbScenesLibQuery.data.items.forEach(c => { if (c.in_library) addUniqueById(list, { ...c, source: 'fansdb' }); });
    }
    if (porndbScenesLibQuery.data?.items) {
      porndbScenesLibQuery.data.items.forEach(c => { if (c.in_library) addUniqueById(list, { ...c, source: 'porndb' }); });
    }
    return list;
  }, [stashdbScenesLibQuery.data, fansdbScenesLibQuery.data, porndbScenesLibQuery.data]);

  // Active sub-tab state for "My Library" row
  const myLibraryTabs = useMemo(() => {
    const tabs = [];
    if (myMovies.length > 0) tabs.push({ id: 'movies', label: t('library.details.moviesTitle') || 'Movies', items: myMovies });
    if (myTv.length > 0) tabs.push({ id: 'tv', label: t('library.details.tvShowsTitle') || 'TV Shows', items: myTv });
    if (myScenes.length > 0) tabs.push({ id: 'scenes', label: t('library.details.scenesTitle') || 'Scenes', items: myScenes });
    return tabs;
  }, [myMovies, myTv, myScenes, t]);

  const [activeLibraryTabState, setActiveLibraryTab] = useState('');

  const activeLibraryTab = useMemo(() => {
    if (myLibraryTabs.length === 0) return '';
    if (activeLibraryTabState && myLibraryTabs.some(t => t.id === activeLibraryTabState)) {
      return activeLibraryTabState;
    }
    return myLibraryTabs[0].id;
  }, [myLibraryTabs, activeLibraryTabState]);

  // Discover state from Zustand store
  const { activeDiscoverTab, setActiveDiscoverTab } = usePersonCreditsStore();

  // Fallback default discover tab
  useEffect(() => {
    const hasDefaultOption = !!activeDiscoverTab && (
      (activeDiscoverTab === 'movies_tmdb' && hasTmdbMovies) ||
      (activeDiscoverTab === 'movies_porndb' && item?.is_adult && hasPornDb) ||
      (activeDiscoverTab === 'tv' && hasTv) ||
      (activeDiscoverTab === 'scenes_stashdb' && hasStashDb) ||
      (activeDiscoverTab === 'scenes_fansdb' && hasFansDb) ||
      (activeDiscoverTab === 'scenes_porndb' && item?.is_adult && hasPornDb)
    );

    if (!hasDefaultOption) {
      if (hasTmdbMovies) setActiveDiscoverTab('movies_tmdb');
      else if (item?.is_adult && hasPornDb) setActiveDiscoverTab('movies_porndb');
      else if (hasTv) setActiveDiscoverTab('tv');
      else if (hasScenes) {
        if (hasStashDb) setActiveDiscoverTab('scenes_stashdb');
        else if (hasFansDb) setActiveDiscoverTab('scenes_fansdb');
        else setActiveDiscoverTab('scenes_porndb');
      }
    }
  }, [activeDiscoverTab, hasTmdbMovies, hasMovies, hasTv, hasScenes, hasStashDb, hasFansDb, hasPornDb, item?.is_adult, setActiveDiscoverTab]);

  // Map active discover tab to query params
  const getActiveParams = (tab) => {
    if (tab === 'movies_tmdb') return { mediaType: 'movies', source: undefined };
    if (tab === 'movies_porndb') return { mediaType: 'movies', source: 'porndb' };
    if (tab === 'tv') return { mediaType: 'tv', source: undefined };
    if (tab === 'scenes_stashdb') return { mediaType: 'scenes', source: 'stashdb' };
    if (tab === 'scenes_fansdb') return { mediaType: 'scenes', source: 'fansdb' };
    if (tab === 'scenes_porndb') return { mediaType: 'scenes', source: 'porndb' };
    return { mediaType: 'movies', source: undefined };
  };

  const { mediaType: activeMediaType, source: activeSource } = getActiveParams(activeDiscoverTab);

  // Dynamic paginated query for infinite scroll using useInfiniteQuery
  const activeGridQuery = usePersonCreditsInfiniteQuery(id, activeMediaType, 24, {
    source: activeSource,
    enabled: !!activeDiscoverTab,
  });

  const accumulatedItems = activeGridQuery.data?.pages?.flatMap(page => page.items) || [];
  const hasMore = activeGridQuery.hasNextPage;
  const isFetchingNextPage = activeGridQuery.isFetchingNextPage;

  // Infinite Scroll Sentinel Observer
  const observerRef = useRef(null);

  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
          activeGridQuery.fetchNextPage();
        }
      },
      {
        root: sentinel.closest('.person-credits-discover-grid-wrapper'),
        threshold: 0.1
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isFetchingNextPage, activeGridQuery]);

  // View mode state: 'library' or 'discover'
  const [viewModeState, setViewMode] = useState('library');
  const viewMode = myLibraryTabs.length === 0 ? 'discover' : viewModeState;

  const activeLibraryItems = myLibraryTabs.find(t => t.id === activeLibraryTab)?.items || [];
  const isSceneGrid = activeMediaType === 'scenes';

  return (
    <div className="person-credits-section-container">
      {viewMode === 'library' && myLibraryTabs.length > 0 && (
        <div className="person-credits-detail-panel">
            <div className="person-credits-discover-header person-credits-discover-header-layout">
              <h4 className="person-credits-row__title person-credits-row-title-style">{t('library.details.inLibrary') || 'My Library'}</h4>

              {/* Toggle button to switch to Discover mode */}
              <button
                type="button"
                className="person-credits-row__mode-switch-btn"
                onClick={() => setViewMode('discover')}
              >
                {t('library.details.wantToDiscover') || 'Want to discover?'}
              </button>
            </div>

            <div className="person-credits-discover-groups person-credits-discover-groups-style">
              <div className="person-credits-discover-group">
                <div className="person-credits-discover-buttons">
                  {myLibraryTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`discover-btn ${activeLibraryTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveLibraryTab(tab.id)}
                    >
                      {tab.label}
                      <span className="person-credits-tab-count person-credits-tab-count-style">{tab.items.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="person-credits-discover-grid-wrapper">
              <PersonCreditsRow
                items={activeLibraryItems}
                mediaType={activeLibraryTab}
                navigate={navigate}
                t={t}
              />
            </div>
          </div>
      )}

      {/* STATE 2: DISCOVER PICKER PANEL & INFINITE GRID */}
      {viewMode === 'discover' && (
        <div className="person-credits-detail-panel">
            <div className="person-credits-discover-header person-credits-discover-header-layout">
              <h4 className="person-credits-row__title person-credits-row-title-style">{t('library.details.discoverFilmography') || 'Discover Filmography'}</h4>

              {/* Back to Library button (only shown if user has library items) */}
              {myLibraryTabs.length > 0 && (
                <button
                  type="button"
                  className="person-credits-row__mode-switch-btn"
                  onClick={() => setViewMode('library')}
                >
                  {t('library.details.backToMyLibrary') || 'Back to My Library'}
                </button>
              )}
            </div>

            <div className="person-credits-discover-groups person-credits-discover-groups-discover-style">
              {hasMovies && (
                <div className="person-credits-discover-group">
                  <span className="person-credits-discover-group-title">{t('library.details.movies') || 'Movies'}</span>
                  <div className="person-credits-discover-buttons">
                    {hasTmdbMovies && (
                      <button
                        type="button"
                        className={`discover-btn ${activeDiscoverTab === 'movies_tmdb' ? 'active' : ''}`}
                        onClick={() => setActiveDiscoverTab('movies_tmdb')}
                      >
                        {t('library.details.tmdb') || 'TMDb'}
                      </button>
                    )}
                    {item?.is_adult && hasPornDb && (
                      <button
                        type="button"
                        className={`discover-btn ${activeDiscoverTab === 'movies_porndb' ? 'active' : ''}`}
                        onClick={() => setActiveDiscoverTab('movies_porndb')}
                      >
                        {t('library.details.porndb') || 'PornDB'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {hasTv && (
                <div className="person-credits-discover-group">
                  <span className="person-credits-discover-group-title">{t('library.details.tvShows') || 'TV Shows'}</span>
                  <div className="person-credits-discover-buttons">
                    <button
                      type="button"
                      className={`discover-btn ${activeDiscoverTab === 'tv' ? 'active' : ''}`}
                      onClick={() => setActiveDiscoverTab('tv')}
                    >
                      {t('library.details.tmdb') || 'TMDb'}
                    </button>
                  </div>
                </div>
              )}

              {hasScenes && (
                <div className="person-credits-discover-group">
                  <span className="person-credits-discover-group-title">{t('library.details.scenes') || 'Scenes'}</span>
                  <div className="person-credits-discover-buttons">
                    {hasStashDb && (
                      <button
                        type="button"
                        className={`discover-btn ${activeDiscoverTab === 'scenes_stashdb' ? 'active' : ''}`}
                        onClick={() => setActiveDiscoverTab('scenes_stashdb')}
                      >
                        {t('library.details.stashdb') || 'StashDB'}
                      </button>
                    )}
                    {hasFansDb && (
                      <button
                        type="button"
                        className={`discover-btn ${activeDiscoverTab === 'scenes_fansdb' ? 'active' : ''}`}
                        onClick={() => setActiveDiscoverTab('scenes_fansdb')}
                      >
                        {t('library.details.fansdb') || 'FansDB'}
                      </button>
                    )}
                    {item?.is_adult && hasPornDb && (
                      <button
                        type="button"
                        className={`discover-btn ${activeDiscoverTab === 'scenes_porndb' ? 'active' : ''}`}
                        onClick={() => setActiveDiscoverTab('scenes_porndb')}
                      >
                        {t('library.details.porndb') || 'PornDB'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          {/* DISCOVER INFINITE GRID */}
          {activeDiscoverTab && (
            <div className="person-credits-discover-grid-wrapper">
              {activeGridQuery.isLoading ? (
                <div className="person-credits-discover-loading">
                  <Spinner label={(() => {
                    const name = item?.name || 'this performer';
                    const sourceName = activeSource === 'porndb' ? 'PornDB' : (activeSource === 'stashdb' ? 'StashDB' : (activeSource === 'fansdb' ? 'FansDB' : 'TMDb'));
                    return t('library.details.cachingFilmography', { defaultValue: `Downloading and caching ${name}'s complete filmography from ${sourceName}... This only happens once to make browsing instant!`, name, source: sourceName });
                  })()} />
                </div>
              ) : !activeGridQuery.isLoading && accumulatedItems.length === 0 ? (
                <div className="person-credits-discover-empty">
                  {t(`library.details.emptyCredits_${activeDiscoverTab}`) || t('library.details.emptyCredits') || 'No credits found for this source.'}
                </div>
              ) : (
                <>
                  <div className={`person-credits-discover-grid ${isSceneGrid ? 'grid-16-9' : 'grid-2-3'}`}>
                    {accumulatedItems.map((credit, i) => (
                      <PersonCreditsCard
                        key={`${credit.id}-${credit.type || activeMediaType}-discover-${i}`}
                        item={credit}
                        mediaType={activeMediaType}
                        navigate={navigate}
                        playMutation={playMutation}
                        t={t}
                        alwaysShowSourceBadge={false}
                        showLibraryBadge={true}
                        placeholderIconSize={22}
                      />
                    ))}

                    {/* Skeletons on loading page */}
                    {isFetchingNextPage && Array.from({ length: 12 }).map((_, idx) => (
                      <div
                        key={`loading-skeleton-${idx}`}
                        className={`person-credits-card skeleton-card`}
                      >
                        <div className="person-credits-card__poster-container skeleton-shimmer" />
                      </div>
                    ))}
                  </div>

                  {/* Sentinel element to trigger next page load */}
                  {hasMore && <div ref={observerRef} className="person-credits-grid__sentinel" />}

                  {!hasMore && accumulatedItems.length > 0 && (
                    <div className="person-credits-grid__finished">
                      {t('library.details.finishedCredits') || 'All credits loaded.'}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

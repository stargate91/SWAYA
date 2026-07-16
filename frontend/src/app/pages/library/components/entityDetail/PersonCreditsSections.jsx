import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePlayMediaMutation } from '@/queries';
import { usePersonCreditsQuery, usePersonCreditsInfiniteQuery } from '@/queries/metadataQueries';
import { usePersonCreditsStore } from '@/stores/usePersonCreditsStore';
import Spinner from '@/ui/Spinner';
import Grid from '@/ui/Grid';
import { X, Play } from '@/ui/icons';
import { Tabs } from '@/ui/Tabs';
import PersonCreditsRow from './PersonCreditsRow';
import PersonCreditsCard from './PersonCreditsCard';
import { API_BASE } from '@/lib/backend';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import Inline from '@/ui/Inline';
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

  const formattedLibraryTabs = useMemo(() => {
    return myLibraryTabs.map((tab) => ({
      value: tab.id,
      label: tab.label,
      count: tab.items.length,
    }));
  }, [myLibraryTabs]);

  const [activeLibraryTabState, setActiveLibraryTab] = useState('');

  const activeLibraryTab = useMemo(() => {
    if (myLibraryTabs.length === 0) return '';
    if (activeLibraryTabState && myLibraryTabs.some(t => t.id === activeLibraryTabState)) {
      return activeLibraryTabState;
    }
    return myLibraryTabs[0].id;
  }, [myLibraryTabs, activeLibraryTabState]);

  const movieTabs = useMemo(() => {
    const tabs = [];
    if (hasTmdbMovies) tabs.push({ value: 'movies_tmdb', label: t('library.details.tmdb') || 'TMDb' });
    if (item?.is_adult && hasPornDb) tabs.push({ value: 'movies_porndb', label: t('library.details.porndb') || 'PornDB' });
    return tabs;
  }, [hasTmdbMovies, hasPornDb, item?.is_adult, t]);

  const tvTabs = useMemo(() => {
    return [{ value: 'tv', label: t('library.details.tmdb') || 'TMDb' }];
  }, [t]);

  const sceneTabs = useMemo(() => {
    const tabs = [];
    if (hasStashDb) tabs.push({ value: 'scenes_stashdb', label: t('library.details.stashdb') || 'StashDB' });
    if (hasFansDb) tabs.push({ value: 'scenes_fansdb', label: t('library.details.fansdb') || 'FansDB' });
    if (item?.is_adult && hasPornDb) tabs.push({ value: 'scenes_porndb', label: t('library.details.porndb') || 'PornDB' });
    return tabs;
  }, [hasStashDb, hasFansDb, hasPornDb, item?.is_adult, t]);

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
  const observerRef = useInfiniteScroll({
    onIntersect: () => activeGridQuery.fetchNextPage(),
    enabled: hasMore && !isFetchingNextPage,
    root: '.person-credits-discover-grid-wrapper',
    threshold: 0.1,
  });

  // View mode state: 'library', 'discover' or 'gallery'
  const [viewModeState, setViewMode] = useState('library');
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const viewMode = viewModeState === 'gallery' ? 'gallery' : (myLibraryTabs.length === 0 ? 'discover' : viewModeState);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getSnapshotUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_BASE}${path}`;
  };

  const activeLibraryItems = myLibraryTabs.find(t => t.id === activeLibraryTab)?.items || [];
  const isSceneGrid = activeMediaType === 'scenes';

  return (
    <div className="person-credits-section-container">
      {viewMode === 'library' && myLibraryTabs.length > 0 && (
        <div className="person-credits-detail-panel">
            <Inline justify="between" align="center" className="person-credits-discover-header person-credits-discover-header-layout">
              <h4 className="person-credits-row__title person-credits-row-title-style">{t('library.details.inLibrary') || 'My Library'}</h4>

              {/* Toggle button to switch to Discover mode */}
              <div className="person-credits-header-actions">
                {item?.is_adult && item?.finishes?.length > 0 && (
                  <button
                    type="button"
                    className="person-credits-row__mode-switch-btn"
                    onClick={() => setViewMode('gallery')}
                  >
                    {t('library.details.gallery') || 'Climax Gallery'}
                  </button>
                )}
                <button
                  type="button"
                  className="person-credits-row__mode-switch-btn"
                  onClick={() => setViewMode('discover')}
                >
                  {t('library.details.wantToDiscover') || 'Want to discover?'}
                </button>
              </div>
            </Inline>

            <div className="person-credits-discover-groups person-credits-discover-groups-style">
              <Tabs
                tabs={formattedLibraryTabs}
                value={activeLibraryTab}
                onChange={setActiveLibraryTab}
                variant="sub"
              />
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
          <Inline justify="between" align="center" className="person-credits-discover-header person-credits-discover-header-layout">
            <h4 className="person-credits-row__title person-credits-row-title-style">{t('library.details.discoverFilmography') || 'Discover Filmography'}</h4>

            {/* Back to Library button (only shown if user has library items) */}
            {myLibraryTabs.length > 0 && (
              <div className="person-credits-header-actions">
                {item?.is_adult && item?.finishes?.length > 0 && (
                  <button
                    type="button"
                    className="person-credits-row__mode-switch-btn"
                    onClick={() => setViewMode('gallery')}
                  >
                    {t('library.details.gallery') || 'Climax Gallery'}
                  </button>
                )}
                <button
                  type="button"
                  className="person-credits-row__mode-switch-btn"
                  onClick={() => setViewMode('library')}
                >
                  {t('library.details.backToMyLibrary') || 'Back to My Library'}
                </button>
              </div>
            )}
          </Inline>

          <div className="person-credits-discover-groups person-credits-discover-groups-discover-style">
            {hasMovies && (
              <Inline gap="sm" align="center" className="person-credits-discover-group">
                <span className="person-credits-discover-group-title">{t('library.details.movies') || 'Movies'}</span>
                <Tabs
                  tabs={movieTabs}
                  value={activeDiscoverTab}
                  onChange={setActiveDiscoverTab}
                  variant="sub"
                />
              </Inline>
            )}

            {hasTv && (
              <Inline gap="sm" align="center" className="person-credits-discover-group">
                <span className="person-credits-discover-group-title">{t('library.details.tvShows') || 'TV Shows'}</span>
                <Tabs
                  tabs={tvTabs}
                  value={activeDiscoverTab}
                  onChange={setActiveDiscoverTab}
                  variant="sub"
                />
              </Inline>
            )}

            {hasScenes && (
              <Inline gap="sm" align="center" className="person-credits-discover-group">
                <span className="person-credits-discover-group-title">{t('library.details.scenes') || 'Scenes'}</span>
                <Tabs
                  tabs={sceneTabs}
                  value={activeDiscoverTab}
                  onChange={setActiveDiscoverTab}
                  variant="sub"
                />
              </Inline>
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
                  <Grid variant={isSceneGrid ? 'auto-scene' : 'auto-poster'}>
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
                  </Grid>

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

      {viewMode === 'gallery' && (
        <div className="person-credits-detail-panel">
          <div className="person-credits-discover-header person-credits-discover-header-layout">
            <h4 className="person-credits-row__title person-credits-row-title-style">
              {t('library.details.galleryTitle') || 'Climax Gallery'}
            </h4>
            <div className="person-credits-header-actions">
              <button
                type="button"
                className="person-credits-row__mode-switch-btn"
                onClick={() => setViewMode('discover')}
              >
                {t('library.details.wantToDiscover') || 'Want to discover?'}
              </button>
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
          </div>

          <div className="person-credits-gallery-grid">
            {item.finishes?.map((finish) => {
              const fullSnapUrl = getSnapshotUrl(finish.snapshot_path);
              return (
                <div key={finish.id} className="person-credits-gallery-item">
                  <img
                    src={fullSnapUrl}
                    alt={finish.media_title}
                    className="person-credits-gallery-img"
                    onClick={() => setLightboxUrl(fullSnapUrl)}
                  />
                  <div className="person-credits-gallery-overlay">
                    <div className="person-credits-gallery-info">
                      <span className="person-credits-gallery-title">{finish.media_title}</span>
                      <span className="person-credits-gallery-time">{formatTime(finish.video_position)}</span>
                    </div>
                    <button
                      type="button"
                      className="person-credits-gallery-play-btn"
                      onClick={() => playMutation.mutate({ itemId: finish.media_item_id, start: finish.video_position })}
                      title={t('library.details.playMoment') || 'Play Moment'}
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lightboxUrl && typeof document !== 'undefined' ? createPortal(
        <div
          className="organizer-details__lightbox"
          role="button"
          tabIndex={0}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="organizer-details__lightbox-close"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxUrl(null);
            }}
          >
            <X size={18} />
          </button>
          <img
            src={lightboxUrl}
            alt="Enlarged preview"
            className="organizer-details__lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>,
        document.body
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ImageOff, Film, Tv } from 'lucide-react';
import EmptyState from '@/ui/EmptyState';
import NavButton from '@/ui/NavButton';
import SegmentedControl from '@/ui/SegmentedControl';
import BackdropCard from '@/ui/BackdropCard';
import TMDBImageGrid from './TMDBImageGrid';
import ImageUploadPanel from '../../modals/ImageUploadPanel';
import { useUi } from '@/providers/UiProvider';
import api from '@/lib/api';
import { API_BASE } from '@/lib/backend';
import { getPosterImagePath } from '@/lib/imageUrls';
import { usePersonBackdropChooserStore, createPersonBackdropChooserSession } from '@/stores/usePersonBackdropChooserStore';
import { usePersonCreditBackdropsQuery, usePersonCreditsQuery } from '@/queries/metadataQueries';
import { isTvLikeMediaType } from '@/lib/mediaTypes';
import { resolveDetailsImageUrl } from '../../utils/detailUtils';
import {
  mergeBackdropCreditPages,
  normalizeBackdropKey,
  prioritizePersonCredits,
  sortBackdropCredits,
} from '../../peopleCollectionDetailUtils.jsx';
import './PersonBackdropPickerModal.css';

const fnv1aHash = (str) => {
  let hash = 2166136261;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const pathsMatch = (path, currentPath) => {
  if (!path || !currentPath) return false;
  const pathLower = path.toLowerCase();
  const currentLower = currentPath.toLowerCase();

  if (pathLower === currentLower) return true;

  const isPathHttp = pathLower.startsWith('http://') || pathLower.startsWith('https://');
  const isCurrentHttp = currentLower.startsWith('http://') || currentLower.startsWith('https://');

  if (isPathHttp && isCurrentHttp) {
    return pathLower === currentLower;
  }

  // Handle local vs remote override matching
  const currentFilename = currentLower.split(/[/\\]/).pop().split('?')[0];
  const optionFilename = pathLower.split(/[/\\]/).pop().split('?')[0];

  // Try exact filename match first
  if (currentFilename === optionFilename) return true;

  // If option is remote, calculate its FNV-1a hash and see if it is in the current local filename
  if (isPathHttp && !isCurrentHttp) {
    const urlHash = fnv1aHash(path);
    const hashPattern = `_${urlHash}`;
    if (currentFilename.includes(hashPattern)) {
      return true;
    }
  }

  // Fallback to suffix match of cleaned filename
  const cleanCurrent = currentFilename.replace('user_override_', '');
  if (cleanCurrent.includes(optionFilename)) {
    return true;
  }

  return false;
};

const checkImageResolution = (url) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
};

const PERSON_BACKDROP_INITIAL_ROWS = 2;
const PERSON_BACKDROP_COLUMNS = 4;
const PERSON_BACKDROP_PAGE_SIZE = 20;

export default function PersonBackdropPickerModal({ personId, item, t, toast, overridePersonBackdropMutation, uploadPersonBackdropMutation }) {
  const person = item;
  const viewportRef = useRef(null);
  const { updateModal } = useUi();
  const sessionKey = String(personId || '');
  const ensureSession = usePersonBackdropChooserStore((state) => state.ensureSession);
  const patchSession = usePersonBackdropChooserStore((state) => state.patchSession);
  const session = usePersonBackdropChooserStore((state) => state.sessions[sessionKey]);
  const resolvedSession = session || createPersonBackdropChooserSession(item?.backdrop_path || '');
  const {
    activeTab = 'movies',
    selectedBackdropPath = '',
    currentSourceCreditKey = '',
    selectedCredit = null,
    moviePages = [],
    tvPages = [],
    scenesPages = [],
    movieNextPage = 2,
    tvNextPage = 2,
    scenesNextPage = 2,
    movieLoadingMore = false,
    tvLoadingMore = false,
    scenesLoadingMore = false,
    selectedSceneSource = 'porndb',
    creditValidationByKey = {},
  } = resolvedSession;

  const isTmdbPerformer = !!person?.external_ids?.tmdb_id || (!person?.external_ids?.stashdb_id && !person?.external_ids?.fansdb_id && !person?.external_ids?.theporndb_id);

  const profilePath = person?.profile_path || item?.profile_path;
  const profileUrl = profilePath ? resolveDetailsImageUrl(profilePath, API_BASE, 'person') : null;

  const selectedBackdropTmdbId = Number(selectedCredit?.tv_tmdb_id || selectedCredit?.tmdb_id || selectedCredit?.id || 0);
  const selectedBackdropMediaType = isTvLikeMediaType(selectedCredit?.media_type || selectedCredit?.type) ? 'tv' : 'movie';
  const selectedBackdropMetadataQuery = usePersonCreditBackdropsQuery(personId, selectedBackdropTmdbId, selectedBackdropMediaType, {
    enabled: Boolean(personId) && Number.isFinite(selectedBackdropTmdbId) && selectedBackdropTmdbId > 0 && isTmdbPerformer,
  });

  useEffect(() => {
    ensureSession(personId, person?.backdrop_path || item?.backdrop_path || '');
    return () => {
      if (personId) {
        usePersonBackdropChooserStore.getState().resetSession(personId);
      }
    };
  }, [ensureSession, personId, person?.backdrop_path, item?.backdrop_path]);

  useEffect(() => {
    if (!session) {
      patchSession(personId, { selectedBackdropPath: person?.backdrop_path || item?.backdrop_path || '' });
    }
  }, [personId, person?.backdrop_path, item?.backdrop_path, session, patchSession]);

  const initialTabPageSize = PERSON_BACKDROP_COLUMNS * PERSON_BACKDROP_INITIAL_ROWS;
  const moviesQuery = usePersonCreditsQuery(personId, 'movies', 1, PERSON_BACKDROP_PAGE_SIZE, {
    enabled: Boolean(personId) && activeTab === 'movies' && isTmdbPerformer,
    excludeKnownFor: false,
  });
  const tvQuery = usePersonCreditsQuery(personId, 'tv', 1, PERSON_BACKDROP_PAGE_SIZE, {
    enabled: Boolean(personId) && activeTab === 'tv' && isTmdbPerformer,
    excludeKnownFor: false,
  });

  useEffect(() => {
    if (isTmdbPerformer && moviesQuery.data?.items && !moviesQuery.isPlaceholderData && (!moviePages || moviePages.length === 0)) {
      patchSession(personId, { moviePages: [moviesQuery.data], movieNextPage: 2 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moviesQuery.data, moviesQuery.isPlaceholderData, patchSession, personId, isTmdbPerformer]);

  useEffect(() => {
    if (isTmdbPerformer && tvQuery.data?.items && !tvQuery.isPlaceholderData && (!tvPages || tvPages.length === 0)) {
      patchSession(personId, { tvPages: [tvQuery.data], tvNextPage: 2 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patchSession, personId, tvQuery.data, tvQuery.isPlaceholderData, isTmdbPerformer]);

  const sceneSourceOptions = useMemo(() => {
    const opts = [];
    if (person?.external_ids?.theporndb_id) {
      opts.push({ value: 'porndb', label: 'PornDB' });
    }
    if (person?.external_ids?.stashdb_id) {
      opts.push({ value: 'stashdb', label: 'StashDB' });
    }
    if (person?.external_ids?.fansdb_id) {
      opts.push({ value: 'fansdb', label: 'FansDB' });
    }
    return opts;
  }, [person?.external_ids]);

  const defaultSceneSource = sceneSourceOptions[0]?.value || 'porndb';
  const activeSceneSource = selectedSceneSource && sceneSourceOptions.some(o => o.value === selectedSceneSource)
    ? selectedSceneSource
    : defaultSceneSource;

  const scenesQuery = usePersonCreditsQuery(personId, 'scenes', 1, PERSON_BACKDROP_PAGE_SIZE, {
    enabled: Boolean(personId) && activeTab === 'scenes',
    source: activeSceneSource || undefined,
  });

  useEffect(() => {
    if (scenesQuery.data?.items && !scenesQuery.isPlaceholderData && (!scenesPages || scenesPages.length === 0)) {
      patchSession(personId, { scenesPages: [scenesQuery.data], scenesNextPage: 2 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenesQuery.data, scenesQuery.isPlaceholderData, patchSession, personId]);

  useEffect(() => {
    if (!isTmdbPerformer && (activeTab === 'movies' || activeTab === 'tv')) {
      patchSession(personId, { activeTab: 'scenes' });
    }
  }, [isTmdbPerformer, activeTab, patchSession, personId]);

  const currentBackdropKey = normalizeBackdropKey(selectedBackdropPath || person?.backdrop_path || item?.backdrop_path);
  const movieItems = useMemo(
    () => prioritizePersonCredits(
      sortBackdropCredits(mergeBackdropCreditPages(moviePages)),
      person?.known_for || item?.known_for || []
    ),
    [item?.known_for, person?.known_for, moviePages]
  );
  const tvItems = useMemo(
    () => prioritizePersonCredits(
      sortBackdropCredits(mergeBackdropCreditPages(tvPages)),
      person?.known_for || item?.known_for || []
    ),
    [item?.known_for, person?.known_for, tvPages]
  );
  const scenesItems = useMemo(() => {
    return mergeBackdropCreditPages(scenesPages || []);
  }, [scenesPages]);

  const activeItems = activeTab === 'movies'
    ? movieItems
    : (activeTab === 'tv' ? tvItems : scenesItems);
  const matchedCreditKey = useMemo(() => {
    if (!currentBackdropKey) {
      return '';
    }
    if (person?.backdrop_source_tmdb_id) {
      const sourceIdStr = String(person.backdrop_source_tmdb_id);
      const matched = activeItems.find((credit) => String(credit.tmdb_id || credit.id || '') === sourceIdStr);
      if (matched) {
        return sourceIdStr;
      }
    }
    const matchedCredit = activeItems.find((credit) => normalizeBackdropKey(credit?.backdrop_path) === currentBackdropKey);
    if (!matchedCredit) {
      return '';
    }
    return String(matchedCredit.tmdb_id || matchedCredit.id || '');
  }, [activeItems, currentBackdropKey, person?.backdrop_source_tmdb_id]);
  const selectedCreditKey = currentSourceCreditKey || matchedCreditKey;
  const selectedBackdrops = useMemo(() => {
    const allBackdrops = selectedBackdropMetadataQuery.data?.backdrops || [];
    return allBackdrops.filter((bd) => (!bd.iso_639_1 || bd.iso_639_1 === '') && Number(bd.width) >= 1280);
  }, [selectedBackdropMetadataQuery.data]);

  const visibleItems = useMemo(
    () => activeItems.filter((credit) => creditValidationByKey[String(credit.tmdb_id || credit.id || '')] !== false),
    [activeItems, creditValidationByKey]
  );

  const totalAvailableItems = activeTab === 'movies'
    ? Math.max(movieItems.length, moviePages?.[0]?.total_items || 0)
    : (activeTab === 'tv'
      ? Math.max(tvItems.length, tvPages?.[0]?.total_items || 0)
      : Math.max(scenesItems.length, scenesPages?.[0]?.total_items || 0));
  const progressTotal = Math.max(totalAvailableItems, activeItems.length);
  const validatedCount = useMemo(
    () => activeItems.reduce((count, credit) => {
      const key = String(credit.tmdb_id || credit.id || '');
      return count + (creditValidationByKey[key] !== undefined ? 1 : 0);
    }, 0),
    [activeItems, creditValidationByKey]
  );
  const validationPendingCount = Math.max(0, activeItems.length - validatedCount);
  const hasMore = activeItems.length < totalAvailableItems;
  const isLoading = activeTab === 'scenes'
    ? (scenesQuery.isLoading || scenesLoadingMore)
    : (isTmdbPerformer && (activeTab === 'movies'
      ? (moviesQuery.isLoading || movieLoadingMore)
      : activeTab === 'tv'
        ? (tvQuery.isLoading || tvLoadingMore)
        : false));

  const loadMore = async () => {
    if (!personId || overridePersonBackdropMutation.isPending) {
      return;
    }

    if (activeTab === 'scenes') {
      const totalPages = Math.max(1, Number(scenesPages[0]?.total_pages) || 1);
      if (scenesLoadingMore || scenesNextPage > totalPages) {
        return;
      }
      patchSession(personId, { scenesLoadingMore: true });
      try {
        const nextPage = await api.people.getCredits(personId, 'scenes', {
          page: scenesNextPage,
          pageSize: PERSON_BACKDROP_PAGE_SIZE,
          source: activeSceneSource || undefined,
        });
        patchSession(personId, (current) => ({
          scenesPages: [...(current.scenesPages || []), nextPage],
          scenesNextPage: (current.scenesNextPage || 2) + 1,
        }));
      } finally {
        patchSession(personId, { scenesLoadingMore: false });
      }
      return;
    }

    if (!isTmdbPerformer) return;

    if (activeTab === 'movies') {
      const totalPages = Math.max(1, Number(moviePages[0]?.total_pages) || 1);
      if (movieLoadingMore || movieNextPage > totalPages) {
        return;
      }
      patchSession(personId, { movieLoadingMore: true });
      try {
        const nextPage = await api.people.getCredits(personId, 'movies', {
          page: movieNextPage,
          pageSize: PERSON_BACKDROP_PAGE_SIZE,
          excludeKnownFor: false,
        });
        patchSession(personId, (current) => ({
          moviePages: [...(current.moviePages || []), nextPage],
          movieNextPage: (current.movieNextPage || 2) + 1,
        }));
      } finally {
        patchSession(personId, { movieLoadingMore: false });
      }
      return;
    }

    if (activeTab === 'tv') {
      const totalPages = Math.max(1, Number(tvPages[0]?.total_pages) || 1);
      if (tvLoadingMore || tvNextPage > totalPages) {
        return;
      }
      patchSession(personId, { tvLoadingMore: true });
      try {
        const nextPage = await api.people.getCredits(personId, 'tv', {
          page: tvNextPage,
          pageSize: PERSON_BACKDROP_PAGE_SIZE,
          excludeKnownFor: false,
        });
        patchSession(personId, (current) => ({
          tvPages: [...(current.tvPages || []), nextPage],
          tvNextPage: (current.tvNextPage || 2) + 1,
        }));
      } finally {
        patchSession(personId, { tvLoadingMore: false });
      }
    }
  };

  useEffect(() => {
    const isTabRequiringTmdb = activeTab === 'movies' || activeTab === 'tv';
    if (selectedCredit || !hasMore || isLoading || (isTabRequiringTmdb && !isTmdbPerformer)) {
      return;
    }
    void loadMore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasMore, isLoading, selectedCredit, totalAvailableItems, isTmdbPerformer]);

  useEffect(() => {
    const isTabRequiringTmdb = activeTab === 'movies' || activeTab === 'tv';
    const viewport = viewportRef.current;
    if (!viewport || selectedCredit || !hasMore || isLoading || (isTabRequiringTmdb && !isTmdbPerformer)) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (remaining <= 180) {
        void loadMore();
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasMore, isLoading, selectedCredit, visibleItems.length, isTmdbPerformer]);

  useEffect(() => {
    if (!personId || selectedCredit || activeItems.length === 0 || !isTmdbPerformer || activeTab === 'scenes') {
      return undefined;
    }

    let cancelled = false;
    const candidates = activeItems.filter((credit) => {
      const key = String(credit.tmdb_id || credit.id || '');
      return key && creditValidationByKey[key] === undefined;
    });

    if (candidates.length === 0) {
      return undefined;
    }

    const run = async () => {
      const batch = candidates.slice(0, 4);
      const results = await Promise.all(batch.map(async (credit) => {
        const creditKey = String(credit.tmdb_id || credit.id || '');
        const tmdbId = Number(credit.tv_tmdb_id || credit.tmdb_id || credit.id || 0);
        const mediaType = isTvLikeMediaType(credit.media_type || credit.type) ? 'tv' : 'movie';
        try {
          const response = await api.people.getCreditBackdrops(personId, tmdbId, mediaType);
          const hasValidBackdrops = typeof response?.has_valid_backdrops === 'boolean'
            ? response.has_valid_backdrops
            : Boolean((response?.backdrops || []).some(
              (bd) => (!bd?.iso_639_1 || bd.iso_639_1 === '') && Number(bd?.width) >= 1280
            ));
          return [creditKey, hasValidBackdrops];
        } catch {
          return [creditKey, true];
        }
      }));

      if (cancelled) {
        return;
      }

      patchSession(personId, (current) => ({
        creditValidationByKey: {
          ...(current.creditValidationByKey || {}),
          ...Object.fromEntries(results),
        },
      }));
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeItems, creditValidationByKey, patchSession, personId, selectedCredit, isTmdbPerformer, activeTab]);

  const handleViewportScroll = (event) => {
    const isTabRequiringTmdb = activeTab === 'movies' || activeTab === 'tv';
    if (selectedCredit || !hasMore || isLoading || (isTabRequiringTmdb && !isTmdbPerformer)) {
      return;
    }
    const viewport = event.currentTarget;
    const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (remaining <= 180) {
      void loadMore();
    }
  };

  const handleSelectSceneBackdrop = async (credit) => {
    const path = credit.backdrop_path || credit.original_backdrop_path;
    if (!path || overridePersonBackdropMutation.isPending) return;

    try {
      const dimensions = await checkImageResolution(path);
      if (dimensions.width > 0 && dimensions.width < 1280) {
        toast(`Warning: This scene image resolution is low (${dimensions.width}x${dimensions.height}). Minimum recommended is 1280 width.`, 'warning');
      }
    } catch (e) {
      console.error(e);
    }

    patchSession(personId, {
      selectedBackdropPath: path,
      currentSourceCreditKey: String(credit.id || ''),
    });

    try {
      await overridePersonBackdropMutation.mutateAsync({
        personId,
        backdropPath: path,
      });
      toast(t('library.details.backdropUpdated') || 'Backdrop updated successfully!', 'success');
    } catch (err) {
      toast(err.message || t('library.details.backdropUpdateFailed') || 'Failed to update backdrop', 'danger');
    }
  };

  const handleOpenBackdropBrowser = (credit) => {
    if (!credit) {
      return;
    }
    const viewport = viewportRef.current;
    const scrollTop = viewport ? viewport.scrollTop : 0;
    patchSession(personId, { selectedCredit: credit, gridScrollTop: scrollTop });
    if (viewport) {
      viewport.scrollTop = 0;
    }
  };

  const handleBackToCredits = () => {
    const savedScrollTop = resolvedSession.gridScrollTop || 0;
    patchSession(personId, { selectedCredit: null });
    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.scrollTop = savedScrollTop;
      }
    });
  };

  const handleUploadBackdrop = async (file) => {
    if (!file || uploadPersonBackdropMutation?.isPending) {
      return;
    }
    try {
      const data = await uploadPersonBackdropMutation.mutateAsync({
        personId,
        file,
      });
      patchSession(personId, { selectedBackdropPath: data?.backdrop_path || item?.backdrop_path || '' });
      toast(t('library.details.imageUploaded') || 'Image uploaded and updated successfully!', 'success');
    } catch (err) {
      toast(err.message || t('library.details.imageUploadFailed') || 'Failed to upload image', 'danger');
    }
  };

  const handleSaveBackdropUrl = async (backdropPath) => {
    if (backdropPath === undefined || overridePersonBackdropMutation.isPending) {
      return;
    }
    patchSession(personId, { selectedBackdropPath: backdropPath });
    try {
      await overridePersonBackdropMutation.mutateAsync({
        personId,
        backdropPath,
      });
      toast(t('library.details.backdropUpdated') || 'Backdrop updated successfully!', 'success');
    } catch (err) {
      toast(err.message || t('library.details.backdropUpdateFailed') || 'Failed to update backdrop', 'danger');
    }
  };

  const handleSelectDetailedBackdrop = async (backdropPath) => {
    if (!backdropPath || overridePersonBackdropMutation.isPending) {
      return;
    }
    patchSession(personId, {
      selectedBackdropPath: backdropPath,
      currentSourceCreditKey: String(selectedCredit?.tmdb_id || selectedCredit?.id || ''),
    });
    try {
      await overridePersonBackdropMutation.mutateAsync({
        personId,
        backdropPath,
      });
      toast(t('library.details.backdropUpdated') || 'Backdrop updated successfully!', 'success');
    } catch (err) {
      toast(err.message || t('library.details.backdropUpdateFailed') || 'Failed to update backdrop', 'danger');
    }
  };

  const isBackdropBrowserOpen = Boolean(selectedCredit);
  const isUploadPending = Boolean(uploadPersonBackdropMutation?.isPending);
  const headerDescription = isTmdbPerformer && !isBackdropBrowserOpen && activeTab !== 'scenes' && (validationPendingCount > 0 || isLoading)
    ? t('library.details.backdropFilterRunning', {
      checked: validatedCount,
      total: progressTotal || 0,
      defaultValue: 'Checking title backdrops ({{checked}}/{{total}}). You can keep browsing.',
    })
    : undefined;

  useEffect(() => {
    updateModal({ description: headerDescription });
    return () => {
      updateModal({ description: undefined });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerDescription]);

  const tabsOptions = useMemo(() => {
    const opts = [{ value: 'default', label: t('common.default') || 'Default' }];
    if (isTmdbPerformer) {
      opts.push({ value: 'movies', label: t('library.details.moviesTitle') || 'Movies' });
      opts.push({ value: 'tv', label: t('library.details.tvShowsTitle') || 'Tv' });
    }
    if (sceneSourceOptions.length > 0) {
      opts.push({ value: 'scenes', label: t('library.details.scenesTitle') || 'Scenes' });
    }
    return opts;
  }, [isTmdbPerformer, sceneSourceOptions, t]);

  console.log('chooser debug:', {
    activeTab,
    moviePagesLength: moviePages.length,
    movieNextPage,
    scenesPagesLength: scenesPages.length,
    scenesNextPage,
    hasMore,
    totalAvailableItems,
    activeItemsLength: activeItems.length,
    isLoading
  });

  return (
    <div className="person-backdrop-picker">
      {!isBackdropBrowserOpen && headerDescription && (
        <div className="person-backdrop-picker__progress-banner">
          <span>{headerDescription}</span>
        </div>
      )}
      {isBackdropBrowserOpen ? (
        <div className="person-backdrop-picker__detail-toolbar">
          <NavButton className="person-backdrop-picker__back-btn" onClick={handleBackToCredits} icon={ChevronLeft}>
            {t('common.back') || 'Back'}
          </NavButton>
          <h4 className="details-panel__section-title person-backdrop-picker__detail-title">
            {selectedBackdropMetadataQuery.data?.title || selectedCredit?.title}
          </h4>
        </div>
      ) : null}

      {!isBackdropBrowserOpen && (
        <ImageUploadPanel
          imageType="backdrop"
          isPending={overridePersonBackdropMutation.isPending || isUploadPending}
          t={t}
          onSaveUrl={handleSaveBackdropUrl}
          onUploadFile={handleUploadBackdrop}
        />
      )}



      {!isBackdropBrowserOpen && (
        <SegmentedControl
          ariaLabel={t('library.details.chooseBackdrop') || 'Choose backdrop source'}
          className="person-backdrop-picker__tabs"
          options={tabsOptions}
          value={activeTab}
          onChange={(value) => patchSession(personId, { activeTab: value, selectedCredit: null })}
        />
      )}

      {activeTab === 'scenes' && !isBackdropBrowserOpen && sceneSourceOptions.length >= 2 && (
        <div className="person-backdrop-picker__source-selector">
          <SegmentedControl
            options={sceneSourceOptions}
            value={activeSceneSource}
            onChange={(val) => patchSession(personId, { selectedSceneSource: val, scenesPages: [], scenesNextPage: 2 })}
          />
        </div>
      )}

      <div
        ref={viewportRef}
        className={`person-backdrop-picker__viewport${isBackdropBrowserOpen ? ' person-backdrop-picker__viewport--detail' : ''}`}
        onScroll={handleViewportScroll}
      >
        {isBackdropBrowserOpen ? (
          <div className="person-backdrop-picker__detail-view">
            <TMDBImageGrid
              customImages={selectedBackdrops}
              imageType="backdrop"
              currentPath={selectedBackdropPath || item?.backdrop_path}
              onSelect={handleSelectDetailedBackdrop}
              isPending={overridePersonBackdropMutation.isPending || isUploadPending}
              pendingPath={overridePersonBackdropMutation.variables?.backdropPath}
              t={t}
            />
          </div>
        ) : activeTab === 'default' ? (
          <div className="person-backdrop-picker__default-tab-content">
            {profileUrl ? (
              <div className="scene-image-picker-grid">
                <div 
                  className={`scene-image-picker-card ${!selectedBackdropPath ? 'active' : ''} person-backdrop-picker__fallback-card`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSaveBackdropUrl("")}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSaveBackdropUrl("");
                    }
                  }}
                >
                  <div className="scene-image-picker-img-wrapper backdrop-variant person-backdrop-fallback-blur">
                    <img src={profileUrl} alt="Default blurred fallback" />
                  </div>
                  <span className="scene-image-picker-label">{t('library.details.defaultBlurredProfile') || 'Blurred Profile Picture'}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                variant="detail-panel"
                icon={ImageOff}
                title={t('library.details.noProfileAvailable') || 'No profile picture available for default backdrop.'}
              />
            )}
          </div>
        ) : (
          <div className={`person-backdrop-picker__grid ${activeTab === 'scenes' ? 'person-backdrop-picker__grid--scenes' : ''}`}>
            {isLoading && visibleItems.length === 0 && Array.from({ length: initialTabPageSize }).map((_, index) => (
              activeTab === 'scenes' ? (
                <BackdropCard key={`person-backdrop-skeleton-${activeTab}-${index}`} disabled={true} />
              ) : (
                <div key={`person-backdrop-skeleton-${activeTab}-${index}`} className="person-backdrop-picker__credit-card skeleton">
                  <div className="person-backdrop-picker__credit-poster-wrap skeleton-shimmer" />
                  <div className="person-backdrop-picker__credit-info">
                    <div className="entity-detail-page__skeleton-block entity-detail-page__skeleton-block--credit-title" />
                    <div className="entity-detail-page__skeleton-block entity-detail-page__skeleton-block--credit-meta" />
                  </div>
                </div>
              )
            ))}

            {!isLoading && visibleItems.length === 0 && (
              <EmptyState
                variant="detail-panel"
                icon={ImageOff}
                className="backdrops-panel__empty-state person-backdrop-picker__empty"
                title={t('library.details.noBackdropsAvailable') || 'No good backdrop options found.'}
              />
            )}

            {visibleItems.map((credit, idx) => {
              const creditKey = String(credit.tmdb_id || credit.id || '');
              const isSceneTab = activeTab === 'scenes';
              
              const isSelected = isSceneTab
                ? pathsMatch(credit.backdrop_path || credit.original_backdrop_path, selectedBackdropPath || item?.backdrop_path)
                : (selectedCreditKey !== '' && selectedCreditKey === creditKey);

              const isPending = overridePersonBackdropMutation.isPending && 
                overridePersonBackdropMutation.variables?.backdropPath === (credit.backdrop_path || credit.original_backdrop_path || credit.backdrop_path);

              const posterPath = getPosterImagePath(credit);
              const posterUrl = posterPath ? resolveDetailsImageUrl(posterPath, API_BASE, 'poster') : null;

              if (isSceneTab) {
                const path = credit.backdrop_path || credit.original_backdrop_path || '';
                const thumbUrl = path.startsWith('/media/')
                  ? resolveDetailsImageUrl(path, API_BASE, 'backdrop')
                  : path;
                return (
                  <BackdropCard
                    key={`person-scene-backdrop-${credit.id}-${idx}`}
                    imageUrl={thumbUrl}
                    alt={credit.title || `Scene backdrop ${idx + 1}`}
                    isSelected={isSelected}
                    isPending={isPending}
                    onClick={() => handleSelectSceneBackdrop(credit)}
                    disabled={overridePersonBackdropMutation.isPending || isUploadPending}
                  />
                );
              }

              const isTv = isTvLikeMediaType(credit.media_type || credit.type);

              return (
                <button
                  type="button"
                  key={`person-backdrop-${activeTab}-${credit.tmdb_id || credit.id}`}
                  className={`person-backdrop-picker__credit-card ${isSelected ? 'is-selected' : ''} ${isPending ? 'backdrop-card--disabled' : ''}`}
                  onClick={() => handleOpenBackdropBrowser(credit)}
                  disabled={overridePersonBackdropMutation.isPending || isUploadPending}
                >
                  <div className="person-backdrop-picker__credit-poster-wrap">
                    {posterUrl ? (
                      <img src={posterUrl} alt={credit.title} className="person-backdrop-picker__credit-poster" />
                    ) : (
                      <div className="person-backdrop-picker__credit-poster person-backdrop-picker__credit-poster--placeholder">
                        {isTv ? <Tv size={24} /> : <Film size={24} />}
                      </div>
                    )}
                  </div>
                  <div className="person-backdrop-picker__credit-info">
                    <div className="person-backdrop-picker__credit-title" title={credit.title}>
                      {credit.title}
                    </div>
                    <div className="person-backdrop-picker__credit-meta">
                      {credit.year ? <span>{credit.year}</span> : (credit.release_date && <span>{credit.release_date.split('-')[0]}</span>)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

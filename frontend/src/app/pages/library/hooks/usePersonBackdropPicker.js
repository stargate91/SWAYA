import { useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { useUi } from '@/providers/UiProvider';
import { usePersonBackdropChooserStore, createPersonBackdropChooserSession } from '@/stores/usePersonBackdropChooserStore';
import { usePersonCreditBackdropsQuery, usePersonCreditsQuery } from '@/queries/metadataQueries';
import { isTvLikeMediaType } from '@/lib/mediaTypes';
import {
  mergeBackdropCreditPages,
  normalizeBackdropKey,
  prioritizePersonCredits,
  sortBackdropCredits,
} from '../utils/personCreditsUtils';
import { checkImageResolution } from '../utils/personBackdropUtils';

const PERSON_BACKDROP_INITIAL_ROWS = 2;
const PERSON_BACKDROP_COLUMNS = 4;
const PERSON_BACKDROP_PAGE_SIZE = 20;

export default function usePersonBackdropPicker({
  personId,
  item,
  t,
  toast,
  overridePersonBackdropMutation,
  uploadPersonBackdropMutation,
  viewportRef,
}) {
  const person = item;
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

  const selectedBackdropTmdbId = Number(selectedCredit?.tv_tmdb_id || selectedCredit?.tmdb_id || selectedCredit?.id || 0);
  const selectedBackdropMediaType = isTvLikeMediaType(selectedCredit?.media_type || selectedCredit?.type) ? 'tv' : 'movie';
  const selectedBackdropMetadataQuery = usePersonCreditBackdropsQuery(personId, selectedBackdropTmdbId, selectedBackdropMediaType, {
    enabled: Boolean(personId) && Number.isFinite(selectedBackdropTmdbId) && selectedBackdropTmdbId > 0 && isTmdbPerformer,
  });

  useEffect(() => {
    ensureSession(personId);
    return () => {
      if (personId) {
        usePersonBackdropChooserStore.getState().resetSession(personId);
      }
    };
  }, [ensureSession, personId]);

  useEffect(() => {
    const backdropPath = person?.backdrop_path || item?.backdrop_path || '';
    if (!session || (!session.selectedBackdropPath && backdropPath)) {
      patchSession(personId, { selectedBackdropPath: backdropPath });
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
        toast(t('library.details.lowResolutionWarning', { width: dimensions.width, height: dimensions.height }) || `Warning: This scene image resolution is low (${dimensions.width}x${dimensions.height}). Minimum recommended is 1280 width.`, 'warning');
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

  return {
    activeTab,
    selectedBackdropPath,
    selectedCredit,
    isTmdbPerformer,
    selectedBackdropMetadataQuery,
    selectedBackdrops,
    visibleItems,
    isLoading,
    isBackdropBrowserOpen,
    isUploadPending,
    headerDescription,
    tabsOptions,
    sceneSourceOptions,
    activeSceneSource,
    initialTabPageSize,
    selectedCreditKey,
    handleViewportScroll,
    handleSelectSceneBackdrop,
    handleOpenBackdropBrowser,
    handleBackToCredits,
    handleUploadBackdrop,
    handleSaveBackdropUrl,
    handleSelectDetailedBackdrop,
    patchSession,
  };
}

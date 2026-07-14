import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/providers/LanguageContext';
import { useLibraryItemDetailQuery, useLibraryTvDetailQuery, useActiveSessionsQuery } from '@/queries/metadataQueries';
import { useSettingsQuery } from '@/queries/settingsQueries';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { API_BASE } from '@/lib/backend';
import api from '@/lib/api';
import { QK } from '@/lib/queryKeys';
import { isMovieMediaType, isSceneMediaType } from '@/lib/mediaTypes';
import {
  getDurationText,
  resolveDetailsImageUrl
} from '../utils/detailUtils';
import { PenLine, Info } from '@/ui/icons';
import ReviewModalContent from '../components/detail/modals/ReviewModalContent';
import Button from '@/ui/Button';
import { useMediaMutations } from './useMediaMutations';
import { useMediaDetailTabs } from './useMediaDetailTabs';

export default function useMediaDetail({ id, type, t, openModal, closeModal }) {
  const normalizedId = id == null ? '' : String(id);
  const cleanId = normalizedId.startsWith('tv_') ? normalizedId.replace('tv_', '') : normalizedId;
  const isMovie = isMovieMediaType(type);
  const isSceneMedia = isSceneMediaType(type);
  const isSingleItem = isMovie || isSceneMedia;

  const [hoveredRating, setHoveredRating] = useState(null);
  const [expandedSeasons, setExpandedSeasons] = useState({ 1: true });
  const [isWatchLogsExpanded, setIsWatchLogsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const overviewRef = useRef(null);
  const fullPeoplePrefetchRef = useRef(new Set());
  const unownedSeasonPrefetchRef = useRef(new Set());
  const queryClient = useQueryClient();

  const {
    updateStatusMutation,
    overrideBackdropMutation,
    toggleTrackedMutation,
    addPeakMutation,
    deletePeakMutation,
    playMutation,
    bulkUpdateWatchedMutation
  } = useMediaMutations();

  // Poll active sessions list every 5 seconds
  const { data: activeSessions = [] } = useActiveSessionsQuery({
    refetchInterval: 5000,
  });

  const { data: movieDetail, isLoading: isMovieLoading } = useLibraryItemDetailQuery(cleanId, {
    enabled: isSingleItem,
    mediaType: type,
  });
  const { locale } = useTranslation();
  const metadataLanguage = locale === 'en' ? 'en-US' : locale;
  const { data: tvDetail, isLoading: isTvLoading } = useLibraryTvDetailQuery(cleanId, {
    enabled: !isSingleItem,
    seasonsLimit: 999,
    initialEpisodesLimit: 999,
    language: metadataLanguage,
  });

  const initialItem = isSingleItem ? movieDetail : tvDetail;

  const isPlaying = activeSessions.some(id => {
    if (isSingleItem) {
      return Number(id) === Number(initialItem?.id) || Number(id) === Number(initialItem?.library_item_id) || String(id) === String(cleanId);
    }
    if (initialItem?.seasons) {
      return initialItem.seasons.some(season => 
        (season.episodes || []).some(ep => 
          (ep.media_item_id != null && Number(ep.media_item_id) === Number(id)) || 
          String(ep.id) === String(id)
        )
      );
    }
    return false;
  });

  // Re-run the details query with a refetchInterval if isPlaying is true
  const { data: movieDetailLive } = useLibraryItemDetailQuery(cleanId, {
    enabled: isSingleItem && isPlaying,
    mediaType: type,
    refetchInterval: 5000,
  });
  const { data: tvDetailLive } = useLibraryTvDetailQuery(cleanId, {
    enabled: !isSingleItem && isPlaying,
    seasonsLimit: 999,
    initialEpisodesLimit: 999,
    language: metadataLanguage,
    refetchInterval: 5000,
  });

  const liveItem = isPlaying ? (isSingleItem ? movieDetailLive : tvDetailLive) : null;
  const item = liveItem || initialItem;

  const isLoading = isSingleItem ? isMovieLoading : isTvLoading;
  const effectiveId = item?.id ?? cleanId;
  const { data: settings } = useSettingsQuery();



  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && item && item.is_adult && !settings?.include_adult) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, item, settings?.include_adult, navigate]);

  const prevIsPlaying = useRef(isPlaying);
  useEffect(() => {
    if (prevIsPlaying.current !== isPlaying) {
      queryClient.invalidateQueries({ queryKey: ['library-item-detail'] });
      queryClient.invalidateQueries({ queryKey: ['library-tv-detail'] });
      queryClient.invalidateQueries({ queryKey: QK.watchedHistory });
    }
    prevIsPlaying.current = isPlaying;
  }, [isPlaying, queryClient]);

  const isScene = isSceneMedia || item?.type === 'scene';
  const {
    activePanel,
    isSideNavVisible,
    togglePanel,
    handleToggleSideNav
  } = useMediaDetailTabs({ cleanId, isMovie, isScene });

  useEffect(() => {
    if (!isMovie || !cleanId || !String(item?.id || '').startsWith('tmdb_')) return;
    if (item?.people_complete) return;
    if (!item?.cast?.length) return;
    if (fullPeoplePrefetchRef.current.has(cleanId)) return;

    fullPeoplePrefetchRef.current.add(cleanId);

    api.library.getItemDetail(cleanId, { fullPeople: true })
      .then((fullItem) => {
        queryClient.setQueryData(['library-item-detail', cleanId], (current) => {
          if (!current) return fullItem;
          return {
            ...current,
            directors: fullItem.directors ?? current.directors,
            writers: fullItem.writers ?? current.writers,
            cast: fullItem.cast ?? current.cast,
            cast_total: fullItem.cast_total ?? current.cast_total,
            people_complete: fullItem.people_complete ?? current.people_complete,
          };
        });
      })
      .catch(() => {
        fullPeoplePrefetchRef.current.delete(cleanId);
      });
  }, [cleanId, isMovie, item, queryClient]);

  useEffect(() => {
    if (isMovie || !cleanId || !item?.progressive_seasons || item?.in_library !== false) return;
    const allSeasonNumbers = Array.isArray(item?.season_numbers) ? item.season_numbers : [];
    if (allSeasonNumbers.length === 0) return;

    let cancelled = false;
    const loadedSeasonMap = new Map((item?.seasons || []).map((season) => [Number(season?.season_number), season]));
    const pendingSeasonNumbers = allSeasonNumbers.filter((seasonNumber) => {
      const numericSeasonNumber = Number(seasonNumber);
      const season = loadedSeasonMap.get(numericSeasonNumber);
      if (!Number.isFinite(numericSeasonNumber)) return false;
      if (!season) return true;
      return season.episodes_complete === false;
    });

    if (pendingSeasonNumbers.length === 0) return;

    const mergeSeasonIntoDetail = (current, seasonPayload) => {
      if (!current || !seasonPayload) return current;
      const existingSeasons = Array.isArray(current.seasons) ? current.seasons : [];
      const nextMap = new Map(existingSeasons.map((season) => [Number(season?.season_number), season]));
      nextMap.set(Number(seasonPayload.season_number), {
        ...(nextMap.get(Number(seasonPayload.season_number)) || {}),
        ...seasonPayload,
      });
      return {
        ...current,
        seasons: Array.from(nextMap.values()).sort((a, b) => Number(a?.season_number || 0) - Number(b?.season_number || 0)),
      };
    };

    const run = async () => {
      for (const seasonNumber of pendingSeasonNumbers) {
        const prefetchKey = `${cleanId}:${seasonNumber}`;
        if (unownedSeasonPrefetchRef.current.has(prefetchKey)) continue;
        unownedSeasonPrefetchRef.current.add(prefetchKey);
        try {
          const seasonPayload = await api.library.getTvSeasonDetail(cleanId, seasonNumber);
          if (cancelled) return;
          queryClient.setQueryData(['library-tv-detail', cleanId], (current) => mergeSeasonIntoDetail(current, seasonPayload));
        } catch {
          unownedSeasonPrefetchRef.current.delete(prefetchKey);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [cleanId, isMovie, item, queryClient]);


  const toggleSeason = (seasonNum) => {
    setExpandedSeasons(prev => ({
      ...prev,
      [seasonNum]: !prev[seasonNum]
    }));
  };

  const currentRating = item?.user_rating !== undefined ? item.user_rating : item?.overrides?.user_rating;
  const displayRating = hoveredRating !== null ? hoveredRating : currentRating;
  const starsFillPercent = displayRating ? (displayRating / 10) * 100 : 0;
  const starsStyleSheetText = `.rating-stars-overlay-dynamic { width: ${starsFillPercent}% !important; }`;
  const verticalBarText = '|';

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    let val = Math.ceil(percent * 20) / 2;
    val = Math.max(0.5, Math.min(10.0, val));
    setHoveredRating(val);
  };

  const handleMouseLeave = () => {
    setHoveredRating(null);
  };

  const handleClick = () => {
    if (hoveredRating !== null) {
      const isSame = currentRating !== null && currentRating !== undefined && Number(currentRating) === Number(hoveredRating);
      const targetRating = isSame ? null : hoveredRating;
      updateStatusMutation.mutate({
        itemId: effectiveId,
        tvId: cleanId,
        payload: {
          user_rating: targetRating,
          media_type: type
        }
      });
    }
  };
  const handleRatingChange = (targetRating) => {
    updateStatusMutation.mutate({
      itemId: effectiveId,
      tvId: cleanId,
      payload: {
        user_rating: targetRating,
        media_type: type
      }
    });
  };

  const handleOpenReviewModal = () => {
    const currentComment = item?.user_comment !== undefined ? item.user_comment : item?.overrides?.user_comment;

    openModal({
      title: t('library.details.writeReview') || 'Write Review',
      icon: PenLine,
      content: (
        <ReviewModalContent
          initialComment={currentComment}
          onSave={(newComment) => {
            updateStatusMutation.mutate({
              itemId: effectiveId,
              tvId: cleanId,
              payload: {
                user_comment: newComment || null,
                media_type: type
              }
            });
            closeModal();
          }}
          t={t}
        />
      ),
      footer: (
        <div className="modal-footer-row">
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.close') || 'Close'}
          </Button>
          <Button variant="primary" type="submit" form="review-modal-form">
            {t('common.save') || 'Save'}
          </Button>
        </div>
      ),
    });
  };

  const title = item?.title || item?.filename || (isMovie ? 'Movie Title Placeholder' : isScene ? 'Scene Title Placeholder' : 'Tv Title Placeholder');
  const originalTitle = item?.original_title;
  const showOriginalTitle = originalTitle && title && originalTitle.toLowerCase() !== title.toLowerCase();
  const tagline = item?.tagline || '';
  const taglineText = tagline ? `"${tagline}"` : '';

  const getMetaDate = () => {
    if (!item) return '';
    if (isMovie || isScene) {
      return item.release_date ? item.release_date.substring(0, 10) : '';
    } else {
      const firstYear = item.first_air_date ? item.first_air_date.substring(0, 4) : '';
      const lastYear = item.last_air_date ? item.last_air_date.substring(0, 4) : '';
      const isEnded = item.release_status?.toLowerCase() === 'ended' || item.release_status?.toLowerCase() === 'canceled';
      if (firstYear && lastYear && isEnded) {
        return firstYear === lastYear ? firstYear : `${firstYear} – ${lastYear}`;
      }
      return firstYear;
    }
  };
  const metaDate = getMetaDate();

  const getMovieDuration = () => {
    let dur = item?.technical?.duration;
    if (dur) {
      if (typeof dur === 'string' && dur.includes(':')) {
        const parts = dur.split(':').map(Number);
        if (parts.length === 2) dur = parts[0] * 60 + parts[1];
        else if (parts.length === 3) dur = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return getDurationText(dur, t);
    }
    let rt = item?.runtime;
    if (rt) {
      if (typeof rt === 'string' && rt.includes(':')) {
        const parts = rt.split(':').map(Number);
        if (parts.length === 2) rt = (parts[0] * 60 + parts[1]) / 60;
        else if (parts.length === 3) rt = (parts[0] * 3600 + parts[1] * 60 + parts[2]) / 60;
      }
      return getDurationText(rt * 60, t);
    }
    return '';
  };

  const getSceneDuration = () => {
    if (item?.formatted_duration) return item.formatted_duration;
    let dur = item?.runtime || item?.technical?.duration;
    if (!dur) return '';
    if (typeof dur === 'string' && dur.includes(':')) {
      const parts = dur.split(':').map(Number);
      if (parts.length === 2) {
        dur = parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        dur = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
    if (dur) return getDurationText(dur, t);
    return '';
  };

  const formattedDuration = isMovie
    ? getMovieDuration()
    : (isScene ? getSceneDuration() : '');

  let seasonsCount = 0;
  let episodesCount = 0;
  if (!isMovie && item?.seasons) {
    const regularSeasons = item.seasons.filter(s => s.season_number > 0);
    seasonsCount = regularSeasons.length;
    episodesCount = regularSeasons.reduce((acc, s) => {
      if (s.episodes && s.episodes.length > 0) {
        const countEpisodesInNumber = (epNum) => {
          if (epNum === undefined || epNum === null) return 1;
          const str = String(epNum).trim();
          if (!str) return 1;

          if (str.includes(',')) {
            const parts = str.split(',').map(s => s.trim()).filter(Boolean);
            return parts.length > 0 ? parts.length : 1;
          }

          if (str.includes('-')) {
            const parts = str.split('-').map(s => s.trim()).filter(Boolean);
            if (parts.length === 2) {
              const start = parseInt(parts[0], 10);
              const end = parseInt(parts[1], 10);
              if (!isNaN(start) && !isNaN(end) && end >= start) {
                return end - start + 1;
              }
            }
          }

          return 1;
        };
        return acc + s.episodes.reduce((sum, ep) => sum + countEpisodesInNumber(ep.episode_number), 0);
      }
      return acc + (s.episode_count || 0);
    }, 0);
  }

  const seasonsText = !isMovie && seasonsCount > 0
    ? (seasonsCount === 1
      ? t('library.details.seasonSingular', { defaultValue: '1 Season' })
      : t('library.details.seasonPlural', { count: seasonsCount, defaultValue: '{{count}} Seasons' }))
    : '';

  const episodesText = !isMovie && episodesCount > 0
    ? (episodesCount === 1
      ? t('library.details.episodeSingular', { defaultValue: '1 Episode' })
      : t('library.details.episodePlural', { count: episodesCount, defaultValue: '{{count}} Episodes' }))
    : '';

  const langText = item?.original_language ? String(item.original_language).toUpperCase() : '';

  const ratingImdb = item?.rating_imdb;
  const ratingTmdb = item?.rating_tmdb;
  const ratingPorndb = item?.rating_porndb;
  const isSceneType = item?.type === 'scene';
  const showImdb = !isSceneType && !!ratingImdb && Number(ratingImdb) > 0;
  const showTmdb = !isSceneType && !showImdb && !!ratingTmdb && Number(ratingTmdb) > 0;
  const showPorndb = isSceneType
    ? (!!ratingPorndb && Number(ratingPorndb) > 0)
    : (!showImdb && !showTmdb && !!ratingPorndb && Number(ratingPorndb) > 0);

  const normalizedGenres = item?.genres || [];
  const rawOverview = item?.overview || '';
  const overview = item?.is_adult
    ? rawOverview
      .split('\n')
      .filter(line => !line.trim().startsWith('Studio:'))
      .join('\n')
      .trim()
    : rawOverview;
  const hasTechnicalPanel = Boolean(item?.technical && (
    item.technical.resolution
    || item.technical.video_codec
    || item.technical.audio_codec
    || item.technical.duration
    || item.technical.size_bytes
    || item.technical.hdr_type
    || item.technical.bit_depth
    || item.technical.framerate
    || (isMovie && item.technical.edition && item.technical.edition !== 'none')
    || (isMovie && item.technical.source && item.technical.source !== 'none')
    || (isMovie && item.technical.audio_type && item.technical.audio_type !== 'none')
  ));

  const isOwned = item && item.in_library !== false;
  const isTracked = Boolean(item?.is_tracked);
  const trackedExternalId = !isOwned
    ? (isScene
      ? (() => {
          if (item?.external_ids?.source && item?.external_ids?.stash_id) {
            const src = String(item.external_ids.source).toLowerCase();
            const prefix = (src === 'theporndb' || src === 'porndb')
              ? 'porndb_'
              : src === 'fansdb'
                ? 'fansdb_'
                : 'stash_';
            return `${prefix}${item.external_ids.stash_id}`;
          }
          return cleanId.startsWith('porndb_') || cleanId.startsWith('fansdb_') || cleanId.startsWith('stash_')
            ? cleanId
            : `stash_${cleanId}`;
        })()
      : (cleanId.startsWith('porndb_') || cleanId.startsWith('fansdb_') ? cleanId : Number(item?.tv_tmdb_id || item?.tmdb_id || cleanId || 0))
    )
    : 0;
  const trackedMediaType = isScene ? 'scene' : (isMovie ? 'movie' : 'tv');
  const canToggleTracked = !isOwned && (
    isScene
      ? !!trackedExternalId
      : (typeof trackedExternalId === 'string' && (trackedExternalId.startsWith('porndb_') || trackedExternalId.startsWith('fansdb_'))
        ? true
        : (Number.isFinite(trackedExternalId) && trackedExternalId > 0)
      )
  );

  const getIsTvWatched = () => {
    if (!item) return false;
    // Check if the user override has explicitly set is_watched on the show
    if (item.is_watched) return true;
    if (item.overrides?.is_watched) return true;
    
    // Otherwise check if the watched episodes count equals or exceeds the total episodes count
    const totalEps = item.watch_stats?.total_episodes_count || item.number_of_episodes || 0;
    const watchedEps = item.watch_stats?.watched_episodes_count || 0;
    return totalEps > 0 && watchedEps >= totalEps;
  };
  const isWatched = (isMovie || isScene) ? (item?.is_watched || item?.overrides?.is_watched) : getIsTvWatched();


  const canToggleWatched = (isMovie || isScene)
    ? Boolean(item)
    : Boolean(
      item?.seasons
        ?.filter((season) => season.season_number > 0)
        .some((season) => (season.episodes || []).length > 0)
    );

  const getNextEpisodeInfo = () => {
    if (!item?.seasons) return null;
    for (const season of item.seasons) {
      const sNum = season.season_number;
      const ownedEpisodes = (season.episodes || []).filter(e => e.path && !e.is_missing);
      const inProgress = ownedEpisodes.find(e => e.resume_position > 0);
      if (inProgress) {
        return { episode: inProgress, seasonNumber: sNum };
      }
    }
    for (const season of item.seasons) {
      const sNum = season.season_number;
      const ownedEpisodes = (season.episodes || []).filter(e => e.path && !e.is_missing);
      const unwatched = ownedEpisodes.find(e => !e.is_watched);
      if (unwatched) {
        return { episode: unwatched, seasonNumber: sNum };
      }
    }
    for (const season of item.seasons) {
      const sNum = season.season_number;
      const ownedEpisodes = (season.episodes || []).filter(e => e.path && !e.is_missing);
      if (ownedEpisodes.length > 0) {
        return { episode: ownedEpisodes[0], seasonNumber: sNum };
      }
    }
    return null;
  };
  const nextEpisodeInfo = !isMovie ? getNextEpisodeInfo() : null;

  const handleTrailerClick = () => {
    if (!item?.trailer_key) return;

    let ipcRenderer = null;
    try {
      if (window.require) {
        ipcRenderer = window.require('electron').ipcRenderer;
      }
    } catch { /* ignore */ }

    const trailerSuffix = ` - ${t('library.details.trailer') || 'Trailer'}`;
    if (ipcRenderer) {
      ipcRenderer.invoke('mpv-open-fullscreen', {
        url: `https://www.youtube.com/watch?v=${item.trailer_key}`,
        title: `${title}${trailerSuffix}`
      });
    } else {
      openModal({
        title: `${title}${trailerSuffix}`,
        variant: 'extra-wide',
        className: 'theater-modal',
        content: (
          <iframe
            width="100%"
            src={`https://www.youtube.com/embed/${item.trailer_key}?autoplay=1`}
            title="Trailer"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="trailer-iframe"
          />
        )
      });
    }
  };

  const handlePlayClick = () => {
    const targetId = (isMovie || isScene) ? item.id : nextEpisodeInfo?.episode.id;
    if (!targetId) return;
    playMutation.mutate(targetId);
  };

  const handleToggleWatched = () => {
    if (isMovie || isScene) {
      updateStatusMutation.mutate({
        itemId: effectiveId,
        tvId: cleanId,
        payload: {
          is_watched: !item?.is_watched,
          media_type: type
        }
      });
    } else {
      if (!item?.seasons) return;
      const regularSeasons = item.seasons.filter(s => s.season_number > 0);
      const episodes = regularSeasons.flatMap(s => s.episodes || []);
      const episodeIds = episodes.map(e => e.id);
      if (episodeIds.length === 0) return;
      bulkUpdateWatchedMutation.mutate({
        itemIds: episodeIds,
        isWatched: !isWatched,
        tvId: cleanId
      });
    }
  };

  const handleToggleTracked = () => {
    if (!canToggleTracked || toggleTrackedMutation.isPending) {
      return;
    }
    toggleTrackedMutation.mutate({
      tmdbId: trackedExternalId,
      mediaType: trackedMediaType,
      isTracked,
    });
  };

  useEffect(() => {
    if (overviewRef.current) {
      const el = overviewRef.current;
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [overview, isLoading]);

  const handleReadMore = () => {
    openModal({
      title: title,
      icon: Info,
      variant: 'wide',
      description: t('library.details.overview') || 'Overview',
      content: (
        <div className="read-more-overview">
          {overview.split('\n\n').map((paragraph, index) => (
            <p key={index} className="read-more-paragraph">{paragraph}</p>
          ))}
        </div>
      )
    });
  };

  const backdropPath = item?.backdrop_path || '';
  const backdropUrl = resolveDetailsImageUrl(backdropPath, API_BASE, 'backdrop');

  const logoPathRaw = item?.logo_path || '';
  let logoPath = logoPathRaw;
  if (!logoPath && item?.type === 'scene') {
    const studioLogo = item?.companies?.[0]?.logo_path;
    const networkLogo = item?.networks?.[0]?.logo_path;
    logoPath = studioLogo || networkLogo || '';
  }
  const logoUrl = resolveDetailsImageUrl(logoPath, API_BASE, 'logo');
  const posterPath = item?.poster_path || '';
  const posterUrl = resolveDetailsImageUrl(posterPath, API_BASE, 'poster');

  const studioName = item?.companies?.[0]?.name || '';
  const networkName = item?.networks?.[0]?.name || '';


  let showStudioPill = false;
  let showNetworkPill = false;



  return {
    state: {
      showStudioPill,
      showNetworkPill,
      studioName,
      networkName,
      hoveredRating,
      activePanel,
      expandedSeasons,
      isSideNavVisible,
      isWatchLogsExpanded,
      isTruncated,
      overviewRef,
      currentRating,
      displayRating,
      starsFillPercent,
      starsStyleSheetText,
      verticalBarText,
      title,
      originalTitle,
      showOriginalTitle,
      tagline,
      taglineText,
      metaDate,
      formattedDuration,
      seasonsText,
      episodesText,
      langText,
      showImdb,
      ratingImdb,
      showTmdb,
      ratingTmdb,
      showPorndb,
      ratingPorndb,
      normalizedGenres,
      overview,
      hasTechnicalPanel,
      isMovie,
      isScene,
      isOwned,
      isTracked,
      canToggleTracked,
      isWatched,
      canToggleWatched,
      nextEpisodeInfo,
      backdropUrl,
      logoUrl,
      posterUrl,
      item,
      isLoading,
      settings,
      cleanId,
      effectiveId
    },
    actions: {
      togglePanel,
      handleToggleSideNav,
      toggleSeason,
      handleMouseMove,
      handleMouseLeave,
      handleClick,
      handleRatingChange,
      handleOpenReviewModal,
      handleTrailerClick,
      handlePlayClick,
      handleToggleWatched,
      handleToggleTracked,
      handleReadMore,
      setIsWatchLogsExpanded
    },
    mutations: {
      updateStatusMutation,
      overrideBackdropMutation,
      toggleTrackedMutation,
      playMutation,
      bulkUpdateWatchedMutation,
      addPeakMutation,
      deletePeakMutation
    }
  };
}

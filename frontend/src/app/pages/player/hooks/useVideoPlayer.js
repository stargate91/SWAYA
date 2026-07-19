import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsQuery, useUpdateMediaStatusMutation } from '../../../queries';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';

// Sub-hooks imports
import usePlayerState from './usePlayerState';
import usePlayerKeyboardControls from './usePlayerKeyboardControls';
import usePlayerIpc from './usePlayerIpc';
import usePlayerAutoplay from './usePlayerAutoplay';

const getQueryParam = (name) => {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has(name)) {
    return searchParams.get(name);
  }
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex !== -1) {
    const hashParams = new URLSearchParams(hash.substring(qIndex));
    if (hashParams.has(name)) {
      return hashParams.get(name);
    }
  }
  return null;
};

export default function useVideoPlayer({ itemId, containerRef }) {
  const navigate = useNavigate();
  const updateStatusMutation = useUpdateMediaStatusMutation();
  const { data: settings } = useSettingsQuery();
  const theme = settings?.ui_theme || 'dark';

  const isTrailer = getQueryParam('is_trailer') === 'true' || itemId === 'trailer';
  const queryTitle = getQueryParam('title');

  // Core State Hook
  const state = usePlayerState(isTrailer, queryTitle);

  const countdownIntervalRef = useRef(null);
  const hasTriggeredEndRef = useRef(false);
  const controlsTimeoutRef = useRef(null);
  const osdTimeoutRef = useRef(null);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Height of bottom controls
  const CONTROLS_FIT_THRESHOLD = 80;

  const updateBottomOffset = useCallback((params) => {
    if (!params || !params.aspect || !containerRef.current) {
      state.setBottomOffset(0);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    if (containerWidth === 0 || containerHeight === 0) return;

    const containerAspect = containerWidth / containerHeight;
    const videoAspect = params.aspect;

    if (videoAspect > containerAspect) {
      const displayedVideoHeight = containerWidth / videoAspect;
      const blackBarHeight = (containerHeight - displayedVideoHeight) / 2;

      if (blackBarHeight >= CONTROLS_FIT_THRESHOLD) {
        state.setBottomOffset(0);
      } else {
        state.setBottomOffset(Math.max(0, Math.round(blackBarHeight)));
      }
    } else {
      state.setBottomOffset(0);
    }
  }, [containerRef, state]);

  useEffect(() => {
    updateBottomOffset(state.videoParams);
  }, [state.videoParams, updateBottomOffset]);

  const sendCommand = useCallback((args) => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-command', args);
    } catch (err) {
      console.warn('Failed to send command to MPV:', args, err);
    }
  }, []);

  const saveProgress = useCallback(async () => {
    if (itemId === 'trailer' || getQueryParam('is_trailer') === 'true') return;
    const cTime = state.currentTimeRef.current;
    const dur = state.durationRef.current;
    if (cTime <= 0) return;

    try {
      const backendPort = getQueryParam('backend_port') || '8000';
      await fetch(`http://localhost:${backendPort}/api/v1/media/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: String(itemId),
          current_time: Math.round(cTime),
          total_length: Math.round(dur)
        })
      });
    } catch {
      // Ignore background save errors
    }
  }, [itemId, state.currentTimeRef, state.durationRef]);

  const handleClose = useCallback(async () => {
    await saveProgress();
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-close');
    } catch { /* ignore */ }
    navigate(-1);
  }, [navigate, saveProgress]);

  const handleCloseRef = useRef(handleClose);
  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  const handlePlayNext = useCallback(async () => {
    if (!state.nextEpisode) return;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    state.setShowEndOverlay(false);

    const savedVolume = parseInt(localStorage.getItem('player_volume'), 10);
    const savedMute = localStorage.getItem('player_mute') === 'true';

    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('mpv-open-fullscreen', {
        itemId: state.nextEpisode.id,
        volume: isNaN(savedVolume) ? undefined : savedVolume,
        mute: savedMute,
      }).catch(() => {});
    } catch {
      navigate(`/player/${state.nextEpisode.id}`);
    }
  }, [state.nextEpisode, navigate, state.setShowEndOverlay]);

  const handlePlayNextRef = useRef(handlePlayNext);
  useEffect(() => {
    handlePlayNextRef.current = handlePlayNext;
  }, [handlePlayNext]);

  // Autoplay Autostart Hook
  usePlayerAutoplay({
    showEndOverlay: state.showEndOverlay,
    nextEpisode: state.nextEpisode,
    countdownIntervalRef,
    setCountdown: state.setCountdown,
    handlePlayNextRef,
  });

  const handlePlayPause = useCallback(() => {
    sendCommand(['cycle', 'pause']);
  }, [sendCommand]);

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    state.setCurrentTime(val);
    sendCommand(['seek', val, 'absolute']);
  };

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    state.setVolume(val);
    localStorage.setItem('player_volume', String(val));
    sendCommand(['set_property', 'volume', val]);
  };

  const toggleMute = useCallback(() => {
    const nextMuted = !state.isMuted;
    state.setIsMuted(nextMuted);
    localStorage.setItem('player_mute', String(nextMuted));
    sendCommand(['set_property', 'mute', nextMuted]);
  }, [state.isMuted, state.setIsMuted, sendCommand]);

  const handleSpeedUp = () => {
    const nextSpeed = Math.min(16.0, state.speed * 2);
    sendCommand(['set_property', 'speed', nextSpeed]);
  };

  const handleSpeedDown = () => {
    const nextSpeed = Math.max(0.25, state.speed / 2);
    sendCommand(['set_property', 'speed', nextSpeed]);
  };

  const handleAddPeak = useCallback(async (e) => {
    if (e && e.currentTarget) {
      e.currentTarget.blur();
    }
    state.setJustAddedPeak(true);
    setTimeout(() => state.setJustAddedPeak(false), 1500);

    let snapshotPath = null;
    try {
      const { ipcRenderer } = window.require('electron');
      const filename = `finish_${itemId}_${Date.now()}.jpg`;
      const result = await ipcRenderer.invoke('mpv-take-snapshot', { filename });
      if (result && result.success) {
        snapshotPath = result.filepath;
      }
    } catch (err) {
      console.warn('Failed to take mpv snapshot:', err);
    }

    try {
      const backendPort = getQueryParam('backend_port') || '8000';
      await fetch(`http://localhost:${backendPort}/api/v1/library/item/${itemId}/peaks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_position: Math.round(state.currentTime),
          snapshot_path: snapshotPath
        })
      });
    } catch (e) {
      console.error('Failed to add peak:', e);
    }
  }, [itemId, state.currentTime, state.setJustAddedPeak]);

  const handleAddPeakRef = useRef(handleAddPeak);
  useEffect(() => {
    handleAddPeakRef.current = handleAddPeak;
  }, [handleAddPeak]);

  // Helper to trigger OSD message
  const triggerOsd = useCallback((text) => {
    state.setOsdMessage(text);
    if (osdTimeoutRef.current) {
      clearTimeout(osdTimeoutRef.current);
    }
    osdTimeoutRef.current = setTimeout(() => {
      state.setOsdMessage('');
    }, 2000);
  }, [state]);

  // Key & Mouse Controls Hook
  const { handleMouseMove, handleWheel, handleDoubleClick } = usePlayerKeyboardControls({
    isAdult: state.isAdult,
    isPaused: state.isPaused,
    volume: state.volume,
    isMuted: state.isMuted,
    setVolume: state.setVolume,
    setIsMuted: state.setIsMuted,
    setShowControls: state.setShowControls,
    sendCommand,
    handlePlayPause,
    toggleMute,
    handleTogglePip: () => {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('mpv-toggle-pip');
      } catch {}
    },
    triggerOsd,
    handleAddPeakRef,
  });

  // IPC Event Listener Hook
  usePlayerIpc({
    itemId,
    isTrailer,
    containerRef,
    videoParamsRef: state.videoParamsRef,
    durationRef: state.durationRef,
    volumeRef: state.volumeRef,
    isMutedRef: state.isMutedRef,
    chaptersRef: state.chaptersRef,
    hasTriggeredEndRef,
    setCurrentTime: state.setCurrentTime,
    setShowEndOverlay: state.setShowEndOverlay,
    setDuration: state.setDuration,
    setIsPaused: state.setIsPaused,
    setVolume: state.setVolume,
    setIsMuted: state.setIsMuted,
    setChapters: state.setChapters,
    setTrackList: state.setTrackList,
    setSubDelay: state.setSubDelay,
    setAudioDelay: state.setAudioDelay,
    setSpeed: state.setSpeed,
    setVideoParams: state.setVideoParams,
    setIsPip: state.setIsPip,
    handleCloseRef,
    updateBottomOffset,
    sendCommand,
  });

  // Periodic progress saving
  useEffect(() => {
    if (!state.isPlaying) return;
    const interval = setInterval(saveProgress, 5000);
    return () => clearInterval(interval);
  }, [state.isPlaying, saveProgress]);

  // Clock Update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
      state.setClockTime(now.toLocaleTimeString('en-US', timeOptions));

      if (state.duration > 0) {
        const remainingSeconds = state.duration - state.currentTime;
        const end = new Date(now.getTime() + remainingSeconds * 1000);
        state.setEndTime(end.toLocaleTimeString('en-US', timeOptions));
      }
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, [state.currentTime, state.duration, state.setClockTime, state.setEndTime]);

  // Page Load / Controls Only
  useEffect(() => {
    if (!itemId) return;

    let isMounted = true;
    let ipcRenderer = null;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch {
      console.warn('Electron IPC not available');
    }

    const fetchInfoAndStart = async () => {
      if (isTrailer) return;
      try {
        const backendPort = getQueryParam('backend_port') || '8000';
        const controlsOnly = getQueryParam('controls_only') === 'true';
        const res = await fetch(`http://localhost:${backendPort}/api/v1/media/playback-info/${itemId}`);
        if (!res.ok) throw new Error('Failed to load playback details');
        const data = await res.json();

        if (!isMounted) return;
        state.setTitle(data.title);
        state.setIsAdult(data.is_adult);
        state.setMediaType(data.media_type);
        state.setUserRating(data.user_rating);
        state.setNextEpisode(data.next_episode);
        state.setFirstEpisode(data.first_episode);
        state.setPeaksCount(data.peaks_count || 0);
        state.setCollectionNext(data.collection_next);
        state.setPerformerUnwatched(data.performer_unwatched);
        state.setStudioUnwatched(data.studio_unwatched);
        state.setSurpriseMe(data.surprise_me);
        state.setTvShowId(data.tv_show_id);
        state.setTvShowTitle(data.tv_show_title);
        state.setTvShowRating(data.tv_show_rating);
        state.setSeasonNumber(data.season_number);
        state.setEpisodeNumber(data.episode_number);
        if (data.tv_show_poster) {
          const resolvedTvPoster = resolveMediaImageUrl(data.tv_show_poster, 'poster', `http://localhost:${backendPort}`);
          state.setTvShowPoster(resolvedTvPoster);
        }
        if (data.season_poster) {
          const resolvedSeasonPoster = resolveMediaImageUrl(data.season_poster, 'poster', `http://localhost:${backendPort}`);
          state.setSeasonPoster(resolvedSeasonPoster);
        }
        if (data.logo_path) {
          const resolved = resolveMediaImageUrl(data.logo_path, 'logo', `http://localhost:${backendPort}`);
          state.setLogoUrl(resolved);
        }
        if (data.media_image) {
          const resolvedImage = resolveMediaImageUrl(
            data.media_image,
            data.media_type === 'episode' ? 'still' : (data.media_type === 'scene' || data.is_adult ? 'scene_stills' : 'poster'),
            `http://localhost:${backendPort}`
          );
          state.setMediaImage(resolvedImage);
        }

        if (controlsOnly) {
          state.setIsPlaying(true);
          return;
        }

        if (ipcRenderer && containerRef.current) {
          const bounds = containerRef.current.getBoundingClientRect();
          await ipcRenderer.invoke('mpv-play', {
            filePath: data.file_path,
            bounds: {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height
            }
          });

          const startParam = getQueryParam('start');
          const startSec = startParam ? parseInt(startParam, 10) : data.start_seconds;
          if (startSec > 0) {
            ipcRenderer.send('mpv-command', ['seek', startSec, 'absolute']);
          }

          state.setIsPlaying(true);
        }
      } catch (err) {
        console.error(err);
        state.setTitle('Error playing file');
      }
    };

    fetchInfoAndStart();

    const controlsOnly = getQueryParam('controls_only') === 'true';
    if (controlsOnly) {
      document.body.style.backgroundColor = 'transparent';
      document.body.style.background = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
      document.documentElement.style.background = 'transparent';
    }
    return () => {
      isMounted = false;
      if (controlsOnly) {
        document.body.style.backgroundColor = '';
        document.body.style.background = '';
        document.documentElement.style.backgroundColor = '';
        document.documentElement.style.background = '';
      }
    };
  }, [itemId, isTrailer, containerRef, state.setIsPlaying, state.setTitle, state.setIsAdult, state.setMediaType, state.setUserRating, state.setNextEpisode, state.setFirstEpisode, state.setPeaksCount, state.setCollectionNext, state.setPerformerUnwatched, state.setStudioUnwatched, state.setSurpriseMe, state.setTvShowId, state.setTvShowTitle, state.setTvShowRating, state.setSeasonNumber, state.setEpisodeNumber, state.setTvShowPoster, state.setSeasonPoster, state.setLogoUrl, state.setMediaImage]);

  const handleRate = async (rating) => {
    if (state.tvShowId) {
      state.setTvShowRating(rating);
      try {
        await updateStatusMutation.mutateAsync({
          itemId: state.tvShowId,
          payload: {
            user_rating: rating,
            media_type: 'tv'
          }
        });
      } catch (e) {
        console.error('Failed to update TV show rating:', e);
      }
    } else {
      state.setUserRating(rating);
      try {
        await updateStatusMutation.mutateAsync({
          itemId: itemId,
          payload: {
            user_rating: rating,
            media_type: state.mediaType
          }
        });
      } catch (e) {
        console.error('Failed to update rating:', e);
      }
    }
  };

  const handleReplay = () => {
    hasTriggeredEndRef.current = false;
    state.setShowEndOverlay(false);
    sendCommand(['seek', 0, 'absolute']);
    sendCommand(['set_property', 'pause', false]);
  };

  const prevSubDelayRef = useRef(0);
  const prevAudioDelayRef = useRef(0);

  useEffect(() => {
    if (state.subDelay !== prevSubDelayRef.current) {
      triggerOsd(`Subtitle delay: ${Math.round(state.subDelay * 1000)} ms`);
      prevSubDelayRef.current = state.subDelay;
    }
  }, [state.subDelay, triggerOsd]);

  useEffect(() => {
    if (state.audioDelay !== prevAudioDelayRef.current) {
      triggerOsd(`Audio delay: ${Math.round(state.audioDelay * 1000)} ms`);
      prevAudioDelayRef.current = state.audioDelay;
    }
  }, [state.audioDelay, triggerOsd]);

  const handleTogglePip = useCallback(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-toggle-pip');
    } catch {}
  }, []);

  function handleMinimizePip() {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-minimize');
    } catch {}
  }

  return {
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    currentTime: state.currentTime,
    duration: state.duration,
    volume: state.volume,
    isMuted: state.isMuted,
    title: state.title,
    logoUrl: state.logoUrl,
    showControls: state.showControls,
    isPip: state.isPip,
    showEndOverlay: state.showEndOverlay,
    userRating: state.userRating,
    hoverRating: state.hoverRating,
    nextEpisode: state.nextEpisode,
    firstEpisode: state.firstEpisode,
    episodeNumber: state.episodeNumber,
    countdown: state.countdown,
    speed: state.speed,
    isAdult: state.isAdult,
    mediaType: state.mediaType,
    mediaImage: state.mediaImage,
    justAddedPeak: state.justAddedPeak,
    logoError: state.logoError,
    chapters: state.chapters,
    clockTime: state.clockTime,
    endTime: state.endTime,
    trackList: state.trackList,
    showAudioMenu: state.showAudioMenu,
    showSubMenu: state.showSubMenu,
    bottomOffset: state.bottomOffset,
    osdMessage: state.osdMessage,
    peaksCount: state.peaksCount,
    collectionNext: state.collectionNext,
    performerUnwatched: state.performerUnwatched,
    studioUnwatched: state.studioUnwatched,
    surpriseMe: state.surpriseMe,
    tvShowId: state.tvShowId,
    tvShowTitle: state.tvShowTitle,
    tvShowPoster: state.tvShowPoster,
    tvShowRating: state.tvShowRating,
    seasonNumber: state.seasonNumber,
    seasonPoster: state.seasonPoster,
    setShowAudioMenu: state.setShowAudioMenu,
    setShowSubMenu: state.setShowSubMenu,
    setLogoError: state.setLogoError,
    setHoverRating: state.setHoverRating,
    setNextEpisode: state.setNextEpisode,
    setFirstEpisode: state.setFirstEpisode,
    handleMouseMove,
    handleWheel,
    handleDoubleClick,
    handleClose,
    handlePlayPause,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    handleSpeedUp,
    handleSpeedDown,
    handleAddPeak,
    handleRate,
    handleReplay,
    handleTogglePip,
    handleMinimizePip,
    handlePlayNext,
    sendCommand,
  };
}

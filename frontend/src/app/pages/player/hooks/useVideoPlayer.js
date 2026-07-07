import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSettingsQuery, useUpdateMediaStatusMutation } from '../../../queries';
import { resolveMediaImageUrl } from '../../../lib/imageUrls';

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
  const queryClient = useQueryClient();
  const updateStatusMutation = useUpdateMediaStatusMutation();
  const { data: settings } = useSettingsQuery();
  const theme = settings?.ui_theme || 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let ipcRenderer = null;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch (err) {
      console.error(err);
    }
    if (!ipcRenderer) return;

    const handleThemeChange = (event, newTheme) => {
      document.documentElement.setAttribute('data-theme', newTheme);
    };

    ipcRenderer.on('theme-changed', handleThemeChange);
    return () => {
      ipcRenderer.off('theme-changed', handleThemeChange);
    };
  }, []);

  const isTrailer = getQueryParam('is_trailer') === 'true' || itemId === 'trailer';
  const queryTitle = getQueryParam('title');

  const [isPlaying, setIsPlaying] = useState(isTrailer);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('player_volume');
    return saved !== null ? parseInt(saved, 10) : 50;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('player_mute');
    return saved === 'true';
  });
  const [title, setTitle] = useState(isTrailer ? (queryTitle || 'Trailer') : 'Loading...');
  const [logoUrl, setLogoUrl] = useState(null);
  const [mediaImage, setMediaImage] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isPip, setIsPip] = useState(false);

  // Ending Overlay States
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(null);
  const [nextEpisode, setNextEpisode] = useState(null);
  const [firstEpisode, setFirstEpisode] = useState(null);
  const [episodeNumber, setEpisodeNumber] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const countdownIntervalRef = useRef(null);
  const hasTriggeredEndRef = useRef(false);
  const [speed, setSpeed] = useState(1.0);
  const [isAdult, setIsAdult] = useState(false);
  const [mediaType, setMediaType] = useState(null);
  const [justAddedPeak, setJustAddedPeak] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [clockTime, setClockTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [trackList, setTrackList] = useState([]);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const controlsTimeoutRef = useRef(null);

  const [videoParams, setVideoParams] = useState(null);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [osdMessage, setOsdMessage] = useState('');
  const osdTimeoutRef = useRef(null);

  // Keep track of delays in local component state as well for OSD feedback
  const [subDelay, setSubDelay] = useState(0);
  const [audioDelay, setAudioDelay] = useState(0);

  // Discovery / End Overlay states
  const [peaksCount, setPeaksCount] = useState(0);
  const [collectionNext, setCollectionNext] = useState(null);
  const [performerUnwatched, setPerformerUnwatched] = useState(null);
  const [studioUnwatched, setStudioUnwatched] = useState(null);
  const [surpriseMe, setSurpriseMe] = useState(null);
  const [tvShowId, setTvShowId] = useState(null);
  const [tvShowTitle, setTvShowTitle] = useState(null);
  const [tvShowPoster, setTvShowPoster] = useState(null);
  const [tvShowRating, setTvShowRating] = useState(null);
  const [seasonNumber, setSeasonNumber] = useState(null);
  const [seasonPoster, setSeasonPoster] = useState(null);

  const videoParamsRef = useRef(null);

  useEffect(() => {
    videoParamsRef.current = videoParams;
  }, [videoParams]);

  // Height of the bottom controls (progress bar + action row)
  const CONTROLS_FIT_THRESHOLD = 80;

  const updateBottomOffset = useCallback((params) => {
    if (!params || !params.aspect || !containerRef.current) {
      setBottomOffset(0);
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
        // Black bar is large enough — controls fit comfortably, stay at bottom
        setBottomOffset(0);
      } else {
        // Black bar too small — push controls up to the video edge
        setBottomOffset(Math.max(0, Math.round(blackBarHeight)));
      }
    } else {
      setBottomOffset(0);
    }
  }, [containerRef]);

  useEffect(() => {
    updateBottomOffset(videoParams);
  }, [videoParams, updateBottomOffset]);

  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const sendCommand = useCallback((args) => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-command', args);
    } catch {
      console.warn('Failed to send command to MPV:', args);
    }
  }, []);

  const handleClose = useCallback(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-close');
    } catch { /* ignore */ }
    navigate(-1);
  }, [navigate]);

  const handleCloseRef = useRef(handleClose);

  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  const handlePlayNext = useCallback(async () => {
    if (!nextEpisode) return;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setShowEndOverlay(false);

    // Read current volume/mute from localStorage so the next MPV instance starts at the right level
    const savedVolume = parseInt(localStorage.getItem('player_volume'), 10);
    const savedMute = localStorage.getItem('player_mute') === 'true';

    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('mpv-open-fullscreen', {
        itemId: nextEpisode.id,
        volume: isNaN(savedVolume) ? undefined : savedVolume,
        mute: savedMute,
      }).catch(() => {
        // Swallow IPC promise rejection because Electron immediately kills this window
      });
    } catch {
      navigate(`/player/${nextEpisode.id}`);
    }
  }, [nextEpisode, navigate]);

  // Sync menu state when controls hide during render
  if (!showControls) {
    if (showAudioMenu) setShowAudioMenu(false);
    if (showSubMenu) setShowSubMenu(false);
  }

  // Sync logo error reset during render
  const [prevLogoUrl, setPrevLogoUrl] = useState(null);
  if (logoUrl !== prevLogoUrl) {
    setPrevLogoUrl(logoUrl);
    setLogoError(false);
  }

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
      setClockTime(now.toLocaleTimeString('en-US', timeOptions));

      if (duration > 0) {
        const remainingSeconds = duration - currentTime;
        const end = new Date(now.getTime() + remainingSeconds * 1000);
        setEndTime(end.toLocaleTimeString('en-US', timeOptions));
      }
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, [currentTime, duration]);

  useEffect(() => {
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    const controlsOnly = getQueryParam('controls_only') === 'true';
    if (controlsOnly) {
      document.body.style.backgroundColor = 'transparent';
      document.body.style.background = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
      document.documentElement.style.background = 'transparent';
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (controlsOnly) {
        document.body.style.backgroundColor = '';
        document.body.style.background = '';
        document.documentElement.style.backgroundColor = '';
        document.documentElement.style.background = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!itemId) return;

    let isMounted = true;
    let ipcRenderer = null;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch {
      console.warn('Electron IPC not available');
    }

    const isTrailer = getQueryParam('is_trailer') === 'true' || itemId === 'trailer';

    const fetchInfoAndStart = async () => {
      if (isTrailer) return;
      try {
        const backendPort = getQueryParam('backend_port') || '8000';
        const controlsOnly = getQueryParam('controls_only') === 'true';
        const res = await fetch(`http://localhost:${backendPort}/api/v1/media/playback-info/${itemId}`);
        if (!res.ok) throw new Error('Failed to load playback details');
        const data = await res.json();

        if (!isMounted) return;
        setTitle(data.title);
        setIsAdult(data.is_adult);
        setMediaType(data.media_type);
        setUserRating(data.user_rating);
        setNextEpisode(data.next_episode);
        setFirstEpisode(data.first_episode);
        setPeaksCount(data.peaks_count || 0);
        setCollectionNext(data.collection_next);
        setPerformerUnwatched(data.performer_unwatched);
        setStudioUnwatched(data.studio_unwatched);
        setSurpriseMe(data.surprise_me);
        setTvShowId(data.tv_show_id);
        setTvShowTitle(data.tv_show_title);
        setTvShowRating(data.tv_show_rating);
        setSeasonNumber(data.season_number);
        setEpisodeNumber(data.episode_number);
        if (data.tv_show_poster) {
          const resolvedTvPoster = resolveMediaImageUrl(data.tv_show_poster, 'poster', `http://localhost:${backendPort}`);
          setTvShowPoster(resolvedTvPoster);
        }
        if (data.season_poster) {
          const resolvedSeasonPoster = resolveMediaImageUrl(data.season_poster, 'poster', `http://localhost:${backendPort}`);
          setSeasonPoster(resolvedSeasonPoster);
        }
        if (data.logo_path) {
          const resolved = resolveMediaImageUrl(data.logo_path, 'logo', `http://localhost:${backendPort}`);
          setLogoUrl(resolved);
        }
        if (data.media_image) {
          const resolvedImage = resolveMediaImageUrl(
            data.media_image,
            data.media_type === 'episode' ? 'still' : (data.media_type === 'scene' || data.is_adult ? 'scene_stills' : 'poster'),
            `http://localhost:${backendPort}`
          );
          setMediaImage(resolvedImage);
        }

        if (controlsOnly) {
          setIsPlaying(true);
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

          setIsPlaying(true);
        }
      } catch (err) {
        console.error(err);
        setTitle('Error playing file');
      }
    };

    fetchInfoAndStart();

    const volumeInitializedRef = { current: false };
    const muteInitializedRef = { current: false };

    // Listen to MPV events
    const handleMpvEvent = (event, data) => {
      if (data?.event === 'end-of-file') {
        if (isTrailer) {
          handleCloseRef.current();
        } else {
          setShowEndOverlay(true);
        }
      }
      if (data?.event === 'property-change') {
        if (data.name === 'time-pos' && typeof data.data === 'number') {
          setCurrentTime(data.data);
          const dur = durationRef.current;
          if (dur > 0) {
            if (data.data < dur - 5.0) {
              hasTriggeredEndRef.current = false;
            } else if (data.data >= dur - 1.0 && !hasTriggeredEndRef.current) {
              hasTriggeredEndRef.current = true;
              if (isTrailer) {
                handleCloseRef.current();
              } else {
                sendCommand(['set_property', 'pause', true]);
                setShowEndOverlay(true);
              }
            }
          }
        }
        if (data.name === 'eof-reached' && data.data === true) {
          if (isTrailer) {
            handleCloseRef.current();
          } else {
            sendCommand(['set_property', 'pause', true]);
            setShowEndOverlay(true);
          }
        }
        if (data.name === 'duration' && typeof data.data === 'number') {
          setDuration(data.data);
        }
        if (data.name === 'pause') {
          setIsPaused(data.data);
        }
        if (data.name === 'volume' && typeof data.data === 'number') {
          if (!volumeInitializedRef.current) {
            volumeInitializedRef.current = true;
            // Force MPV to match our loaded localStorage volume state
            ipcRenderer.send('mpv-command', ['set_property', 'volume', volumeRef.current]);
          } else {
            setVolume(data.data);
            localStorage.setItem('player_volume', String(data.data));
          }
        }
        if (data.name === 'mute') {
          const isMutedBool = !!data.data;
          if (!muteInitializedRef.current) {
            muteInitializedRef.current = true;
            // Force MPV to match our loaded localStorage mute state
            ipcRenderer.send('mpv-command', ['set_property', 'mute', isMutedRef.current]);
          } else {
            setIsMuted(isMutedBool);
            localStorage.setItem('player_mute', String(isMutedBool));
          }
        }
        if (data.name === 'chapter-list' && Array.isArray(data.data)) {
          setChapters(data.data);
          console.log('Chapters loaded from video file:', data.data);
        }
        if (data.name === 'track-list' && Array.isArray(data.data)) {
          setTrackList(data.data);
        }
        if (data.name === 'sub-delay' && typeof data.data === 'number') {
          setSubDelay(data.data);
        }
        if (data.name === 'audio-delay' && typeof data.data === 'number') {
          setAudioDelay(data.data);
        }
        if (data.name === 'speed' && typeof data.data === 'number') {
          setSpeed(data.data);
        }
        if (data.name === 'video-params' && data.data) {
          setVideoParams(data.data);
        }
      }
    };

    const handlePipChange = (event, data) => {
      setIsPip(data.isPip);
    };

    if (ipcRenderer) {
      ipcRenderer.on('mpv-event', handleMpvEvent);
      ipcRenderer.on('pip-mode-change', handlePipChange);
      ipcRenderer.send('mpv-player-ready');
    }

    // Resize observer to keep native window exactly aligned with React container
    const resizeObserver = new ResizeObserver(() => {
      if (ipcRenderer && containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        ipcRenderer.send('mpv-resize', {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        });
      }
      updateBottomOffset(videoParamsRef.current);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      isMounted = false;
      if (ipcRenderer) {
        ipcRenderer.off('mpv-event', handleMpvEvent);
        ipcRenderer.off('pip-mode-change', handlePipChange);
      }
      resizeObserver.disconnect();
    };
  }, [itemId, sendCommand, updateBottomOffset, containerRef]);

  // Periodic progress saving to backend
  useEffect(() => {
    if (!isPlaying || itemId === 'trailer' || getQueryParam('is_trailer') === 'true') return;

    const saveProgress = async () => {
      const cTime = currentTimeRef.current;
      const dur = durationRef.current;
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
    };

    const interval = setInterval(saveProgress, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, itemId]);

  const handlePlayPause = () => {
    sendCommand(['cycle', 'pause']);
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    sendCommand(['seek', val, 'absolute']);
  };

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    localStorage.setItem('player_volume', String(val));
    sendCommand(['set_property', 'volume', val]);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('player_mute', String(nextMuted));
    sendCommand(['set_property', 'mute', nextMuted]);
  };

  const handleWheel = (e) => {
    const step = 5;
    const currentVolume = isMuted ? 0 : volume;
    let newVolume = currentVolume + (e.deltaY < 0 ? step : -step);

    newVolume = Math.max(0, Math.min(100, newVolume));

    if (isMuted && newVolume > 0) {
      setIsMuted(false);
      localStorage.setItem('player_mute', 'false');
      sendCommand(['set_property', 'mute', false]);
    }

    setVolume(newVolume);
    localStorage.setItem('player_volume', String(newVolume));
    sendCommand(['set_property', 'volume', newVolume]);
    handleMouseMove();
  };

  const handleSpeedUp = () => {
    const nextSpeed = Math.min(16.0, speed * 2);
    sendCommand(['set_property', 'speed', nextSpeed]);
  };

  const handleSpeedDown = () => {
    const nextSpeed = Math.max(0.25, speed / 2);
    sendCommand(['set_property', 'speed', nextSpeed]);
  };

  const handleAddPeak = async (e) => {
    if (e && e.currentTarget) {
      e.currentTarget.blur();
    }
    setJustAddedPeak(true);
    setTimeout(() => setJustAddedPeak(false), 1500);

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
          video_position: Math.round(currentTime),
          snapshot_path: snapshotPath
        })
      });
    } catch (e) {
      console.error('Failed to add peak:', e);
    }
  };

  const handlePlayNextRef = useRef(handlePlayNext);
  useEffect(() => {
    handlePlayNextRef.current = handlePlayNext;
  }, [handlePlayNext]);

  useEffect(() => {
    let timer;
    let fired = false;
    if (showEndOverlay && nextEpisode) {
      timer = setTimeout(() => {
        setCountdown(10);
      }, 0);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            if (!fired) {
              fired = true;
              handlePlayNextRef.current();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showEndOverlay, nextEpisode]);

  const handleRate = async (rating) => {
    if (tvShowId) {
      setTvShowRating(rating);
      try {
        await updateStatusMutation.mutateAsync({
          itemId: tvShowId,
          payload: {
            user_rating: rating,
            media_type: 'tv'
          }
        });
      } catch (e) {
        console.error('Failed to update TV show rating:', e);
      }
    } else {
      setUserRating(rating);
      try {
        await updateStatusMutation.mutateAsync({
          itemId: itemId,
          payload: {
            user_rating: rating,
            media_type: mediaType
          }
        });
      } catch (e) {
        console.error('Failed to update rating:', e);
      }
    }
  };

  const handleReplay = () => {
    hasTriggeredEndRef.current = false;
    setShowEndOverlay(false);
    sendCommand(['seek', 0, 'absolute']);
    sendCommand(['set_property', 'pause', false]);
  };

  const handleAddPeakRef = useRef(handleAddPeak);
  useEffect(() => {
    handleAddPeakRef.current = handleAddPeak;
  }, [handleAddPeak]);

  // Helper to trigger OSD message
  const triggerOsd = useCallback((text) => {
    setOsdMessage(text);
    if (osdTimeoutRef.current) {
      clearTimeout(osdTimeoutRef.current);
    }
    osdTimeoutRef.current = setTimeout(() => {
      setOsdMessage('');
    }, 2000);
  }, []);

  const handleKeyDownRef = useRef(null);

  const prevSubDelayRef = useRef(0);
  const prevAudioDelayRef = useRef(0);

  // Track delay changes in effects to show OSD
  useEffect(() => {
    // Only trigger if value actually changed from the last received value
    if (subDelay !== prevSubDelayRef.current) {
      triggerOsd(`Subtitle delay: ${Math.round(subDelay * 1000)} ms`);
      prevSubDelayRef.current = subDelay;
    }
  }, [subDelay, triggerOsd]);

  useEffect(() => {
    if (audioDelay !== prevAudioDelayRef.current) {
      triggerOsd(`Audio delay: ${Math.round(audioDelay * 1000)} ms`);
      prevAudioDelayRef.current = audioDelay;
    }
  }, [audioDelay, triggerOsd]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Enter for peaks
      if (e.key === 'Enter') {
        if (isAdult) {
          e.preventDefault();
          handleAddPeakRef.current();
        }
      }

      // We only allow keyboard controls if no dropdown menu or text input is active
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      const key = e.key.toLowerCase();

      // Space: Play / Pause
      if (e.key === ' ' || key === 'spacebar') {
        e.preventDefault();
        handlePlayPause();
        triggerOsd(isPaused ? 'Play' : 'Pause');
      }

      // Left/Right Arrows: Seek -10s / +10s
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        sendCommand(['seek', -10]);
        triggerOsd('Seek -10s');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        sendCommand(['seek', 10]);
        triggerOsd('Seek +10s');
      }

      // Up/Down Arrows: Volume +5 / -5
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextVol = Math.min(100, (isMuted ? 0 : volume) + 5);
        setVolume(nextVol);
        if (isMuted) {
          setIsMuted(false);
          sendCommand(['set_property', 'mute', false]);
        }
        sendCommand(['set_property', 'volume', nextVol]);
        triggerOsd(`Volume: ${nextVol}%`);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextVol = Math.max(0, (isMuted ? 0 : volume) - 5);
        setVolume(nextVol);
        if (isMuted) {
          setIsMuted(false);
          sendCommand(['set_property', 'mute', false]);
        }
        sendCommand(['set_property', 'volume', nextVol]);
        triggerOsd(`Volume: ${nextVol}%`);
      }

      // M key: Mute Toggle
      if (key === 'm') {
        e.preventDefault();
        toggleMute();
        // Since toggleMute is async in state, look at inverse for OSD
        triggerOsd(!isMuted ? 'Muted' : 'Unmuted');
      }

      // F key: Fullscreen (PiP toggle back-and-forth)
      if (key === 'f') {
        e.preventDefault();
        handleTogglePip();
      }

      // Subtitle Delay: G (decrease / speed up), H (increase / slow down)
      if (key === 'g') {
        e.preventDefault();
        sendCommand(['add', 'sub-delay', -0.1]);
      } else if (key === 'h') {
        e.preventDefault();
        sendCommand(['add', 'sub-delay', 0.1]);
      }

      // Audio Delay: J (decrease), K (increase)
      if (key === 'j') {
        e.preventDefault();
        sendCommand(['add', 'audio-delay', -0.1]);
      } else if (key === 'k') {
        e.preventDefault();
        sendCommand(['add', 'audio-delay', 0.1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdult, sendCommand, isPaused, volume, isMuted, toggleMute, handlePlayPause, handleTogglePip, triggerOsd]);

  function handleTogglePip() {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-toggle-pip');
    } catch {
      /* ignore */
    }
  }

  function handleMinimizePip() {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-minimize');
    } catch {
      /* ignore */
    }
  }

  const handleDoubleClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('.player-page__menu')) {
      return;
    }
    handleTogglePip();
  };

  return {
    isPlaying,
    isPaused,
    currentTime,
    duration,
    volume,
    isMuted,
    title,
    logoUrl,
    showControls,
    isPip,
    showEndOverlay,
    userRating,
    hoverRating,
    nextEpisode,
    firstEpisode,
    episodeNumber,
    countdown,
    speed,
    isAdult,
    mediaType,
    mediaImage,
    justAddedPeak,
    logoError,
    chapters,
    clockTime,
    endTime,
    trackList,
    showAudioMenu,
    showSubMenu,
    bottomOffset,
    osdMessage,
    peaksCount,
    collectionNext,
    performerUnwatched,
    studioUnwatched,
    surpriseMe,
    tvShowId,
    tvShowTitle,
    tvShowPoster,
    tvShowRating,
    seasonNumber,
    seasonPoster,
    setShowAudioMenu,
    setShowSubMenu,
    setLogoError,
    setHoverRating,
    setNextEpisode,
    setFirstEpisode,
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

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, Languages, Captions, PictureInPicture2, Maximize2, X, Square, Rewind, FastForward, SkipBack, SkipForward, Flame, Minimize2 } from 'lucide-react';
import { resolveMediaImageUrl } from '../../lib/imageUrls';
import { useTranslation } from '@/providers/LanguageContext';
import './PlayerPage.css';

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

export default function PlayerPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const speedText = `${speed}x`;
  const ratingText = userRating ? `${userRating.toFixed(1)} / 10` : '';
  const starSymbol = '\u2605';

  const containerRef = useRef(null);
  
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
  const [showControls, setShowControls] = useState(true);
  const [isPip, setIsPip] = useState(false);
  
  // Ending Overlay States
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(null);
  const [nextEpisode, setNextEpisode] = useState(null);
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
    
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('mpv-open-fullscreen', { itemId: nextEpisode.id });
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

  // Helper function to format time (e.g. 01:23:45)
  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mStr}:${sStr}` : `${m}:${sStr}`;
  };

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
        if (data.logo_path) {
          const resolved = resolveMediaImageUrl(data.logo_path, 'logo', `http://localhost:${backendPort}`);
          setLogoUrl(resolved);
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
        if (data.name === 'speed' && typeof data.data === 'number') {
          setSpeed(data.data);
        }
      }
    };

    const handlePipChange = (event, data) => {
      setIsPip(data.isPip);
    };

    if (ipcRenderer) {
      ipcRenderer.on('mpv-event', handleMpvEvent);
      ipcRenderer.on('pip-mode-change', handlePipChange);
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
  }, [itemId, sendCommand]);

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

    try {
      const backendPort = getQueryParam('backend_port') || '8000';
      await fetch(`http://localhost:${backendPort}/api/v1/library/item/${itemId}/peaks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_position: Math.round(currentTime) })
      });
    } catch (e) {
      console.error('Failed to add peak:', e);
    }
  };

  useEffect(() => {
    let timer;
    if (showEndOverlay && nextEpisode) {
      timer = setTimeout(() => {
        setCountdown(10);
      }, 0);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handlePlayNext();
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
  }, [showEndOverlay, nextEpisode, handlePlayNext]);

  const handleRate = async (rating) => {
    setUserRating(rating);
    try {
      const backendPort = getQueryParam('backend_port') || '8000';
      await fetch(`http://localhost:${backendPort}/api/v1/media/${itemId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_rating: rating })
      });
    } catch (e) {
      console.error('Failed to update rating:', e);
    }
  };

  const handleReplay = () => {
    hasTriggeredEndRef.current = false;
    setShowEndOverlay(false);
    sendCommand(['seek', 0, 'absolute']);
    sendCommand(['set_property', 'pause', false]);
  };



  const handleTogglePip = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-toggle-pip');
    } catch {
      /* ignore */
    }
  };

  const handleMinimizePip = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-minimize');
    } catch {
      /* ignore */
    }
  };

  const handleDoubleClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('.player-page__menu')) {
      return;
    }
    handleTogglePip();
  };

  const controlsOnly = getQueryParam('controls_only') === 'true';

  const currentChapter = (() => {
    if (!chapters || chapters.length === 0) return null;
    let active = null;
    for (const chap of chapters) {
      if (currentTime >= chap.time) {
        active = chap;
      } else {
        break;
      }
    }
    return active;
  })();

  if (isPip) {
    return (
      /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
      <div
        className="player-page player-page--transparent player-page--pip"
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div className="player-page__pip-drag-handle" />
        <div className="player-page__pip-overlay">
          <button className="player-page__pip-btn" onClick={handleMinimizePip} title="Minimize Player">
            <Minimize2 size={16} />
          </button>
          <button className="player-page__pip-btn" onClick={handleTogglePip} title="Restore Fullscreen">
            <Maximize2 size={16} />
          </button>
          <button className="player-page__pip-btn player-page__pip-btn--close" onClick={handleClose} title="Close Player">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      className={`player-page ${controlsOnly ? 'player-page--transparent' : ''}`}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      {/* Video Container (Nesting target) */}
      <div ref={containerRef} className="player-page__video-container" />

      {/* Custom Controls Overlay */}
      <div className={`player-page__controls-overlay ${showControls ? 'active' : ''}`}>

        {/* Top Header */}
        <div className="player-page__header">
          <div className="player-page__header-left">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={title}
                className="player-page__logo"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="player-page__title">{title}</span>
            )}
          </div>

          {currentChapter && (
            <div className="player-page__current-chapter">
              {currentChapter.title}
            </div>
          )}

          <div className="player-page__header-right">
            <div className="player-page__time-info">
              <span className="player-page__clock">{clockTime}</span>
              {endTime && <span className="player-page__ends-at">{t('player.ends_at', { defaultValue: 'Ends at' }) + ' ' + endTime}</span>}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="player-page__bottom">

          {/* Progress Bar */}
          <div className="player-page__progress-container">
            <span className="player-page__time">{formatTime(currentTime)}</span>
            <div className="player-page__slider-wrapper">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="player-page__slider"
              />
              {duration > 0 && chapters.map((chap, index) => {
                if (chap.time <= 1) return null;
                const pct = (chap.time / duration) * 100;
                return (
                  <div
                    key={`chap-${index}`}
                    className="player-page__chapter-marker"
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ left: `${pct}%` }}
                    title={chap.title || `Chapter ${index + 1}`}
                  />
                );
              })}
            </div>
            <span className="player-page__time">{formatTime(duration)}</span>
          </div>

          {/* Action Row */}
          <div className="player-page__actions">

            {/* Left Actions */}
            <div className="player-page__actions-group">
              <button className="player-page__btn" onClick={() => sendCommand(['add', 'chapter', -1])} title="Previous Chapter">
                <SkipBack size={18} fill="currentColor" />
              </button>

              <button className="player-page__btn" onClick={handleSpeedDown} title={`Slow Down / Rewind (${speed}x)`}>
                <Rewind size={18} fill="currentColor" />
              </button>

              <button className="player-page__btn player-page__btn--primary" onClick={handlePlayPause}>
                {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
              </button>

              <button className="player-page__btn" onClick={handleClose} title="Stop Playback">
                <Square size={18} fill="currentColor" />
              </button>

              <button className="player-page__btn" onClick={handleSpeedUp} title={`Fast Forward (${speed}x)`}>
                <FastForward size={18} fill="currentColor" />
              </button>

              <button className="player-page__btn" onClick={() => sendCommand(['add', 'chapter', 1])} title="Next Chapter">
                <SkipForward size={18} fill="currentColor" />
              </button>

              {speed !== 1.0 && (
                <span className="player-page__speed-badge">
                  {speedText}
                </span>
              )}

              <div className="player-page__volume-group">
                <button className="player-page__btn" onClick={toggleMute}>
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="player-page__volume-slider"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="player-page__actions-group">

              {/* Audio Tracks Dropdown */}
              {showAudioMenu && (
                <div className="player-page__menu" onWheel={(e) => e.stopPropagation()}>
                  <div className="player-page__menu-title">{t('player.audio_tracks', { defaultValue: 'Audio Tracks' })}</div>
                  {trackList.filter(t => t.type === 'audio').map(t => (
                    <button
                      key={t.id}
                      className={`player-page__menu-item ${t.selected ? 'active' : ''}`}
                      onClick={() => {
                        sendCommand(['set_property', 'aid', t.id]);
                        setShowAudioMenu(false);
                      }}
                    >
                      {t.title || t.lang?.toUpperCase() || ((t('player.track') || 'Track') + ' ' + t.id)} {t.codec ? `(${t.codec.toUpperCase()})` : ''}
                    </button>
                  ))}
                  {trackList.filter(t => t.type === 'audio').length === 0 && (
                    <div className="player-page__menu-empty">{t('player.no_audio_tracks', { defaultValue: 'No audio tracks' })}</div>
                  )}
                </div>
              )}

              {/* Subtitles Dropdown */}
              {showSubMenu && (
                <div className="player-page__menu" onWheel={(e) => e.stopPropagation()}>
                  <div className="player-page__menu-title">{t('player.subtitles', { defaultValue: 'Subtitles' })}</div>
                  <button
                    className={`player-page__menu-item ${!trackList.some(t => t.type === 'sub' && t.selected) ? 'active' : ''}`}
                    onClick={() => {
                      sendCommand(['set_property', 'sid', 'no']);
                      setShowSubMenu(false);
                    }}
                  >
                    {t('player.off', { defaultValue: 'Off' })}
                  </button>
                  {trackList.filter(t => t.type === 'sub').map(t => (
                    <button
                      key={t.id}
                      className={`player-page__menu-item ${t.selected ? 'active' : ''}`}
                      onClick={() => {
                        sendCommand(['set_property', 'sid', t.id]);
                        setShowSubMenu(false);
                      }}
                    >
                      {t.title || t.lang?.toUpperCase() || ((t('player.subtitle') || 'Subtitle') + ' ' + t.id)}
                    </button>
                  ))}
                </div>
              )}

              {/* Peak Button */}
              {(isAdult || mediaType === 'scene') && (
                <button
                  className={`player-page__btn ${justAddedPeak ? 'player-page__btn--peak-success' : 'player-page__btn--peak'}`}
                  onClick={handleAddPeak}
                  title="Mark Peak Moment"
                >
                  <Flame size={18} fill="currentColor" />
                </button>
              )}

              <button
                className={`player-page__btn ${showAudioMenu ? 'active' : ''}`}
                onClick={() => {
                  setShowAudioMenu(!showAudioMenu);
                  setShowSubMenu(false);
                }}
                title="Audio Tracks"
              >
                <Languages size={18} />
              </button>

              <button
                className={`player-page__btn ${showSubMenu ? 'active' : ''}`}
                onClick={() => {
                  setShowSubMenu(!showSubMenu);
                  setShowAudioMenu(false);
                }}
                title="Subtitles"
              >
                <Captions size={18} />
              </button>

              <button className="player-page__btn" onClick={handleMinimizePip} title="Minimize to Background">
                <Minimize2 size={18} />
              </button>

              <button className="player-page__btn" onClick={handleTogglePip} title="Picture-in-Picture">
                <PictureInPicture2 size={18} />
              </button>
            </div>

          </div>

        </div>

      </div>

      {showEndOverlay && (
        <div className="player-page__end-overlay">
          <div className="player-page__end-card">
            <div className="player-page__end-title">{t('player.finished_watching', { defaultValue: 'Finished watching' })}</div>
            <div className="player-page__end-subtitle">{title}</div>

            {nextEpisode ? (
              <div className="player-page__end-next">
                <div className="player-page__end-next-label">{t('player.up_next', { defaultValue: 'Up Next' })}</div>
                <div className="player-page__end-next-title">{nextEpisode.title}</div>
                <div className="player-page__end-countdown">{t('player.starting_in', { count: countdown, defaultValue: 'Starting in {{count}}s...' })}</div>
                <div className="player-page__end-buttons">
                  <button className="player-page__end-btn player-page__end-btn--primary" onClick={handlePlayNext}>
                    {t('player.play_now', { defaultValue: 'Play Now' })}
                  </button>
                  <button className="player-page__end-btn" onClick={() => {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    setNextEpisode(null);
                  }}>
                    {t('common.cancel', { defaultValue: 'Cancel' })}
                  </button>
                </div>
              </div>
            ) : (
              <div className="player-page__end-rating">
                <div className="player-page__end-rating-label">{t('player.rate_title', { defaultValue: 'Rate this title' })}</div>
                <div className="player-page__end-stars">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      className={`player-page__end-star ${(hoverRating || userRating || 0) >= star ? 'active' : ''}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => handleRate(star)}
                    >
                      {starSymbol}
                    </button>
                  ))}
                </div>
                {userRating && <div className="player-page__end-rating-val">{ratingText}</div>}
              </div>
            )}

            <div className="player-page__end-actions">
              <button className="player-page__end-btn" onClick={handleReplay}>
                {t('player.replay', { defaultValue: 'Replay' })}
              </button>
              <button className="player-page__end-btn player-page__end-btn--danger" onClick={handleClose}>
                {t('player.close_player', { defaultValue: 'Close Player' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

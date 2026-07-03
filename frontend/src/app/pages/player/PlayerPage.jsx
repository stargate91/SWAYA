import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, ArrowLeft, Languages, Captions, PictureInPicture2, Maximize2, X, Square, Rewind, FastForward, SkipBack, SkipForward, Flame, Minimize2 } from 'lucide-react';
import { resolveMediaImageUrl } from '../../lib/imageUrls';
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

  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
  const [title, setTitle] = useState('Loading...');
  const [logoUrl, setLogoUrl] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isPip, setIsPip] = useState(false);
  const [isMouseOver, setIsMouseOver] = useState(false);
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
    if (!showControls) {
      setShowAudioMenu(false);
      setShowSubMenu(false);
    }
  }, [showControls]);

  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  useEffect(() => {
    handleMouseMove();
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
    } catch (e) {
      console.warn('Electron IPC not available');
    }

    const fetchInfoAndStart = async () => {
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
      if (data?.event === 'property-change') {
        if (data.name === 'time-pos' && typeof data.data === 'number') {
          setCurrentTime(data.data);
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
            ipcRenderer.send('mpv-command', ['set_property', 'volume', volume]);
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
            ipcRenderer.send('mpv-command', ['set_property', 'mute', isMuted]);
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
  }, [itemId]);

  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Periodic progress saving to backend
  useEffect(() => {
    if (!isPlaying) return;

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
      } catch (e) {
        // Ignore background save errors
      }
    };

    const interval = setInterval(saveProgress, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, itemId]);

  const sendCommand = (args) => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-command', args);
    } catch (e) {
      console.warn('Failed to send command to MPV:', args);
    }
  };

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

  const handleClose = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-close');
    } catch (e) { }
    navigate(-1);
  };

  const handleTogglePip = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-toggle-pip');
    } catch (e) { }
  };

  const handleMinimizePip = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('mpv-minimize');
    } catch (e) { }
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
      <div
        className="player-page player-page--transparent player-page--pip"
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onMouseEnter={() => setIsMouseOver(true)}
        onMouseLeave={() => setIsMouseOver(false)}
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
              {endTime && <span className="player-page__ends-at">Ends at {endTime}</span>}
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
                <span className="player-page__speed-badge" style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.15)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  marginLeft: '4px'
                }}>
                  {speed}x
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
            <div className="player-page__actions-group" style={{ position: 'relative' }}>

              {/* Audio Tracks Dropdown */}
              {showAudioMenu && (
                <div className="player-page__menu" onWheel={(e) => e.stopPropagation()}>
                  <div className="player-page__menu-title">Audio Tracks</div>
                  {trackList.filter(t => t.type === 'audio').map(t => (
                    <button
                      key={t.id}
                      className={`player-page__menu-item ${t.selected ? 'active' : ''}`}
                      onClick={() => {
                        sendCommand(['set_property', 'aid', t.id]);
                        setShowAudioMenu(false);
                      }}
                    >
                      {t.title || t.lang?.toUpperCase() || `Track ${t.id}`} {t.codec ? `(${t.codec.toUpperCase()})` : ''}
                    </button>
                  ))}
                  {trackList.filter(t => t.type === 'audio').length === 0 && (
                    <div className="player-page__menu-empty">No audio tracks</div>
                  )}
                </div>
              )}

              {/* Subtitles Dropdown */}
              {showSubMenu && (
                <div className="player-page__menu" onWheel={(e) => e.stopPropagation()}>
                  <div className="player-page__menu-title">Subtitles</div>
                  <button
                    className={`player-page__menu-item ${!trackList.some(t => t.type === 'sub' && t.selected) ? 'active' : ''}`}
                    onClick={() => {
                      sendCommand(['set_property', 'sid', 'no']);
                      setShowSubMenu(false);
                    }}
                  >
                    Off
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
                      {t.title || t.lang?.toUpperCase() || `Subtitle ${t.id}`}
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
    </div>
  );
}

import { useEffect } from 'react';

export default function usePlayerIpc({
  itemId,
  isTrailer,
  containerRef,
  videoParamsRef,
  durationRef,
  volumeRef,
  isMutedRef,
  chaptersRef,
  hasTriggeredEndRef,
  setCurrentTime,
  setShowEndOverlay,
  setDuration,
  setIsPaused,
  setVolume,
  setIsMuted,
  setChapters,
  setTrackList,
  setSubDelay,
  setAudioDelay,
  setSpeed,
  setVideoParams,
  setIsPip,
  handleCloseRef,
  updateBottomOffset,
  sendCommand,
}) {

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

  useEffect(() => {
    let isMounted = true;
    let ipcRenderer = null;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch {
      console.warn('Electron IPC not available');
    }

    const volumeInitializedRef = { current: false };
    const muteInitializedRef = { current: false };

    const handleMpvEvent = (event, data) => {
      if (!isMounted) return;

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
          
          let isLastChapterActive = false;
          if (chaptersRef.current && chaptersRef.current.length > 1) {
            const lastChapter = chaptersRef.current[chaptersRef.current.length - 1];
            if (lastChapter && typeof lastChapter.time === 'number' && lastChapter.time > 30) {
              isLastChapterActive = true;
              if (data.data >= lastChapter.time && !hasTriggeredEndRef.current) {
                hasTriggeredEndRef.current = true;
                setShowEndOverlay(true);
              } else if (data.data < lastChapter.time - 5.0 && hasTriggeredEndRef.current) {
                hasTriggeredEndRef.current = false;
                setShowEndOverlay(false);
              }
            }
          }

          if (dur > 0) {
            if (data.data < dur - 5.0 && (!isLastChapterActive || (chaptersRef.current && chaptersRef.current.length > 1 && data.data < chaptersRef.current[chaptersRef.current.length - 1].time - 5.0))) {
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
            ipcRenderer.send('mpv-command', ['set_property', 'mute', isMutedRef.current]);
          } else {
            setIsMuted(isMutedBool);
            localStorage.setItem('player_mute', String(isMutedBool));
          }
        }
        if (data.name === 'chapter-list' && Array.isArray(data.data)) {
          setChapters(data.data);
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
      if (isMounted) setIsPip(data.isPip);
    };

    if (ipcRenderer) {
      ipcRenderer.on('mpv-event', handleMpvEvent);
      ipcRenderer.on('pip-mode-change', handlePipChange);
      ipcRenderer.send('mpv-player-ready');
    }

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
  }, [itemId, isTrailer, sendCommand, updateBottomOffset, containerRef, durationRef, volumeRef, isMutedRef, chaptersRef, videoParamsRef, hasTriggeredEndRef, handleCloseRef, setCurrentTime, setShowEndOverlay, setDuration, setIsPaused, setVolume, setIsMuted, setChapters, setTrackList, setSubDelay, setAudioDelay, setSpeed, setVideoParams, setIsPip]);
}

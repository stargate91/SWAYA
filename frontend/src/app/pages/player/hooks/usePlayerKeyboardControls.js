import { useEffect, useRef } from 'react';

export default function usePlayerKeyboardControls({
  isAdult,
  isPaused,
  volume,
  isMuted,
  setVolume,
  setIsMuted,
  setShowControls,
  sendCommand,
  handlePlayPause,
  toggleMute,
  handleTogglePip,
  triggerOsd,
  handleAddPeakRef,
}) {
  const controlsTimeoutRef = useRef(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
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

  const handleDoubleClick = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('.player-page__menu')) {
      return;
    }
    handleTogglePip();
  };

  useEffect(() => {
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [setShowControls]);

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
  }, [isAdult, sendCommand, isPaused, volume, isMuted, setVolume, setIsMuted, toggleMute, handlePlayPause, handleTogglePip, triggerOsd, handleAddPeakRef]);

  return {
    handleMouseMove,
    handleWheel,
    handleDoubleClick,
  };
}

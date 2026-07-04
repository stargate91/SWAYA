import { Play, Pause, Maximize2, X } from 'lucide-react';
import './PlayerControlBar.css';

export default function PlayerControlBar({ state, onTogglePlay, onMaximize, onClose }) {
  if (!state || !state.active || !state.isMinimized) {
    return null;
  }

  const { title, currentTime, duration, isPaused } = state;
  const timeSeparator = ' / ';

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === null || secs === undefined) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mStr}:${sStr}` : `${m}:${sStr}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="player-control-bar">
      <div className="player-control-bar__info">
        <span className="player-control-bar__title" title={title}>
          {title}
        </span>
        <span className="player-control-bar__time">
          {formatTime(currentTime) + timeSeparator + formatTime(duration)}
        </span>
      </div>

      <div className="player-control-bar__progress-wrapper">
        <div className="player-control-bar__progress-bg">
          <div
            className="player-control-bar__progress-fill"
            // eslint-disable-next-line react/forbid-dom-props
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="player-control-bar__actions">
        <button
          className="player-control-bar__btn player-control-bar__btn--play"
          onClick={onTogglePlay}
          title={isPaused ? 'Play' : 'Pause'}
        >
          {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
        </button>

        <button
          className="player-control-bar__btn player-control-bar__btn--maximize"
          onClick={onMaximize}
          title="Restore Fullscreen"
        >
          <Maximize2 size={16} />
        </button>

        <button
          className="player-control-bar__btn player-control-bar__btn--close"
          onClick={onClose}
          title="Close Player"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

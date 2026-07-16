import { Play, Pause, Maximize2, X } from '@/ui/icons';
import Inline from '../ui/Inline';
import styles from './PlayerControlBar.module.css';

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
    <div className={styles['player-control-bar']}>
      <div className={styles.info}>
        <span className={styles.title}>
          {title}
        </span>
        <span className={styles.time}>
          {formatTime(currentTime) + timeSeparator + formatTime(duration)}
        </span>
      </div>

      <div className={styles['progress-wrapper']}>
        <div className={styles['progress-bg']}>
          <div
            className={styles['progress-fill']}
            // eslint-disable-next-line react/forbid-dom-props
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <Inline gap="sm" align="center" className={styles.actions}>
        <button
          className={`${styles.btn} ${styles['btn-play']}`}
          onClick={onTogglePlay}
        >
          {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
        </button>

        <button
          className={styles.btn}
          onClick={onMaximize}
        >
          <Maximize2 size={16} />
        </button>

        <button
          className={`${styles.btn} ${styles['btn-close']}`}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </Inline>
    </div>
  );
}

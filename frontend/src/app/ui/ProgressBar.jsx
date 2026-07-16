import PropTypes from 'prop-types';
import { X } from '@/ui/icons';
import { useEffect, useRef } from 'react';
import IconButton from './IconButton';
import Tooltip from './Tooltip';
import styles from './ProgressBar.module.css';

export default function ProgressBar({ taskName, progress = 0, timeRemaining = '--:--', active = true, variant = 'primary', onAbort }) {
  const isSub = variant === 'sub';
  const fillRef = useRef(null);
  const containerClass = `${styles.container} ${isSub ? styles['container--sub'] : ''}`.trim();
  const dotClass = `${styles['pulse-dot']} ${isSub ? styles['pulse-dot--sub'] : ''}`.trim();
  const fillClass = `${styles.fill} ${isSub ? styles['fill--sub'] : ''}`.trim();

  useEffect(() => {
    if (!fillRef.current) return;
    fillRef.current.style.setProperty('--ui-progress-value', `${progress}%`);
  }, [progress]);

  return (
    <div className={containerClass}>
      {active && <span className={dotClass} />}
      <span className={styles.text}>
        {taskName}
      </span>
      <div className={styles.track}>
        <div ref={fillRef} className={fillClass} />
      </div>
      <span className={styles.stats}>
        {/* eslint-disable-next-line react/jsx-no-literals */}
        {progress}{'% | '}{timeRemaining}
      </span>
      {onAbort && (
        <Tooltip content="Abort task" side="bottom">
          <IconButton
            variant="danger"
            size="xs"
            onClick={onAbort}
            title={null}
          >
            <X size={10} strokeWidth={2.5} />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
}

ProgressBar.propTypes = {
  taskName: PropTypes.string.isRequired,
  progress: PropTypes.number,
  timeRemaining: PropTypes.string,
  active: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'sub']),
  onAbort: PropTypes.func,
};

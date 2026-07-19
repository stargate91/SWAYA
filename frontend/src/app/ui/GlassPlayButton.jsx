import PropTypes from 'prop-types';
import { Play, Pause } from './icons';
import styles from './GlassPlayButton.module.css';

export default function GlassPlayButton({
  isPlaying,
  onClick,
  title,
  className = '',
  isLoading = false,
}) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${isLoading ? styles['btn--loading'] : ''} ${className}`.trim()}
      onClick={onClick}
      aria-label={title}
    >
      {isLoading && <span className={styles.spinner} />}
      {isPlaying ? (
        <Pause size={32} />
      ) : (
        <Play size={32} className={styles['play-icon']} />
      )}
    </button>
  );
}

GlassPlayButton.propTypes = {
  isPlaying: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  title: PropTypes.string,
  className: PropTypes.string,
  isLoading: PropTypes.bool,
};

import PropTypes from 'prop-types';
import { Play } from './icons';
import styles from './GalleryCard.module.css';

export default function GalleryCard({
  imageUrl,
  title,
  timeLabel,
  onPlayClick,
  onImageClick,
  playTitle = 'Play Moment',
}) {
  return (
    <div className={styles.item}>
      <img
        src={imageUrl}
        alt={title}
        className={styles.img}
        onClick={onImageClick}
      />
      <div className={styles.overlay}>
        <div className={styles.info}>
          <span className={styles.title} title={title}>{title}</span>
          {timeLabel && <span className={styles.time}>{timeLabel}</span>}
        </div>
        <button
          type="button"
          className={styles['play-btn']}
          onClick={onPlayClick}
          title={playTitle}
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

GalleryCard.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  timeLabel: PropTypes.string,
  onPlayClick: PropTypes.func.isRequired,
  onImageClick: PropTypes.func.isRequired,
  playTitle: PropTypes.string,
};

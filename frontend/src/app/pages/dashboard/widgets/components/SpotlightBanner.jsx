import PropTypes from 'prop-types';
import { Star, Check, Plus } from '@/ui/icons';
import { resolveMediaImageUrl } from '../../../../lib/imageUrls';
import Button from '../../../../ui/Button';
import styles from '../RecommendationsWidget.module.css';
import { useTranslation } from '../../../../providers/LanguageContext';

export const SpotlightBanner = ({ item, watchlistIds, onWatchlist, onCardClick }) => {
  const { t: T } = useTranslation();
  if (!item) return null;
  const imageUrl = resolveMediaImageUrl(item.backdrop_path, 'backdrop');
  const title = item.title || item.name;
  const isWatchlisted = watchlistIds.includes(item.id);
  const imdbRating = item.rating_imdb;
  const tmdbRating = item.rating_tmdb || item.vote_average;
  const ratingToDisplay = imdbRating || tmdbRating;
  const ratingSource = imdbRating ? 'imdb' : 'tmdb';
  const year = item.release_date ? new Date(item.release_date).getFullYear() : null;

  return (
    <div className={styles['recommend-spotlight']}>
      {imageUrl && <img src={imageUrl} alt={title} className={styles['recommend-spotlight-image']} />}
      <div className={`${styles['recommend-spotlight-gradient']} ${styles['recommend-spotlight-gradient--side']}`} />
      <div className={`${styles['recommend-spotlight-gradient']} ${styles['recommend-spotlight-gradient--bottom']}`} />

      <div className={styles['recommend-spotlight-copy']}>
        <h2 className={styles['recommend-spotlight-title']} onClick={() => onCardClick(item)}>{title}</h2>
        <div className={styles['recommend-spotlight-meta']}>
          {ratingToDisplay ? (
            <span className={`${styles['recommend-spotlight-rating']} ${styles[`is-${ratingSource}`]}`}>
              <Star size={14} fill="currentColor" /> {ratingToDisplay.toFixed(1)}
            </span>
          ) : null}
          {year ? <span className={styles['recommend-spotlight-year']}>{year}</span> : null}
        </div>
        <p className={styles['recommend-spotlight-overview']}>{item.overview}</p>
        <div className={styles['recommend-spotlight-actions']}>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              const type = item.media_type || item.type || (item.title ? 'movie' : 'tv');
              onWatchlist(item, type);
            }}
            className={`${styles['recommend-watchlist-btn']} ${isWatchlisted ? 'is-watchlisted' : ''}`}
            variant="secondary"
          >
            {isWatchlisted ? (
              <>
                <Check size={16} /> {T('dashboard.watchlist.added') || 'Watchlisted'}
              </>
            ) : (
              <>
                <Plus size={16} /> {T('dashboard.watchlist.add') || 'Watchlist'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

SpotlightBanner.propTypes = {
  item: PropTypes.object,
  watchlistIds: PropTypes.array.isRequired,
  onWatchlist: PropTypes.func.isRequired,
  onCardClick: PropTypes.func.isRequired,
};

export default SpotlightBanner;

import Tooltip from '@/ui/Tooltip';
import './BespokeRatingsSection.css';

export default function BespokeRatingsSection({ item, t }) {
  const isSceneType = item?.type === 'scene';
  const hasImdb = !isSceneType && item?.rating_imdb != null && Number(item.rating_imdb) > 0;
  const hasTmdb = !isSceneType && item?.rating_tmdb != null && Number(item.rating_tmdb) > 0;
  const hasRotten = !isSceneType && item?.rating_rotten != null && item?.rating_rotten !== '';
  const hasMeta = !isSceneType && item?.rating_meta != null && Number(item.rating_meta) > 0;
  const hasPorndb = item?.rating_porndb != null && Number(item.rating_porndb) > 0;

  // Identify which rating type is already displayed in the main header pill
  let activeHeaderRatingType = null;
  if (hasImdb) {
    activeHeaderRatingType = 'imdb';
  } else if (hasTmdb) {
    activeHeaderRatingType = 'tmdb';
  } else if (hasPorndb) {
    activeHeaderRatingType = 'porndb';
  }

  const ratings = [];
  if (hasImdb && activeHeaderRatingType !== 'imdb') ratings.push({ id: 'imdb', logo: '/rating/imdb.png', alt: 'IMDb', value: `${item.rating_imdb.toFixed(1)}/10` });
  if (hasTmdb && activeHeaderRatingType !== 'tmdb') ratings.push({ id: 'tmdb', logo: '/rating/tmdb.png', alt: 'TMDb', value: `${item.rating_tmdb.toFixed(1)}/10` });
  if (hasRotten) ratings.push({ id: 'rotten', logo: '/rating/rottan_tomatoes.png', alt: 'Rotten Tomatoes', value: item.rating_rotten });
  if (hasMeta) ratings.push({ id: 'meta', logo: '/rating/metacritic.png', alt: 'Metacritic', value: `${item.rating_meta}/100` });
  if (hasPorndb && activeHeaderRatingType !== 'porndb') ratings.push({ id: 'porndb', logo: '/rating/theporndb.png', alt: 'ThePornDB', value: `${item.rating_porndb.toFixed(1)}/10` });

  if (ratings.length === 0) return null;

  return (
    <div className="bespoke-ratings-section">
      <div className="bespoke-ratings-card">
        <div className="bespoke-browser-card__pills-header">
          <span className="bespoke-cast-title">
            {t('library.details.ratingsSection') || 'Ratings'}
          </span>
        </div>
        <div className="bespoke-ratings-body">
          {ratings.map(rating => (
            <div key={rating.id} className="bespoke-rating-item">
              <Tooltip content={rating.alt} side="top" triggerClassName="bespoke-rating-item__tooltip-trigger">
                <img src={rating.logo} alt={rating.alt} className="bespoke-rating-logo" />
                <span className="bespoke-rating-value">{rating.value}</span>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

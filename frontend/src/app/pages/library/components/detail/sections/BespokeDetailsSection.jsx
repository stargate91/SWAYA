/* eslint-disable react/forbid-dom-props */
import { resolveMediaImageUrl, buildTmdbImageUrl, TMDB_IMAGE_SIZES } from '@/lib/imageUrls';
import Tooltip from '@/ui/Tooltip';

export default function BespokeDetailsSection({ item, t }) {
  const isSceneType = item?.type === 'scene';
  const hasImdb = !isSceneType && item?.rating_imdb != null && Number(item.rating_imdb) > 0;
  const hasTmdb = !isSceneType && item?.rating_tmdb != null && Number(item.rating_tmdb) > 0;
  const hasRotten = !isSceneType && item?.rating_rotten != null && item?.rating_rotten !== '';
  const hasMeta = !isSceneType && item?.rating_meta != null && Number(item.rating_meta) > 0;
  const hasPorndb = item?.rating_porndb != null && Number(item.rating_porndb) > 0;

  const ratings = [];
  if (hasImdb) ratings.push({ id: 'imdb', logo: '/rating/imdb.png', alt: 'IMDb', value: `${item.rating_imdb.toFixed(1)}/10` });
  if (hasTmdb) ratings.push({ id: 'tmdb', logo: '/rating/tmdb.png', alt: 'TMDb', value: `${item.rating_tmdb.toFixed(1)}/10` });
  if (hasRotten) ratings.push({ id: 'rotten', logo: '/rating/rottan_tomatoes.png', alt: 'Rotten Tomatoes', value: item.rating_rotten });
  if (hasMeta) ratings.push({ id: 'meta', logo: '/rating/metacritic.png', alt: 'Metacritic', value: `${item.rating_meta}/100` });
  if (hasPorndb) ratings.push({ id: 'porndb', logo: '/rating/theporndb.png', alt: 'ThePornDB', value: `${item.rating_porndb.toFixed(1)}/10` });

  const formatCurrency = (num) => {
    if (num === undefined || num === null || num === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  };

  const profit = item.revenue && item.budget ? item.revenue - item.budget : 0;
  const companies = item.companies || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      {ratings.length > 0 && (
        <div className="dashboard-section">
          <h4 className="dashboard-section__title">{t('library.details.ratingsSection') || 'Ratings'}</h4>
          <div className="dashboard-ratings-grid">
            {ratings.map(rating => (
              <div key={rating.id} className="dashboard-rating-box">
                <Tooltip content={rating.alt} side="top">
                  <img src={rating.logo} alt={rating.alt} className="dashboard-rating-box__logo" />
                  <span className="dashboard-rating-box__value">{rating.value}</span>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <h4 className="dashboard-section__title">{t('library.details.details') || 'Details'}</h4>
        <div className="dashboard-metadata-grid">
          {item.release_date && (
            <div className="dashboard-metadata-card">
              <Tooltip content={item.release_date} side="top">
                <span className="dashboard-metadata-card__label">{t('library.details.releaseDate') || 'Release Date'}</span>
                <span className="dashboard-metadata-card__value">{item.release_date}</span>
              </Tooltip>
            </div>
          )}
          {item.release_status && (
            <div className="dashboard-metadata-card">
              <Tooltip content={item.release_status} side="top">
                <span className="dashboard-metadata-card__label">{t('library.details.status') || 'Status'}</span>
                <span className="dashboard-metadata-card__value">{item.release_status}</span>
              </Tooltip>
            </div>
          )}
          {item.budget > 0 && (
            <div className="dashboard-metadata-card">
              <span className="dashboard-metadata-card__label">{t('library.details.budget') || 'Budget'}</span>
              <span className="dashboard-metadata-card__value">{formatCurrency(item.budget)}</span>
            </div>
          )}
          {item.revenue > 0 && (
            <div className="dashboard-metadata-card">
              <span className="dashboard-metadata-card__label">{t('library.details.revenue') || 'Revenue'}</span>
              <span className="dashboard-metadata-card__value">{formatCurrency(item.revenue)}</span>
            </div>
          )}
          {item.budget > 0 && item.revenue > 0 && (
            <div className="dashboard-metadata-card dashboard-metadata-card--span-2">
              <span className="dashboard-metadata-card__label">{t('library.details.profit') || 'Profit'}</span>
              <span className={`dashboard-metadata-card__value ${profit >= 0 ? 'dashboard-metadata-card__value--success' : 'dashboard-metadata-card__value--danger'}`}>
                {formatCurrency(profit)}
              </span>
            </div>
          )}
        </div>
      </div>

      {companies.length > 0 && !isSceneType && (
        <div className="dashboard-section">
          <h4 className="dashboard-section__title">
            {item.is_adult ? (t('library.details.studio') || 'Studio') : (t('library.details.productionCompanies') || 'Production Companies')}
          </h4>
          <div className="dashboard-studios-list">
            {companies.map(it => {
              const logoUrl = it.logo_path
                ? (it.logo_path.startsWith('http') || it.logo_path.startsWith('/media/') || it.logo_path.startsWith('data/'))
                  ? resolveMediaImageUrl(it.logo_path, 'logo')
                  : buildTmdbImageUrl(it.logo_path, TMDB_IMAGE_SIZES.posterThumb)
                : null;
              if (!logoUrl) return null;
              return (
                <div key={it.id} className="dashboard-studio-logo">
                  <Tooltip content={it.name} side="top">
                    <img src={logoUrl} alt={it.name} />
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

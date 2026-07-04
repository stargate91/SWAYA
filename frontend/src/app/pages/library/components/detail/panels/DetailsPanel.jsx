import { countEpisodesInNumber } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';
import Pill from '@/ui/Pill';
import Tooltip from '@/ui/Tooltip';
import { buildTmdbImageUrl, resolveMediaImageUrl, TMDB_IMAGE_SIZES } from '@/lib/imageUrls';
import './PanelsCommon.css';
import './DetailsPanel.css';

function SpecCard({ label, value, className = '' }) {
  if (!value) return null;
  return (
    <div className={`specs-card ${className}`}>
      <Tooltip content={String(value)} side="top">
        <span className="specs-card__label">{label}</span>
        <span className="specs-card__value">{value}</span>
      </Tooltip>
    </div>
  );
}

export default function DetailsPanel() {
  const { state, t } = useMediaDetailContext();
  const {
    item,
    isMovie
  } = state;

  const isSceneType = item?.type === 'scene' || item?.media_type === 'scene';
  const formatCurrency = (val) => {
    if (!val) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const hasBoxOffice = isMovie && ((item.budget && item.budget > 0) || (item.revenue && item.revenue > 0));

  const companies = item?.companies || [];
  const networks = item?.networks || [];

  const derivedSeasonCount = countEpisodesInNumber(item?.seasons || []);
  const derivedEpisodeCount = (item?.seasons || []).reduce((acc, s) => {
    if (s && s.episodes) {
      return acc + (s.episodes.length || 0);
    } else {
      return acc + (s.episode_count || 0);
    }
  }, 0);
  const seasonCount = Number(item?.number_of_seasons ?? 0) || derivedSeasonCount;
  const episodeCount = Number(item?.number_of_episodes ?? 0) || derivedEpisodeCount;
  const tvStatus = item?.release_status;

  return (
    <div className="details-panel details-panel--custom">

      {!isMovie && (
        <div className="details-panel__section">
          <h4 className="details-panel__section-title">
            {t('library.details.tvInfo') || 'Tv Info'}
          </h4>
          <div className="specs-grid">
            <SpecCard className="specs-card--tall" label={t('library.details.seasons') || 'Seasons'} value={seasonCount} />
            <SpecCard className="specs-card--tall" label={t('library.details.episodes') || 'Episodes'} value={episodeCount} />
            {tvStatus && (
              <SpecCard className="specs-card--tall specs-card--span-2" label={t('library.details.status') || 'Status'} value={tvStatus} />
            )}
          </div>
        </div>
      )}

      {hasBoxOffice && (
        <div className="details-panel__section">
          <h4 className="details-panel__section-title">
            {t('library.details.boxOffice') || 'Box Office'}
          </h4>
          <div className="specs-grid">
            {item.budget > 0 && (
              <div className="specs-card">
                <span className="specs-card__label">{t('library.details.budget') || 'Budget'}</span>
                <span className="specs-card__value" title={formatCurrency(item.budget)}>{formatCurrency(item.budget)}</span>
              </div>
            )}
            {item.revenue > 0 && (
              <div className="specs-card">
                <span className="specs-card__label">{t('library.details.revenue') || 'Revenue'}</span>
                <span className="specs-card__value" title={formatCurrency(item.revenue)}>{formatCurrency(item.revenue)}</span>
              </div>
            )}
            {item.budget > 0 && item.revenue > 0 && (
              <div className="specs-card specs-card--span-2">
                <span className="specs-card__label">{t('library.details.profit') || 'Profit'}</span>
                <span
                  className={`specs-card__value ${(item.revenue - item.budget) >= 0 ? 'specs-card__value--success' : 'specs-card__value--danger'}`}
                  title={formatCurrency(item.revenue - item.budget)}
                >
                  {formatCurrency(item.revenue - item.budget)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {companies.length > 0 && !isSceneType && (
        <div className="details-panel__section">
          <h4 className="details-panel__section-title">
            {item.is_adult ? (t('library.details.studio') || 'Studio') : (t('library.details.productionCompanies') || 'Production Companies')}
          </h4>
          <div className="companies-networks-container">
            {companies.map((it, idx) => {
              const logoUrl = it.logo_path
                ? (it.logo_path.startsWith('http') || it.logo_path.startsWith('/media/') || it.logo_path.startsWith('data/'))
                  ? resolveMediaImageUrl(it.logo_path, 'logo')
                  : buildTmdbImageUrl(it.logo_path, TMDB_IMAGE_SIZES.posterThumb)
                : null;
              return (
                <div key={idx} className="specs-card specs-card--company">
                  <Tooltip content={it.name} side="top">
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt={it.name}
                        className="specs-card__company-logo"
                      />
                    )}
                    {!logoUrl && (
                      <span className="specs-card__company-text">
                        {it.name}
                      </span>
                    )}
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {networks.length > 0 && !isSceneType && (
        <div className="details-panel__section">
          <h4 className="details-panel__section-title">
            {item.is_adult ? (t('library.details.network') || 'Network') : (t('library.details.platformsNetworks') || 'Platforms & Networks')}
          </h4>
          <div className="companies-networks-container">
            {networks.map((it, idx) => {
              const logoUrl = it.logo_path
                ? (it.logo_path.startsWith('http') || it.logo_path.startsWith('/media/') || it.logo_path.startsWith('data/'))
                  ? resolveMediaImageUrl(it.logo_path, 'logo')
                  : buildTmdbImageUrl(it.logo_path, TMDB_IMAGE_SIZES.posterThumb)
                : null;
              return (
                <div key={idx} className="specs-card specs-card--company">
                  <Tooltip content={it.name} side="top">
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt={it.name}
                        className="specs-card__company-logo"
                      />
                    )}
                    {!logoUrl && (
                      <span className="specs-card__company-text">
                        {it.name}
                      </span>
                    )}
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Array.isArray(item?.keywords) && item.keywords.filter(Boolean).length > 0 && (
        <div className="details-panel__section">
          <h4 className="details-panel__section-title">
            {t('library.details.keywords') || 'Keywords'}
          </h4>
          <div className="details-panel__keywords-list">
            {item.keywords.filter(Boolean).map((keyword, idx) => (
              <Pill
                key={idx}
                variant="meta"
                className="details-panel__keyword-pill"
              >
                {keyword}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

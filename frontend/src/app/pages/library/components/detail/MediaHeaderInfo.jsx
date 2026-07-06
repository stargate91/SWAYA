import { useMemo } from 'react';
import { Calendar, Clock, Video, Globe } from '@/ui/icons';
import Pill from '@/ui/Pill';
import { useTranslation } from '@/providers/LanguageContext';
import { useMediaDetailContext } from './MediaDetailContext';
import './MediaHeaderInfo.css';


export default function MediaHeaderInfo({ isFallbackGrid = false }) {
  const { t } = useTranslation();
  const { state, handleOpenLogoModal } = useMediaDetailContext();
  const {
    title,
    logoUrl,
    showOriginalTitle,
    originalTitle,
    tagline,
    taglineText,
    metaDate,
    isMovie,
    isScene,
    formattedDuration,
    seasonsText,
    episodesText,
    langText,
    showImdb,
    ratingImdb,
    showTmdb,
    ratingTmdb,
    showPorndb,
    ratingPorndb,
    normalizedGenres,
    item,
    showStudioPill,
    showNetworkPill,
    studioName,
    networkName
  } = state;

  const activeRating = useMemo(() => {
    if (showImdb && ratingImdb) {
      return { type: 'imdb', logo: '/rating/imdb.png', val: ratingImdb };
    }
    if (showTmdb && ratingTmdb) {
      return { type: 'tmdb', logo: '/rating/tmdb.png', val: ratingTmdb };
    }
    if (showPorndb && ratingPorndb) {
      return { type: 'porndb', logo: '/rating/theporndb.png', val: ratingPorndb };
    }
    return null;
  }, [showImdb, ratingImdb, showTmdb, ratingTmdb, showPorndb, ratingPorndb]);

  return (
    <div className={`media-detail-page__header-layout ${isFallbackGrid ? 'media-detail-page__header-layout--fallback' : ''}`}>
      <div className="media-detail-page__header-copy">
        <div
          className="media-detail-page__logo-container clickable"
          role="button"
          tabIndex={0}
          onClick={handleOpenLogoModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleOpenLogoModal();
            }
          }}
          title={logoUrl ? 'Change Logo' : 'Add Logo'}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={title} className="media-detail-page__logo" />
          ) : (
            <h1 className="media-detail-page__fallback-title">{title}</h1>
          )}
        </div>

        {logoUrl && item?.type === 'scene' && (
          <h1 className="media-detail-page__scene-title-below-logo">{title}</h1>
        )}

        <div className="media-detail-page__details-group">
          {showOriginalTitle && (
            <div className="media-detail-page__original-title">
              {originalTitle}
            </div>
          )}

          {tagline && (
            <div className="media-detail-page__tagline">
              {taglineText}
            </div>
          )}

          {(metaDate || formattedDuration || seasonsText || episodesText || langText || ratingImdb || ratingTmdb || showStudioPill || showNetworkPill) && (
            <div className="media-detail-page__meta-row">
              {showStudioPill && (
                <Pill variant="meta">
                  <Video size={14} />
                  {studioName}
                </Pill>
              )}
              {showNetworkPill && (
                <Pill variant="meta">
                  <Globe size={14} />
                  {networkName}
                </Pill>
              )}
              {metaDate && (
                <Pill variant="meta">
                  <Calendar size={14} />
                  {metaDate}
                </Pill>
              )}
              {(isMovie || isScene) && formattedDuration && (
                <Pill variant="meta">
                  <Clock size={14} />
                  {formattedDuration}
                </Pill>
              )}
              {!isMovie && !isScene && seasonsText && (
                <Pill variant="meta">
                  {seasonsText}
                </Pill>
              )}
              {!isMovie && !isScene && episodesText && (
                <Pill variant="meta">
                  {episodesText}
                </Pill>
              )}
              {langText && (
                <Pill variant="meta">
                  {langText}
                </Pill>
              )}
              {activeRating && (
                <Pill variant="meta">
                  <img
                    src={activeRating.logo}
                    alt={activeRating.type === 'imdb' ? 'IMDb' : activeRating.type === 'tmdb' ? 'TMDb' : 'ThePornDB'}
                    className="rating-pill-img"
                  />
                  <span>
                    {isNaN(parseFloat(activeRating.val))
                      ? activeRating.val
                      : parseFloat(activeRating.val).toFixed(1)}
                  </span>
                </Pill>
              )}
            </div>
          )}

          {normalizedGenres && normalizedGenres.length > 0 && (
            <div className="media-detail-page__meta-row">
              {normalizedGenres.map((genre, idx) => (
                <Pill key={idx} variant="meta">
                  {t(`library.genres.${genre}`, { defaultValue: genre }).toUpperCase()}
                </Pill>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

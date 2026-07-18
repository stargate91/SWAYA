import { useMemo } from 'react';
import { Calendar, Clock, Video, Globe } from '@/ui/icons';
import Pill from '@/ui/Pill';
import { useTranslation } from '@/providers/LanguageContext';
import { useMediaDetailContext } from './MediaDetailContext';
import styles from './MediaHeaderInfo.module.css';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';

export default function MediaHeaderInfo({ isFallbackGrid = false }) {
  const t = useTranslation().t;
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
    <div className={`${styles.layout} ${isFallbackGrid ? styles['layout-fallback'] : ''}`}>
      <Stack gap="4xl" className={styles.copy}>
        <div
          className={`${styles['logo-container']} ${styles.clickable}`}
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
            <img src={logoUrl} alt={title} className={styles.logo} />
          ) : (
            <Text as="h1" variant="title" shadow="title" className={styles['fallback-title']}>{title}</Text>
          )}
        </div>

        {logoUrl && item?.type === 'scene' && (
          <Text as="h1" variant="title" shadow="title" className={styles['scene-title-below-logo']}>{title}</Text>
        )}

        <Stack gap="md" className={styles['details-group']}>
          {showOriginalTitle && (
            <Text as="div" variant="body" color="muted" weight="medium" italic className={styles['original-title']}>
              {originalTitle}
            </Text>
          )}

          {tagline && (
            <Text as="div" variant="body" color="accent" weight="medium" italic shadow="tagline" className={styles.tagline}>
              {taglineText}
            </Text>
          )}

          {(metaDate || formattedDuration || seasonsText || episodesText || langText || ratingImdb || ratingTmdb || showStudioPill || showNetworkPill) && (
            <Inline gap="lg" align="center" className={styles['meta-row']}>
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
                  />
                  <span>
                    {isNaN(parseFloat(activeRating.val))
                      ? activeRating.val
                      : parseFloat(activeRating.val).toFixed(1)}
                  </span>
                </Pill>
              )}
            </Inline>
          )}

          {normalizedGenres && normalizedGenres.length > 0 && (
            <Inline gap="lg" align="center" className={styles['meta-row']}>
              {normalizedGenres.map((genre, idx) => (
                <Pill key={idx} variant="meta">
                  {t(`library.genres.${genre}`, { defaultValue: genre }).toUpperCase()}
                </Pill>
              ))}
            </Inline>
          )}
        </Stack>
      </Stack>
    </div>
  );
}

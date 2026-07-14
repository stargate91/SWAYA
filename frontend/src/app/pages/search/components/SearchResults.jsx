import PosterGrid from '@/ui/PosterGrid';
import PosterCard from '@/ui/PosterCard';
import AdultOverlay from '@/ui/AdultOverlay';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import { API_BASE } from '@/lib/backend';
import styles from './SearchResults.module.css';

export default function SearchResults({
  filteredResults,
  urlType,
  urlSource,
  settings,
  sessionMode,
  FallbackIcon,
  handleCardClick,
  hasMorePages,
  setLoadedPage,
  isMoreLoading,
  t,
}) {
  return (
    <>
      <PosterGrid className={`${styles['search-page-grid']} ${urlType === 'scene' ? 'library-scenes-grid' : ''}`}>
        {filteredResults.map((item, idx) => {
          const n = normalizeMediaEntity(item, { context: 'search', settings });
          const isAdultItem = urlSource !== 'tmdb' || item.is_adult || item.media_type === 'scene';
          const showBlurOverlay = sessionMode === 'sfw' && isAdultItem;

          const imgType = showBlurOverlay ? (item.media_type === 'scene' ? 'backdrop' : 'poster') : 'posterThumb';
          const rawPosterUrl = item.poster_path ? resolveMediaImageUrl(item.poster_path, imgType) : null;
          const posterUrl = (showBlurOverlay && rawPosterUrl)
            ? `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(rawPosterUrl)}&blur=true`
            : rawPosterUrl;

          let subtitle = n.subtitle || undefined;
          let ratingPill;
          let performers;

          if (item.media_type === 'scene') {
            performers = n.performers;
            subtitle = undefined;

            const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
            ratingPill = displayDate ? (
              <span className={styles['search-page-card-date']}>{displayDate}</span>
            ) : undefined;
          }

          return (
            <PosterCard
              key={`${item.id}-${item.media_type}-${idx}`}
              aspect={item.media_type === 'scene' ? 'landscape' : 'poster'}
              className={item.media_type === 'scene' ? styles['library-scene-card'] : ''}
              title={item.title || item.name}
              subtitle={subtitle}
              ratingPill={ratingPill}
              performers={performers}
              imageUrl={posterUrl}
              icon={FallbackIcon}
              onClick={() => handleCardClick(item)}
              overlay={showBlurOverlay ? <AdultOverlay variant="obscure" /> : null}
            />
          );
        })}
      </PosterGrid>

      {hasMorePages && (
        <div className={styles['search-page-more-container']}>
          {isMoreLoading ? (
            <Spinner label={t('common.loading') || 'Loading...'} />
          ) : (
            <Button
              variant="secondary-neutral"
              onClick={() => setLoadedPage((prev) => prev + 1)}
            >
              {t('search.moreMatches', {
                count: 20,
                defaultValue: 'Load More Results (+20)'
              })}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

import Grid from '@/ui/Grid';
import PosterCard from '@/ui/PosterCard';
import AdultOverlay from '@/ui/AdultOverlay';
import Button from '@/ui/Button';
import Spinner from '@/ui/Spinner';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import { API_BASE } from '@/lib/backend';

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
      <Grid variant={urlType === 'scene' ? 'scene' : 'poster'}>
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
          let date;
          let performers;

          if (item.media_type === 'scene') {
            performers = n.performers;
            subtitle = undefined;

            date = item.release_date ? item.release_date.substring(0, 10) : item.year;
          }

          return (
            <PosterCard
              key={`${item.id}-${item.media_type}-${idx}`}
              aspect={item.media_type === 'scene' ? 'landscape' : 'poster'}
              title={item.title || item.name}
              subtitle={subtitle}
              date={date}
              performers={performers}
              imageUrl={posterUrl}
              icon={FallbackIcon}
              onClick={() => handleCardClick(item)}
              overlay={showBlurOverlay ? <AdultOverlay variant="obscure" /> : null}
            />
          );
        })}
      </Grid>

      {hasMorePages && (
        <Stack gap="lg" fullWidth className="u-mt-sm">
          <hr className="u-divider" />
          <Inline justify="center" fullWidth>
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
          </Inline>
        </Stack>
      )}
    </>
  );
}

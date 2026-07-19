import { resolveMediaImageUrl } from '../../../lib/imageUrls';
import Dropdown from '../../../ui/Dropdown';
import WidgetShell from '@/ui/WidgetShell';
import PosterCard from '../../../ui/PosterCard';
import posterCardStyles from '../../../ui/PosterCard.module.css';
import Button from '../../../ui/Button';
import Inline from '../../../ui/Inline';
import { Check, Plus, Minus } from '@/ui/icons';
import { useTranslation } from '../../../providers/LanguageContext';
import Stack from '../../../ui/Stack';
import ScrollRow from '../../../ui/ScrollRow';
import EmptyState from '../../../ui/EmptyState';
import Text from '../../../ui/Text';
import useTMDBDiscovery from './hooks/useTMDBDiscovery';

const TMDBDiscoveryWidget = () => {
  const { t: T } = useTranslation();
  const {
    genreId,
    setGenreId,
    year,
    setYear,
    scrollRef,
    items,
    loading,
    actualWatchlistIds,
    handleWatchlist,
    handleCardClick,
    translatedGenres,
    translatedYears,
  } = useTMDBDiscovery();

  return (
    <Stack gap="xl">
      <Inline gap="lg" align="center" justify="between" fullWidth>
        <Text as="h3" variant="display" weight="extrabold">
          {T('dashboard.recommendations.discovery_title') || 'Top 20 Discoveries'}
        </Text>
        
        <Inline gap="md" align="center">
          <Dropdown
            options={translatedGenres}
            value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            className="u-w-genre"
          />

          <Dropdown
            options={translatedYears}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="u-w-year"
          />
        </Inline>
      </Inline>

      <WidgetShell loading={loading} size="lg" transparent={true}>
        {items.length === 0 ? (
          <EmptyState
            title={T('dashboard.recommendations.discovery_no_results') || 'No popular movies found matching filters.'}
            size="sm"
            background="none"
            border="none"
          />
        ) : (
          <ScrollRow ref={scrollRef}>
            {items.map((item) => {
              const posterUrl = resolveMediaImageUrl(item.poster_path, 'poster');
              const watchlistId = item.tmdb_id || item.tv_tmdb_id || item.id;
              const isWatchlisted = actualWatchlistIds.includes(watchlistId);
              const ratingImdb = item.rating_imdb;
              const ratingTmdb = item.rating_tmdb || item.vote_average;
              const yearLabel = item.release_date ? new Date(item.release_date).getFullYear() : null;

              return (
                <PosterCard
                  key={item.id}
                  size="default"
                  imageUrl={posterUrl}
                  onClick={() => handleCardClick(item)}
                  title={item.title}
                  subtitle={yearLabel ? String(yearLabel) : null}
                  ratingImdb={ratingImdb}
                  ratingTmdb={ratingTmdb}
                >
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      const type = item.media_type || 'movie';
                      handleWatchlist(item, type);
                    }}
                    className={`${posterCardStyles['action-btn']} ${isWatchlisted ? '' : posterCardStyles['action-btn--neutral']}`}
                    variant="unstyled"
                  >
                    {isWatchlisted ? (
                      <>
                        <span className={posterCardStyles['action-btn-state-default']}>
                          <Check size={12} strokeWidth={3} /> {T('dashboard.watchlist.added') || 'Watchlisted'}
                        </span>
                        <span className={posterCardStyles['action-btn-state-hover']}>
                          <Minus size={12} strokeWidth={3} /> {T('common.remove') || 'Remove'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Plus size={12} strokeWidth={3} /> {T('dashboard.watchlist.add_short') || 'Watchlist'}
                      </>
                    )}
                  </Button>
                </PosterCard>
              );
            })}
          </ScrollRow>
        )}
      </WidgetShell>
    </Stack>
  );
};

export default TMDBDiscoveryWidget;

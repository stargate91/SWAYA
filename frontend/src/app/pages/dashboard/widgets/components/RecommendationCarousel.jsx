import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Play, Check, Plus, Minus } from '@/ui/icons';
import { useLibraryModeStore } from '../../../../stores/useLibraryModeStore';
import { resolveMediaImageUrl } from '../../../../lib/imageUrls';
import { normalizeMediaEntity } from '../../../../lib/normalizeMediaEntity';
import { API_BASE } from '../../../../lib/backend';
import Button from '../../../../ui/Button';
import Spinner from '../../../../ui/Spinner';
import PosterCard from '../../../../ui/PosterCard';
import AdultOverlay from '../../../../ui/AdultOverlay';
import posterCardStyles from '../../../../ui/PosterCard.module.css';
import { useTranslation } from '../../../../providers/LanguageContext';
import Stack from '../../../../ui/Stack';
import ScrollRow from '../../../../ui/ScrollRow';
import Text from '../../../../ui/Text';

export const RecommendationCarousel = ({
  title,
  items,
  watchlistIds,
  onWatchlist,
  onCardClick,
  isAdultCarousel = false,
  onLoadMore = null,
  hasMore = false,
  isLoadingMore = false,
  settings = {},
  onPlayClick,
  playMutationPending,
}) => {
  const { t: T } = useTranslation();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  const handleScroll = useCallback((e) => {
    const element = e.currentTarget;
    if (!element) return;
    const isNearEnd = element.scrollLeft >= element.scrollWidth - element.clientWidth - 150;

    if (isNearEnd && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (!items?.length) {
    return null;
  }

  return (
    <Stack gap="xl">
      <Text as="h3" variant="display" weight="extrabold">{title}</Text>

      <ScrollRow onScroll={handleScroll}>
        {items.map((item) => {
          const n = normalizeMediaEntity(item, {
            context: 'recommendations',
            settings,
            sessionMode,
            isAdultContext: isAdultCarousel,
          });
          const watchlistId = n.isScene ? item.id : (item.tmdb_id || item.tv_tmdb_id || item.id);
          const isWatchlisted = watchlistIds.includes(watchlistId);
          const rawPosterUrl = n.isPerson
            ? resolveMediaImageUrl(item.profile_path || item.local_profile_path, 'personThumb')
            : resolveMediaImageUrl(n.isScene ? (item.backdrop_path || item.poster_path) : item.poster_path, n.isScene ? 'backdrop' : 'poster');
          const posterUrl = (n.shouldBlur && rawPosterUrl)
            ? `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(rawPosterUrl)}&blur=true`
            : rawPosterUrl;
          const yearLabel = n.subtitle;
          const performers = n.performers;
          const displayDate = item.release_date ? item.release_date.substring(0, 10) : '';

          let roleLabel = null;
          if (n.isPerson) {
            const dept = item.known_for_department || (item.is_adult ? 'performer' : 'artist');
            roleLabel = T(`lists.roles.${dept.toLowerCase()}`) || dept;
          }

          let subtitle = null;
          if (n.isPerson) {
            subtitle = roleLabel;
          } else if (!n.isScene) {
            subtitle = yearLabel;
          }

          return (
            <PosterCard
              key={item.id}
              size={n.isScene ? 'scene' : 'default'}
              className={n.shouldBlur ? 'is-blurred' : ''}
              aspect={n.isScene ? 'mixed-landscape' : 'poster'}
              imageUrl={posterUrl}
              onClick={() => onCardClick(item)}
              isWatched={item.is_watched}
              title={item.title || item.name}
              subtitle={subtitle}
              performers={n.isScene ? performers : null}
              date={n.isScene ? displayDate : null}
              ratingImdb={n.ratingImdb}
              ratingTmdb={n.ratingTmdb}
              ratingPill={null}
              userRating={Number(item?.user_rating) || 0}
              isFavorite={!!item?.is_favorite}
              playOverlay={
                !n.isPerson && item.in_library && onPlayClick
                  ? {
                      title: null,
                      onClick: (e) => {
                        e.stopPropagation();
                        onPlayClick(item);
                      },
                      pending: playMutationPending,
                      icon: <Play size={16} fill="currentColor" />,
                    }
                  : null
              }
            >
              {!n.isPerson && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    const type = n.isScene ? 'scene' : (item.media_type || item.type || (item.title ? 'movie' : 'tv'));
                    onWatchlist(item, type);
                  }}
                  className={posterCardStyles['action-btn']}
                  variant={isWatchlisted ? 'success' : 'glass-accent'}
                  aria-pressed={isWatchlisted}
                  size="sm"
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
              )}
              {n.shouldBlur && (
                <div className="recommend-card-blur-overlay">
                  <AdultOverlay isNsfw={sessionMode === 'nsfw'} />
                </div>
              )}
            </PosterCard>
          );
        })}
        {isLoadingMore && (
          <div className="u-loading-card">
            <Spinner className="u-color-accent-soft" />
          </div>
        )}
      </ScrollRow>
    </Stack>
  );
};

RecommendationCarousel.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.array,
  watchlistIds: PropTypes.array.isRequired,
  onWatchlist: PropTypes.func.isRequired,
  onCardClick: PropTypes.func.isRequired,
  isAdultCarousel: PropTypes.bool,
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  settings: PropTypes.object,
  onPlayClick: PropTypes.func,
  playMutationPending: PropTypes.bool,
};

export default RecommendationCarousel;

import { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, Play, Check, Plus, Minus } from '@/ui/icons';
import { useLibraryModeStore } from '../../../../stores/useLibraryModeStore';
import { resolveMediaImageUrl } from '../../../../lib/imageUrls';
import { normalizeMediaEntity } from '../../../../lib/normalizeMediaEntity';
import { API_BASE } from '../../../../lib/backend';
import Button from '../../../../ui/Button';
import Spinner from '../../../../ui/Spinner';
import PosterCard from '../../../../ui/PosterCard';
import AdultOverlay from '../../../../ui/AdultOverlay';
import IconButton from '../../../../ui/IconButton';
import posterCardStyles from '../../../../ui/PosterCard.module.css';
import styles from '../RecommendationsWidget.module.css';
import { useTranslation } from '../../../../providers/LanguageContext';

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
  const scrollRef = useRef(null);

  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  const updateArrows = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const isNearEnd = element.scrollLeft >= element.scrollWidth - element.clientWidth - 150;

    setShowLeft(element.scrollLeft > 10);
    setShowRight(element.scrollLeft < element.scrollWidth - element.clientWidth - 10);

    if (isNearEnd && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const timer = setTimeout(updateArrows, 100);
    window.addEventListener('resize', updateArrows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, items]);

  if (!items?.length) {
    return null;
  }

  const scroll = (direction) => {
    const element = scrollRef.current;
    if (!element) return;
    const amount = element.clientWidth * 0.75;
    element.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className={styles['recommend-carousel']}>
      <h3 className={styles['recommend-carousel-title']}>{title}</h3>

      <div className={styles['recommend-carousel-shell']}>
        {showLeft && (
          <IconButton
            variant="carousel-arrow"
            className={styles['is-left']}
            onClick={() => scroll('left')}
          >
            <ChevronLeft size={24} />
          </IconButton>
        )}

        {showRight && (
          <IconButton
            variant="carousel-arrow"
            className={styles['is-right']}
            onClick={() => scroll('right')}
          >
            <ChevronRight size={24} />
          </IconButton>
        )}

        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className={`${styles['recommend-carousel-track']} no-scrollbar`}
        >
          {items.map((item) => {
            const n = normalizeMediaEntity(item, {
              context: 'recommendations',
              settings,
              sessionMode,
              isAdultContext: isAdultCarousel,
            });
            const isWatchlisted = watchlistIds.includes(item.id);
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
                className={`${styles['recommend-card']} ${n.isScene ? styles['recommend-card--scene'] : ''} ${n.shouldBlur ? 'is-blurred' : ''}`}
                aspect={n.isScene ? 'mixed-landscape' : 'poster'}
                imageWrapperClassName={styles['recommend-card-image-wrapper']}
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
                  <div className={styles['recommend-card-overlay']}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        const type = n.isScene ? 'scene' : (item.media_type || item.type || (item.title ? 'movie' : 'tv'));
                        onWatchlist(item, type);
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
                  </div>
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
            <div className={`${styles['recommend-card']} ${styles['recommend-card-loading-wrapper']}`}>
              <Spinner className={styles['custom-spinner']} />
            </div>
          )}
        </div>
      </div>
    </div>
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

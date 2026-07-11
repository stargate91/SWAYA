import { memo } from 'react';
import { Heart, Pencil, Play, Star, Minus } from '@/ui/icons';
import Badge from '@/ui/Badge';
import PosterCard from '@/ui/PosterCard';
import {
  getPosterImagePath,
  getProfileImagePath,
  getTvPosterImagePath,
  resolveMediaImageUrl,
} from '@/lib/imageUrls';
import {
  isLibraryMovieTab,
  isLibraryPeopleTab,
  isLibraryTvTab,
  isLibraryScenesTab,
} from '@/lib/libraryTabs';
import { isSceneMediaType } from '@/lib/mediaTypes';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import { formatPerformerSubtitle } from '../utils/performerStats';

const renderUserRatingBadge = (item) => {
  const rating = Number(item?.user_rating);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  const label = Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
  return (
    <Badge className="ui-poster-card__user-rating-badge">
      <Star size={10} fill="currentColor" />
      {label}
    </Badge>
  );
};

const renderFavoriteBadge = (item, t) => {
  if (!item?.is_favorite) return null;
  return (
    <div
      className="ui-poster-card__favorite-badge"
      title={t('library.filter.favorite') || 'Favourite'}
      aria-label={t('library.filter.favorite') || 'Favourite'}
    >
      <Heart size={14} fill="currentColor" strokeWidth={2.2} />
    </div>
  );
};

export const LibraryPosterCard = memo(({
  item,
  index,
  resolvedTab,
  isCollections,
  emptyIcon,
  t,
  playMutationPending,
  onItemClick,
  onPlayOverlayClick,
  onEditImageClick,
  onRemove,
  settings,
  sortKey,
}) => {
  const isPeople = isLibraryPeopleTab(resolvedTab);
  const isLibraryTv = isLibraryTvTab(resolvedTab);
  const isLibraryMovie = isLibraryMovieTab(resolvedTab);
  const isLibraryScenes = isLibraryScenesTab(resolvedTab);

  const resolvePosterUrl = (path) => resolveMediaImageUrl(path, 'poster');

  const n = normalizeMediaEntity(item, { context: 'library', settings });

  // Compute props stably
  let title = item.title || item.name;
  let subtitle;
  let imageUrl;
  let ratingImdb = (isPeople || onRemove) ? undefined : n.ratingImdb;
  let ratingTmdb = (isPeople || onRemove) ? undefined : n.ratingTmdb;
  const ratingPorndb = (isPeople || onRemove) ? undefined : item.rating_porndb;
  const isScene = isSceneMediaType(item.type) || isLibraryScenes;

  let topRightAction;
  let badge = onRemove ? null : renderUserRatingBadge(item);
  let topRightBadge = null;
  let playOverlay = null;
  let className = '';
  let ratingPill;
  let performers;

  if (onRemove) {
    // Tag card behavior
    topRightAction = (
      <button
        type="button"
        className="ui-card-action-btn ui-card-action-btn--danger"
        title={t('common.remove') || 'Remove'}
        aria-label={t('common.remove') || 'Remove'}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item);
        }}
      >
        <Minus size={11} strokeWidth={3.5} /> {t('common.remove') || 'Remove'}
      </button>
    );
    imageUrl = n.imageUrl;
    
    if (isScene) {
      performers = n.performers;
      const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
      ratingPill = displayDate ? (
        <span className="library-scene-date">{displayDate}</span>
      ) : undefined;
    } else {
      subtitle = n.subtitle;
    }
  } else {
    // Standard library card behavior
    const handleEditClick = (e) => {
      e.stopPropagation();
      onEditImageClick?.(item);
    };

    const editButton = onEditImageClick ? (
      <button
        type="button"
        className="ui-image-edit-badge"
        title={isPeople
          ? (t('library.details.changeProfile') || 'Change Profile Picture')
          : (t('library.details.changePoster') || 'Change Poster')}
        aria-label={isPeople
          ? (t('library.details.changeProfile') || 'Change Profile Picture')
          : (t('library.details.changePoster') || 'Change Poster')}
        onClick={handleEditClick}
      >
        <Pencil size={14} />
      </button>
    ) : null;

    if (isCollections) {
      title = item.name || item.title;
      subtitle = t('library.collections.partsCount', { owned: item.owned_count, total: item.total_count });
      imageUrl = resolvePosterUrl(getPosterImagePath(item));
      topRightAction = editButton;
    } else if (isPeople) {
      title = item.name || item.title;
      subtitle = formatPerformerSubtitle(item, sortKey, t);
      imageUrl = resolvePosterUrl(getProfileImagePath(item));
      className = 'library-person-card';
      topRightBadge = renderFavoriteBadge(item, t);
      topRightAction = editButton;
    } else if (isLibraryScenes) {
      performers = n.performers;

      const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
      ratingPill = displayDate ? (
        <span className="library-scene-date">{displayDate}</span>
      ) : undefined;
      imageUrl = resolvePosterUrl(item.backdrop_path) || item.displayPosterRemote || resolvePosterUrl(getPosterImagePath(item));
      className = 'library-scene-card';
      topRightAction = editButton;

      if (item.in_library !== false && onPlayOverlayClick) {
        const playTitle = ((item.resume_position || 0) > 0 ? (t('library.details.resume') || 'Resume') : (t('library.details.play') || 'Play'));
        playOverlay = {
          onClick: (event) => {
            onPlayOverlayClick(event, item);
          },
          title: playTitle,
          label: playTitle,
          disabled: playMutationPending,
          icon: <Play size={12} fill="currentColor" />,
        };
      }
    } else {
      subtitle = n.subtitle;
      imageUrl = resolvePosterUrl(isLibraryTv ? getTvPosterImagePath(item) : getPosterImagePath(item));
      topRightAction = editButton;

      if (item.in_library !== false && (isLibraryMovie || isLibraryTv) && onPlayOverlayClick) {
        const playTitle = isLibraryTv
          ? (t('library.details.continue') || 'Continue')
          : ((item.resume_position || 0) > 0 ? (t('library.details.resume') || 'Resume') : (t('library.details.play') || 'Play'));

        playOverlay = {
          onClick: (event) => {
            onPlayOverlayClick(event, item);
          },
          title: playTitle,
          label: playTitle,
          disabled: playMutationPending,
          icon: <Play size={12} fill="currentColor" />,
        };
      }
    }
  }

  const previewItemId = (isScene && item.in_library !== false && !onRemove)
    ? (item.library_item_id || item.id)
    : undefined;

  return (
    <PosterCard
      aspect={isScene ? 'landscape' : 'poster'}
      customStyle={{ '--item-index': index }}
      onClick={() => onItemClick(item)}
      isWatched={item.is_watched}
      title={title}
      subtitle={subtitle}
      imageUrl={imageUrl}
      icon={emptyIcon}
      backgroundColor={item.color}
      ratingImdb={ratingImdb}
      ratingTmdb={ratingTmdb}
      ratingPorndb={ratingPorndb}
      ratingPill={ratingPill}
      performers={performers}
      topRightAction={topRightAction}
      badge={badge}
      topRightBadge={topRightBadge}
      playOverlay={playOverlay}
      className={className}
      previewItemId={previewItemId}
      previewEnabled={onRemove ? false : Boolean(settings?.hover_previews_enabled ?? true)}
      previewDelay={onRemove ? 500 : Number(settings?.hover_previews_delay ?? 500)}
    />
  );
});

LibraryPosterCard.displayName = 'LibraryPosterCard';

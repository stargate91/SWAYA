 
import { memo } from 'react';
import { Heart, X } from '@/ui/icons';
import Badge from '@/ui/Badge';
import PosterCard from '@/ui/PosterCard';
import { getProfileImagePath, getTvPosterImagePath, getPosterImagePath } from '@/lib/imageUrls';
import { isPersonMediaType, isTvLikeMediaType } from '@/lib/mediaTypes';

const renderUserRatingBadge = (item) => {
  const rating = Number(item?.user_rating);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  const label = Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
  return (
    <Badge className="ui-poster-card__user-rating-badge">
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

export const TagPosterCard = memo(({
  item,
  t,
  resolvePosterUrl,
  emptyIcon,
  isFocusMode,
  onClick,
  onRemove,
}) => {
  const isPerson = isPersonMediaType(item.type);
  const ratingImdb = item.rating_imdb;
  const ratingTmdb = item.rating;
  const ratingPorndb = item.rating_porndb;

  const removeButton = onRemove ? (
    <button
      type="button"
      className="ui-poster-card__remove-badge"
      title={t('common.remove') || 'Remove'}
      aria-label={t('common.remove') || 'Remove'}
      onClick={(e) => {
        e.stopPropagation();
        onRemove(item);
      }}
    >
      <X size={14} />
    </button>
  ) : null;

  let cardProps;
  if (isPerson) {
    cardProps = {
      variant: isFocusMode ? 'overlay-title' : 'default',
      title: item.name || item.title,
      subtitle: item.people_role ? t(`library.people.roles.${item.people_role}`, { defaultValue: item.people_role }) : '',
      imageUrl: resolvePosterUrl(getProfileImagePath(item)),
      icon: emptyIcon,
      className: 'library-person-card',
      badge: renderUserRatingBadge(item),
      topRightBadge: renderFavoriteBadge(item, t),
      topRightAction: removeButton,
    };
  } else {
    const subtitleParts = [];
    if (item.year) subtitleParts.push(item.year);
    if (item.info) subtitleParts.push(item.info);
    cardProps = {
      variant: isFocusMode ? 'overlay-title' : 'default',
      title: item.title,
      subtitle: subtitleParts.join(' • '),
      imageUrl: resolvePosterUrl(
        isTvLikeMediaType(item.type) ? getTvPosterImagePath(item) : getPosterImagePath(item)
      ),
      icon: emptyIcon,
      backgroundColor: item.color,
      badge: renderUserRatingBadge(item),
      ratingImdb: ratingImdb,
      ratingTmdb: ratingTmdb,
      ratingPorndb: ratingPorndb,
      topRightAction: removeButton,
    };
  }

  return (
    <PosterCard
      isWatched={item.is_watched}
      onClick={onClick}
      {...cardProps}
    />
  );
});

TagPosterCard.displayName = 'TagPosterCard';

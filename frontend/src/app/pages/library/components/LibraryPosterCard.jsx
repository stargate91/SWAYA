import { memo } from 'react';
import { Heart, Pencil, Play, Star } from '@/ui/icons';
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
  let title = item.title;
  let subtitle;
  let imageUrl;
  let ratingImdb = n.ratingImdb;
  let ratingTmdb = n.ratingTmdb;
  const ratingPorndb = isPeople ? undefined : item.rating_porndb;
  const isScene = isSceneMediaType(item.type) || isLibraryScenes;

  if (isScene || isPeople) {
    ratingTmdb = undefined;
    ratingImdb = undefined;
  }

  let topRightAction;
  let badge = renderUserRatingBadge(item);
  let topRightBadge = null;
  let playOverlay = null;
  let className = '';
  let ratingPill;
  let performers;

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEditImageClick(item);
  };

  const editButton = (
    <button
      type="button"
      className="ui-poster-card__edit-badge"
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
  );

  if (isCollections) {
    title = item.name || item.title;
    subtitle = t('library.collections.partsCount', { owned: item.owned_count, total: item.total_count });
    imageUrl = resolvePosterUrl(getPosterImagePath(item));
    topRightAction = editButton;
  } else if (isPeople) {
    title = item.name || item.title;
    const isPhysicalSort = ['height', 'weight', 'cup_size', 'waist', 'hip', 'hourglass_ratio', 'body_slender', 'body_curvy'].includes(sortKey);
    const isMetadataSort = ['birthday', 'rating', 'popularity', 'library_count', 'last_watched', 'watch_count', 'tag_count', 'finish_count', 'last_finish'].includes(sortKey);
    if (isPhysicalSort || isMetadataSort) {
      if (sortKey === 'height') {
        subtitle = item.height ? `${item.height} cm` : '—';
      } else if (sortKey === 'weight') {
        subtitle = item.weight ? `${item.weight} kg` : '—';
      } else if (sortKey === 'cup_size') {
        const band = item.band_size || '';
        const cup = item.cup_size || '';
        subtitle = (band || cup) ? `${band}${cup}` : '—';
      } else if (sortKey === 'waist') {
        subtitle = item.waist ? `${t('library.performerEdit.waistInches') || 'Waist'}: ${item.waist}"` : '—';
      } else if (sortKey === 'hip') {
        subtitle = item.hip ? `${t('library.performerEdit.hipInches') || 'Hip'}: ${item.hip}"` : '—';
      } else if (sortKey === 'hourglass_ratio') {
        const w = parseFloat(item.waist) || 0;
        const h = parseFloat(item.hip) || 0;
        subtitle = w > 0 && h > 0 ? (w / h).toFixed(2) : '—';
      } else if (sortKey === 'body_slender') {
        const w = parseFloat(item.waist) || 0;
        const height = parseFloat(item.height) || 0;
        if (w > 0) {
          const h_cm = height > 0 ? height : 165.0;
          const w_cm = w * 2.54;
          const score = (w_cm / h_cm).toFixed(3);
          subtitle = `${t('library.sort.slenderScore') || 'Slender Score'}: ${score}`;
        } else {
          subtitle = '—';
        }
      } else if (sortKey === 'body_curvy') {
        const w = parseFloat(item.waist) || 0;
        const h = parseFloat(item.hip) || 0;
        if (w > 0 && h > 0) {
          const cupOrder = {
            'A': 1, 'B': 2, 'C': 3, 'D': 4, 'DD': 5, 'DDD': 6, 'E': 7, 'EE': 8, 'F': 9, 'FF': 10,
            'G': 11, 'GG': 12, 'H': 13, 'HH': 14, 'I': 15, 'J': 16, 'K': 17
          };
          const cupVal = cupOrder[String(item.cup_size || '').trim().toUpperCase()] || 0;
          const bandVal = parseFloat(item.band_size) || 34.0;
          const breastScore = cupVal > 0 ? (cupVal + (bandVal - 30.0) / 2.0) : 0.0;
          const score = ((h - w) * 2.54 + breastScore).toFixed(1);
          subtitle = `${t('library.sort.curvyScore') || 'Curvy Score'}: ${score}`;
        } else {
          subtitle = '—';
        }
      } else if (sortKey === 'birthday') {
        if (item.birthday) {
          const birthDate = new Date(item.birthday);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            subtitle = `${item.birthday} (${age})`;
          } else {
            subtitle = item.birthday;
          }
        } else {
          subtitle = '—';
        }
      } else if (sortKey === 'rating') {
        if (item.is_adult_person || item.rating_porndb) {
          subtitle = item.rating_porndb ? `PornDB Rating: ${Number(item.rating_porndb).toFixed(1)}` : '—';
        } else {
          subtitle = item.popularity ? `Popularity: ${Number(item.popularity).toFixed(1)}` : '—';
        }
      } else if (sortKey === 'popularity') {
        subtitle = item.popularity ? `Popularity: ${Number(item.popularity).toFixed(1)}` : '—';
      } else if (sortKey === 'library_count') {
        const count = item.library_count || 0;
        subtitle = t('library.sort.libraryCountValue', { count }) || `${count} items`;
      } else if (sortKey === 'last_watched') {
        subtitle = item.last_watched_at ? `Last Watched: ${item.last_watched_at.substring(0, 10)}` : '—';
      } else if (sortKey === 'watch_count') {
        subtitle = `Watch Count: ${item.watch_count || 0}`;
      } else if (sortKey === 'tag_count') {
        subtitle = `Tags: ${item.tag_count || 0}`;
      } else if (sortKey === 'finish_count') {
        subtitle = `Finish Count: ${item.finish_count || 0}`;
      } else if (sortKey === 'last_finish') {
        subtitle = item.last_finish_at ? `Last Finish: ${item.last_finish_at.substring(0, 10)}` : '—';
      }
    } else {
      subtitle = item.people_role ? t(`library.people.roles.${item.people_role}`, { defaultValue: item.people_role }) : '';
    }
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

    if (item.in_library !== false) {
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

    if (item.in_library !== false && (isLibraryMovie || isLibraryTv)) {
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

  const previewItemId = (isLibraryScenes && item.in_library !== false)
    ? (item.library_item_id || item.id)
    : undefined;

  return (
    <PosterCard
      aspect={isLibraryScenes ? 'landscape' : 'poster'}
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
      previewEnabled={Boolean(settings?.hover_previews_enabled ?? true)}
      previewDelay={Number(settings?.hover_previews_delay ?? 500)}
    />
  );
});

LibraryPosterCard.displayName = 'LibraryPosterCard';

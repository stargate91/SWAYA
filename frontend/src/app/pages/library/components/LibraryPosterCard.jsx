import { memo } from 'react';
import { Pencil, Play, Minus, Check, Eye, EyeOff } from '@/ui/icons';
import PosterCard from '@/ui/PosterCard';
import posterCardStyles from '@/ui/PosterCard.module.css';
import buttonStyles from '@/ui/IconButton.module.css';
import { useBulkUpdateWatchedMutation } from '@/queries';
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
import { formatPerformerSubtitle, formatMediaSubtitle } from '../utils/performerStats';



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
  onUnfollow,
  settings,
  sortKey,
}) => {
  const isPeople = isLibraryPeopleTab(resolvedTab);
  const isLibraryTv = isLibraryTvTab(resolvedTab);
  const isLibraryMovie = isLibraryMovieTab(resolvedTab);
  const isLibraryScenes = isLibraryScenesTab(resolvedTab);

  const bulkUpdateWatchedMutation = useBulkUpdateWatchedMutation();

  const resolvePosterUrl = (path) => resolveMediaImageUrl(path, 'poster');

  const n = normalizeMediaEntity(item, { context: 'library', settings });

  // Compute props stably
  let title = item.title || item.name;
  let subtitle;
  let imageUrl;
  let ratingImdb = (isPeople || onRemove) ? undefined : (sortKey === 'rating' ? undefined : n.ratingImdb);
  let ratingTmdb = (isPeople || onRemove) ? undefined : n.ratingTmdb;
  const ratingPorndb = (isPeople || onRemove) ? undefined : item.rating_porndb;
  const isScene = isSceneMediaType(item.type) || isLibraryScenes;

  let topRightAction;
  let playOverlay = null;
  let className = '';
  let ratingPill;
  let performers;

  if (onRemove) {
    // Tag card behavior
    topRightAction = (
      <button
        type="button"
        className={`${posterCardStyles['action-btn']} ${posterCardStyles['action-btn--danger']}`}
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
        className={`${buttonStyles['image-edit-badge']} ui-image-edit-badge`}
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
      topRightAction = editButton;
    } else if (isLibraryScenes) {
      performers = n.performers;

      const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
      
      let pillText = displayDate;
      if (sortKey === 'release_date') {
        pillText = item.release_date ? item.release_date.substring(0, 10) : item.year;
      } else if (sortKey === 'duration') {
        const runTime = item.duration || item.runtime || item.run_time;
        if (runTime) {
          const mins = runTime > 500 ? Math.round(runTime / 60) : Math.round(runTime);
          pillText = `${mins} mins`;
        }
      } else if (sortKey === 'file_size') {
        const sizeVal = Number(item.file_size || item.size || item.size_mb);
        if (sizeVal) {
          const isBytes = sizeVal > 50000;
          const sizeMb = isBytes ? (sizeVal / (1024 * 1024)) : sizeVal;
          pillText = sizeMb > 1024 ? `${(sizeMb / 1024).toFixed(2)} GB` : `${sizeMb.toFixed(0)} MB`;
        }
      } else if (sortKey === 'last_watched') {
        pillText = item.last_watched_at ? item.last_watched_at.substring(0, 10) : '—';
      } else if (sortKey === 'watch_count') {
        pillText = `${item.watch_count || 0}x`;
      } else if (sortKey === 'tag_count') {
        const tCount = item.tag_count || (item.custom_tags || []).length;
        pillText = `${tCount} tags`;
      } else if (sortKey === 'finish_count') {
        pillText = `${item.finish_count || 0} f`;
      } else if (sortKey === 'last_finish') {
        const fDate = item.last_finish_at || item.last_finish;
        pillText = fDate ? fDate.substring(0, 10) : '—';
      }

      ratingPill = pillText ? (
        <span className="library-scene-date">{pillText}</span>
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
      subtitle = formatMediaSubtitle(item, sortKey, t, n.subtitle);
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

  const unfollowButton = (onUnfollow && isPeople) ? (
    <button
      type="button"
      className={posterCardStyles['action-btn']}
      onClick={(e) => {
        e.stopPropagation();
        onUnfollow(item);
      }}
    >
      <span className={posterCardStyles['action-btn-state-default']}>
        <Check size={12} strokeWidth={3} /> {t('library.people.followed') || 'Followed'}
      </span>
      <span className={posterCardStyles['action-btn-state-hover']}>
        <Minus size={12} strokeWidth={3} /> {t('library.people.unfollow') || 'Unfollow'}
      </span>
    </button>
  ) : null;

  const handleWatchToggleClick = (e) => {
    e.stopPropagation();
    if (bulkUpdateWatchedMutation.isPending) return;
    bulkUpdateWatchedMutation.mutate({
      itemIds: [String(item.id)],
      isWatched: !item.is_watched,
      entityId: String(item.id),
      tvId: isLibraryTv ? (item.tv_tmdb_id || item.tmdb_id) : undefined,
    });
  };

  const watchToggleButton = (!isCollections && !isPeople && !onRemove) ? (
    <button
      type="button"
      className={posterCardStyles['watch-toggle']}
      title={item.is_watched
        ? (t('library.details.markUnwatched') || 'Mark as Unwatched')
        : (t('library.details.markWatched') || 'Mark as Watched')}
      aria-label={item.is_watched
        ? (t('library.details.markUnwatched') || 'Mark as Unwatched')
        : (t('library.details.markWatched') || 'Mark as Watched')}
      onClick={handleWatchToggleClick}
      disabled={bulkUpdateWatchedMutation.isPending}
    >
      {item.is_watched ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  ) : null;

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
      topLeftAction={watchToggleButton}
      topRightAction={topRightAction}
      userRating={onRemove ? 0 : (Number(item.user_rating) || 0)}
      isFavorite={Boolean(item.is_favorite)}
      playOverlay={playOverlay}
      className={className}
      isMissing={item.in_library === false}
      previewItemId={previewItemId}
      previewEnabled={onRemove ? false : Boolean(settings?.hover_previews_enabled ?? true)}
      previewDelay={onRemove ? 800 : Number(settings?.hover_previews_delay ?? 800)}
    >
      {unfollowButton}
    </PosterCard>
  );
});

LibraryPosterCard.displayName = 'LibraryPosterCard';

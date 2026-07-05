 
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Pencil, Play } from '@/ui/icons';
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
  const navigate = useNavigate();
  const isPeople = isLibraryPeopleTab(resolvedTab);
  const isLibraryTv = isLibraryTvTab(resolvedTab);
  const isLibraryMovie = isLibraryMovieTab(resolvedTab);
  const isLibraryScenes = isLibraryScenesTab(resolvedTab);

  const resolvePosterUrl = (path) => resolveMediaImageUrl(path, 'poster');

  // Compute props stably
  let title = item.title;
  let subtitle;
  let imageUrl;
  let ratingImdb = item.rating_imdb;
  let ratingTmdb = item.rating;
  let ratingPorndb;
  const isScene = isSceneMediaType(item.type) || isLibraryScenes;

  if (isScene || isPeople) {
    ratingTmdb = undefined;
    ratingImdb = undefined;
    if (!isPeople) {
      ratingPorndb = item.rating_porndb;
    } else {
      ratingPorndb = undefined;
    }
  } else {
    ratingPorndb = item.rating_porndb;
  }

  let topRightAction;
  let badge = renderUserRatingBadge(item);
  let topRightBadge = null;
  let playOverlay = null;
  let className = '';

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
    const isMetadataSort = ['birthday', 'rating', 'library_count'].includes(sortKey);
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
      } else if (['body_slender', 'body_curvy'].includes(sortKey)) {
        const w = item.waist || '—';
        const h = item.hip || '—';
        subtitle = `${w}-${h}`;
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
        subtitle = item.popularity ? `Popularity: ${Number(item.popularity).toFixed(1)}` : '—';
      } else if (sortKey === 'library_count') {
        const count = item.library_count || 0;
        subtitle = t('library.sort.libraryCountValue', { count }) || `${count} items`;
      }
    } else {
      subtitle = item.people_role ? t(`library.people.roles.${item.people_role}`, { defaultValue: item.people_role }) : '';
    }
    imageUrl = resolvePosterUrl(getProfileImagePath(item));
    className = 'library-person-card';
    topRightBadge = renderFavoriteBadge(item, t);
    topRightAction = editButton;
  } else if (isLibraryScenes) {
    const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
    imageUrl = resolvePosterUrl(item.backdrop_path) || item.displayPosterRemote || resolvePosterUrl(getPosterImagePath(item));
    className = 'library-scene-card';
    topRightAction = editButton;

    const genderPref = settings?.adult_gender_preference;
    const allPeople = item.people || [];
    const filteredPeople = genderPref && genderPref !== 'all'
      ? allPeople.filter(p => {
        if (genderPref === 'female') return p.gender === 1;
        if (genderPref === 'male') return p.gender === 2;
        return true;
      })
      : allPeople;
    const performers = filteredPeople.slice(0, 4);

    subtitle = (
      <div className="library-scene-card__subtitle-inner">
        <span className="library-scene-card__performers">
          {performers.map((p, idx) => (
            <span key={p.id}>
              {idx > 0 && ', '}
              <span
                role="button"
                tabIndex={0}
                className="library-scene-card__performer-link"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/library/people/${p.id}`, { state: { allowAdult: true } });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    navigate(`/library/people/${p.id}`, { state: { allowAdult: true } });
                  }
                }}
              >
                {p.name}
              </span>
            </span>
          ))}
        </span>
        {displayDate && <span className="library-scene-card__date">{displayDate}</span>}
      </div>
    );

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
    const subtitleParts = [];
    const displayDate = (isLibraryMovie && item.release_date)
      ? item.release_date.substring(0, 4)
      : item.year;
    if (displayDate) subtitleParts.push(displayDate);
    if (item.info) {
      subtitleParts.push(item.info);
    }
    subtitle = subtitleParts.join(' • ');
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

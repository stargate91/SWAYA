 
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
    subtitle = item.people_role ? t(`library.people.roles.${item.people_role}`, { defaultValue: item.people_role }) : '';
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
    />
  );
});

LibraryPosterCard.displayName = 'LibraryPosterCard';

import { Layers, Bookmark, Play } from '@/ui/icons';
import { resolveDetailsImageUrl } from '../../utils/detailUtils';
import { API_BASE } from '@/lib/backend';
import { getCreditSource, navigateToCreditDetail } from '../../utils/mediaNavigation';

export default function PersonCreditsCard({
  item,
  mediaType,
  navigate,
  playMutation,
  t,
  alwaysShowSourceBadge = false,
  showLibraryBadge = false,
  placeholderIconSize = 18
}) {
  const creditTitle = item.title || item.name || 'Unknown';
  const resolvedSource = getCreditSource(item);

  const isScene = mediaType === 'scenes' || mediaType.includes('scene');
  const posterPath = isScene
    ? (item.backdrop_path || item.local_backdrop_path || item.poster_path || item.local_poster_path)
    : (item.poster_path || item.local_poster_path || item.backdrop_path || item.local_backdrop_path);
  const posterUrl = posterPath ? resolveDetailsImageUrl(posterPath, API_BASE, isScene ? 'backdrop' : 'poster') : null;

  const handleCardClick = () => {
    navigateToCreditDetail(navigate, item, mediaType, resolvedSource);
  };

  const itemType = item.media_type || item.type;
  const isSceneOrPornDbMovie = (itemType === 'scene' || itemType === 'scenes') || (resolvedSource === 'porndb' || resolvedSource === 'theporndb');
  const leftText = isSceneOrPornDbMovie ? (item.release_date || '').split('T')[0].split(' ')[0] || item.year || '' : item.character || '';
  const rightText = isSceneOrPornDbMovie ? '' : item.year || '';
  const isTvItem = itemType === 'tv' || itemType === 'tvshows';

  return (
    <div
      className="person-credits-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      <div className="person-credits-card__poster-container">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={creditTitle}
            className="person-credits-card__poster"
            loading="lazy"
            onError={(e) => console.error("Image load failed in Card:", { src: posterUrl, resolvedSource, creditTitle, e })}
          />
        ) : (
          <div className="person-credits-card__placeholder">
            <Layers size={placeholderIconSize} />
          </div>
        )}

        {(alwaysShowSourceBadge || (showLibraryBadge && item.in_library)) && (
          <span className={`person-credits-card__source-badge source-${resolvedSource}`}>
            {resolvedSource === 'porndb' || resolvedSource === 'theporndb' ? 'PornDB' : resolvedSource === 'stashdb' ? 'Stash' : resolvedSource === 'fansdb' ? 'Fans' : 'TMDb'}
          </span>
        )}

        {showLibraryBadge && item.in_library && (
          <div className="person-credits-card__library-badge" title={t('library.details.inLibrary') || 'In Library'}>
            <Bookmark size={10} />
          </div>
        )}

        {item.in_library && !isTvItem && (
          <button
            type="button"
            className="person-credits-card__play-btn"
            onClick={(e) => {
              e.stopPropagation();
              playMutation.mutate(item.library_item_id || item.id);
            }}
          >
            <Play size={14} fill="currentColor" />
          </button>
        )}
      </div>

      <span className="person-credits-card__title" title={creditTitle}>{creditTitle}</span>
      <div className="person-credits-card__meta-row">
        <span className="person-credits-card__role" title={leftText}>
          {leftText}
        </span>
        {rightText && (
          <span className="person-credits-card__year">{rightText}</span>
        )}
      </div>
    </div>
  );
}

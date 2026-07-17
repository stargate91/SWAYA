import { Layers, Bookmark, Play } from '@/ui/icons';
import { resolveDetailsImageUrl } from '../../utils/detailUtils';
import { API_BASE } from '@/lib/backend';
import { getCreditSource, navigateToCreditDetail } from '../../utils/mediaNavigation';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import PosterCard from '@/ui/PosterCard';
import './PersonCreditsCard.css';

export default function PersonCreditsCard({
  item,
  mediaType,
  navigate,
  playMutation,
  t,
  alwaysShowSourceBadge = false,
  showLibraryBadge = false,
}) {
  const n = normalizeMediaEntity(item, { context: 'credits' });
  const creditTitle = n.title;
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
  const leftText = isSceneOrPornDbMovie ? n.subtitle : item.character || '';
  const rightText = isSceneOrPornDbMovie ? '' : item.year || '';
  const isTvItem = itemType === 'tv' || itemType === 'tvshows';

  const subtitleText = rightText ? `${leftText} (${rightText})` : leftText;

  const overlay = (
    <>
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
    </>
  );

  const playOverlay = item.in_library && !isTvItem ? {
    onClick: (e) => {
      e.stopPropagation();
      playMutation.mutate(item.library_item_id || item.id);
    },
    icon: <Play size={14} fill="currentColor" />,
    label: 'Play'
  } : null;

  return (
    <PosterCard
      className="person-credits-card"
      aspect={isScene ? 'landscape' : 'poster'}
      imageUrl={posterUrl}
      title={creditTitle}
      subtitle={subtitleText}
      overlay={overlay}
      playOverlay={playOverlay}
      onClick={handleCardClick}
      icon={Layers}
    />
  );
}

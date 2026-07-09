import { Clapperboard } from '@/ui/icons';
import Badge from '../../../ui/Badge';
import PosterCard from '../../../ui/PosterCard';
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';

const getImageUrl = (path, size = TMDB_IMAGE_SIZES.posterThumb) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    const url = path.startsWith('//') ? `https:${path}` : path;
    return `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return buildTmdbImageUrl(path, size);
};

export default function MatchSeasonCard({
  seasonEntry,
  isBrowserLoading,
  onSelect,
  isActive = false,
  t,
}) {
  const posterUrl = getImageUrl(seasonEntry.poster_path, TMDB_IMAGE_SIZES.posterThumb);
  const displayTitle = seasonEntry.name || t('organizer.details.matchModal.seasonNum').replace('{number}', seasonEntry.season_number);
  const subtitleText = seasonEntry.episode_count ? `${seasonEntry.episode_count} eps` : null;

  return (
    <PosterCard
      className="organizer-match-modal__browser-card"
      imageUrl={posterUrl}
      icon={Clapperboard}
      title={displayTitle}
      subtitle={subtitleText}
      onClick={() => onSelect(seasonEntry)}
      disabled={isBrowserLoading}
      active={isActive}
      aspect="poster"
      badge={
        isActive ? (
          <Badge family="status" variant="overlay" tone="accent" className="ui-status-badge ui-status-badge--accent ui-status-badge--overlay">
            {t('organizer.details.matchModal.current')}
          </Badge>
        ) : null
      }
    />
  );
}

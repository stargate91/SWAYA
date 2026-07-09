import { useRef, useEffect } from 'react';
import { Check } from '@/ui/icons';
import { ENTITY_ICONS } from '@/ui/icons';
import Badge from '../../../ui/Badge';
import PosterCard from '../../../ui/PosterCard';
import MetaRow from '../../../ui/MetaRow';
import Button from '../../../ui/Button';
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';

const getImageUrl = (path, size = TMDB_IMAGE_SIZES.thumbnail) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    const url = path.startsWith('//') ? `https:${path}` : path;
    return `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return buildTmdbImageUrl(path, size);
};

export default function MatchEpisodeCard({
  episodeEntry,
  isBucketed,
  isDisabled,
  onSelect,
  onToggle,
  isActive = false,
  isHighlighted = false,
  t,
}) {
  const stillUrl = getImageUrl(episodeEntry.still_path, TMDB_IMAGE_SIZES.thumbnail);
  const cardRef = useRef();

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  const subtitleNode = (
    <div className="organizer-match-modal__browser-card-meta-row">
      <MetaRow
        className="organizer-match-modal__browser-card-meta"
        items={[
          `E${episodeEntry.episode_number}`,
          episodeEntry.air_date ? String(episodeEntry.air_date).slice(0, 10) : null,
        ]}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="organizer-match-modal__select-button"
        onClick={() => onSelect(episodeEntry)}
        disabled={isDisabled}
      >
        {t('common.select')}
      </Button>
    </div>
  );

  const badgeNode = (
    <>
      {isBucketed && (
        <div className="organizer-match-modal__browser-card-bucket-indicator">
          <Check size={12} strokeWidth={3} />
        </div>
      )}
      {isActive && (
        <Badge family="status" variant="overlay" tone="accent" className="ui-status-badge ui-status-badge--accent ui-status-badge--overlay">
          {t('organizer.details.matchModal.current')}
        </Badge>
      )}
    </>
  );

  return (
    <div
      ref={cardRef}
      className={`organizer-match-modal__browser-card organizer-match-modal__browser-card--episode${isBucketed ? ' is-selected' : ''}${isHighlighted ? ' is-highlighted' : ''}`.trim()}
    >
      <PosterCard
        imageUrl={stillUrl}
        icon={ENTITY_ICONS.episode}
        title={episodeEntry.name || t('organizer.details.matchModal.episodeNum').replace('{number}', episodeEntry.episode_number)}
        subtitle={subtitleNode}
        onClick={() => onToggle(episodeEntry.episode_number)}
        disabled={isDisabled}
        active={isActive}
        aspect="landscape"
        badge={badgeNode}
      />
    </div>
  );
}

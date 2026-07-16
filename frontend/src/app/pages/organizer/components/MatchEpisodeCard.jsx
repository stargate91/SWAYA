import { useRef, useEffect } from 'react';
import { Check } from '@/ui/icons';
import { ENTITY_ICONS } from '@/ui/icons';
import Badge from '../../../ui/Badge';
import PosterCard from '../../../ui/PosterCard';
import CardMetadata from '../../../ui/CardMetadata';
import Button from '../../../ui/Button';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import styles from './MatchEpisodeCard.module.css';
import Inline from '../../../ui/Inline';

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
  const stillUrl = resolveMediaImageUrl(episodeEntry.still_path, 'thumbnail');
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
    <Inline align="center" gap="sm" justify="between" className={styles['meta-row']}>
      <CardMetadata.Row
        items={[
          `E${episodeEntry.episode_number}`,
          episodeEntry.air_date ? String(episodeEntry.air_date).slice(0, 10) : null,
        ]}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={styles['select-button']}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(episodeEntry);
        }}
        disabled={isDisabled}
      >
        {t('common.select') || 'Select'}
      </Button>
    </Inline>
  );

  const badgeNode = (
    <>
      {isBucketed && (
        <div className={styles['bucket-indicator']}>
          <Check size={12} strokeWidth={3} />
        </div>
      )}
      {isActive && (
        <Badge family="status" variant="overlay" tone="accent">
          {t('organizer.details.matchModal.current')}
        </Badge>
      )}
    </>
  );

  return (
    <PosterCard
      ref={cardRef}
      imageUrl={stillUrl}
      icon={ENTITY_ICONS.episode}
      title={episodeEntry.name || t('organizer.details.matchModal.episodeNum').replace('{number}', episodeEntry.episode_number)}
      subtitle={subtitleNode}
      onClick={() => onToggle(episodeEntry.episode_number)}
      disabled={isDisabled}
      active={isHighlighted}
      selected={isBucketed}
      aspect="landscape"
      fluid={true}
      overlay={badgeNode}
    />
  );
}

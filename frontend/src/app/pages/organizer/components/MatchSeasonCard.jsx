import { Clapperboard } from '@/ui/icons';
import Badge from '../../../ui/Badge';
import PosterCard from '../../../ui/PosterCard';
import CardMetadata from '../../../ui/CardMetadata';
import { resolveMediaImageUrl } from '@/lib/imageUrls';

export default function MatchSeasonCard({
  seasonEntry,
  isBrowserLoading,
  onSelect,
  isActive = false,
  t,
}) {
  const posterUrl = resolveMediaImageUrl(seasonEntry.poster_path, 'posterThumb');
  const displayTitle = seasonEntry.name || t('organizer.details.matchModal.seasonNum').replace('{number}', seasonEntry.season_number);
  
  const year = seasonEntry.air_date ? String(seasonEntry.air_date).slice(0, 4) : null;
  const eps = seasonEntry.episode_count ? `${seasonEntry.episode_count} eps` : null;

  return (
    <PosterCard
      imageUrl={posterUrl}
      icon={Clapperboard}
      title={displayTitle}
      subtitle={
        <CardMetadata.Row
          items={[year, eps]}
        />
      }
      onClick={() => onSelect(seasonEntry)}
      disabled={isBrowserLoading}
      active={isActive}
      aspect="poster"
      fluid={true}
      overlay={
        isActive ? (
          <Badge family="status" variant="overlay" tone="accent">
            {t('organizer.details.matchModal.current')}
          </Badge>
        ) : null
      }
    />
  );
}

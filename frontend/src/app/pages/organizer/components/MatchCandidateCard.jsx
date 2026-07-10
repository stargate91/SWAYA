import { useState } from 'react';
import { ENTITY_ICONS } from '@/ui/icons';
import Badge from '@/ui/Badge';
import CardMetadata from '@/ui/CardMetadata';
import PosterCard from '@/ui/PosterCard';
import CompactCard from '@/ui/CompactCard';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { MEDIA_TYPES, isTvLikeMediaType, toMetadataMediaType } from '@/lib/mediaTypes';

const getDisplayTitle = (candidate, mediaType, t) => (
  candidate?.title
  || candidate?.name
  || candidate?.original_title
  || candidate?.original_name
  || (mediaType === MEDIA_TYPES.TV ? t('organizer.details.matchModal.unknownTv') : t('organizer.details.matchModal.unknownMovie'))
);

const getDisplayYear = (candidate, mediaType) => {
  const rawDate = mediaType === MEDIA_TYPES.TV
    ? (candidate?.first_air_date || candidate?.release_date)
    : candidate?.release_date;
  if (!rawDate) return null;
  const startYear = String(rawDate).slice(0, 4);

  if (mediaType === MEDIA_TYPES.TV) {
    const lastAirDate = candidate?.last_air_date;
    const statusClean = (candidate?.status || candidate?.release_status || '').toLowerCase();
    const isEnded = statusClean === 'ended' || statusClean === 'canceled';
    if (isEnded && lastAirDate) {
      const endYear = String(lastAirDate).slice(0, 4);
      if (startYear !== endYear) {
        return `${startYear} - ${endYear}`;
      }
    }
    return startYear;
  }
  return startYear;
};

export default function MatchCandidateCard({
  candidate,
  sourceLabel,
  variant = 'list',
  mode,
  isResolvingId,
  isBrowserLoading,
  onSelect,
  t,
  rowStatus,
}) {
  const mediaType = mode === 'scene' ? 'scene' : toMetadataMediaType(candidate.type || candidate.media_type, mode);
  const displayTitle = getDisplayTitle(candidate, mediaType, t);
  const displayYear = mediaType === 'scene'
    ? (candidate.release_date ? String(candidate.release_date).slice(0, 10) : null)
    : getDisplayYear(candidate, mediaType);
  const candidateId = candidate.tmdb_id || candidate.id;
  const posterUrl = resolveMediaImageUrl(candidate.poster_path, mediaType === 'scene' ? 'backdrop' : 'poster');
  const isDisabled = isResolvingId === candidateId || isBrowserLoading;
  const [prevPosterUrl, setPrevPosterUrl] = useState(posterUrl);

  if (posterUrl !== prevPosterUrl) {
    setPrevPosterUrl(posterUrl);
  }

  if (variant === 'poster') {
    return (
      <PosterCard
        key={`${sourceLabel}-${candidateId}`}
        className={`organizer-match-modal__poster-card${mediaType === 'scene' ? ' is-scene' : ''}`}
        aspect={mediaType === 'scene' ? 'landscape' : 'poster'}
        active={candidate.is_active}
        imageUrl={posterUrl}
        icon={mediaType === 'tv' ? ENTITY_ICONS.tv : (mediaType === 'scene' ? ENTITY_ICONS.episode : ENTITY_ICONS.movie)}
        onClick={() => onSelect(candidate)}
        disabled={isDisabled}
        title={displayTitle}
        subtitle={
          <CardMetadata.Row
            className="organizer-match-modal__poster-card-meta"
            items={[
              displayYear,
              mediaType === 'scene' ? t('organizer.details.matchModal.scene') : (isTvLikeMediaType(mediaType) ? t('organizer.details.matchModal.tv') : t('organizer.details.matchModal.movie')),
            ]}
          />
        }
        badge={
          candidate.is_active ? (
            rowStatus === 'uncertain' ? (
              <Badge family="status" variant="overlay" tone="warning">
                {t('organizer.status.uncertain')}
              </Badge>
            ) : (
              <Badge family="status" variant="overlay" tone="accent">
                {t('organizer.details.matchModal.current')}
              </Badge>
            )
          ) : null
        }
      />
    );
  }

  const fallbackIcon = mediaType === 'tv'
    ? ENTITY_ICONS.tv
    : (mediaType === 'scene' ? ENTITY_ICONS.episode : ENTITY_ICONS.movie);

  const activeBadge = candidate.is_active ? (
    rowStatus === 'uncertain' ? (
      <Badge family="status" tone="warning" variant="inline">
        {t('organizer.status.uncertain')}
      </Badge>
    ) : (
      <Badge family="status" tone="accent" variant="inline">
        {t('organizer.details.matchModal.current')}
      </Badge>
    )
  ) : null;

  const rightAction = isResolvingId === candidateId ? (
    <span className="organizer-match-modal__result-action">
      {t('organizer.details.matchModal.applying')}
    </span>
  ) : null;

  return (
    <CompactCard
      key={`${sourceLabel}-${candidateId}`}
      imageUrl={posterUrl}
      fallbackIcon={fallbackIcon}
      aspect={mediaType === 'scene' ? 'landscape' : 'poster'}
      title={displayTitle}
      badge={activeBadge}
      active={candidate.is_active}
      disabled={isDisabled}
      onClick={() => onSelect(candidate)}
      className={mediaType === 'scene' ? 'is-scene' : ''}
      meta={
        <CardMetadata.Row
          className="organizer-match-modal__result-meta"
          items={[
            displayYear,
            mediaType === 'scene' ? t('organizer.details.matchModal.scene') : (isTvLikeMediaType(mediaType) ? t('organizer.details.matchModal.tv') : t('organizer.details.matchModal.movie')),
          ]}
        />
      }
      description={candidate.overview}
      rightElement={rightAction}
    />
  );
}

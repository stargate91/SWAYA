import { ChevronRight, ChevronLeft, Check, Eye, Play, Clapperboard, Star, Droplets } from '@/ui/icons';
import Pill from '@/ui/Pill';
import PosterCard from '@/ui/PosterCard';
import IconButton from '@/ui/IconButton';
import Stack from '@/ui/Stack';
import Inline from '@/ui/Inline';
import Text from '@/ui/Text';
import EmptyState from '@/ui/EmptyState';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { formatEpisodeNumber } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';
import styles from './BespokeEpisodeDetail.module.css';

export default function BespokeEpisodeDetail({
  activeEpisode,
  activeEpisodeIndex,
  episodes,
  stepEpisode,
  handleOpenLightbox
}) {
  const { state, mutations, t } = useMediaDetailContext();
  const { item, cleanId } = state;
  const { updateStatusMutation, playMutation, addPeakMutation } = mutations;

  if (!activeEpisode) {
    return (
      <div className={styles.body}>
        <EmptyState
          size="sm"
          background="none"
          border="none"
          title={item?.progressive_seasons && activeEpisode === false
            ? (t('library.details.loadingSeason') || 'Loading season...')
            : (t('library.details.noEpisodesFound') || 'No episodes found.')
          }
        />
      </div>
    );
  }

  const getStillUrl = (path) => path ? resolveMediaImageUrl(path, 'still') : '';
  const getOriginalStillUrl = (path) => path ? resolveMediaImageUrl(path, 'originalStill') : '';

  const metaItems = [
    activeEpisode.air_date && String(activeEpisode.air_date).slice(0, 10),
    (activeEpisode.runtime || activeEpisode.technical?.duration) && (
      activeEpisode.runtime
        ? `${activeEpisode.runtime}m`
        : `${Math.round(activeEpisode.technical.duration / 60)}m`
    ),
    activeEpisode.technical?.resolution,
    activeEpisode.technical?.video_codec,
    activeEpisode.technical?.hdr_type
  ].filter(Boolean);

  return (
    <div className={styles.body}>
      {/* Overlaid Nav Chevrons */}
      {activeEpisodeIndex > 0 && (
        <button
          type="button"
          className="ui-carousel-arrow is-left"
          onClick={() => stepEpisode('left')}
          title={t('library.details.previousEpisode') || 'Previous Episode'}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {activeEpisodeIndex < episodes.length - 1 && (
        <button
          type="button"
          className="ui-carousel-arrow is-right"
          onClick={() => stepEpisode('right')}
          title={t('library.details.nextEpisode') || 'Next Episode'}
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Cinematic 16:9 Still */}
      <PosterCard
        className={styles.still}
        size="17.3125rem"
        fillHeight={true}
        aspect="landscape"
        imageUrl={getStillUrl(activeEpisode.still_path)}
        onClick={getStillUrl(activeEpisode.still_path) ? () => handleOpenLightbox(getOriginalStillUrl(activeEpisode.still_path)) : undefined}
        icon={Clapperboard}
        disableHoverAnimation={true}
        playOverlay={activeEpisode.path && !activeEpisode.is_missing ? {
          onClick: (e) => {
            e.stopPropagation();
            playMutation.mutate(activeEpisode.id);
          },
          label: t('library.details.playEpisode') || 'Play Episode',
          icon: <Play size={20} fill="currentColor" />,
        } : null}
      />

      {/* Right Column: Metadata & Copy */}
      <Stack
        gap="2xs"
        scrollable
        className="u-pt-xs u-pr-sm"
      >
        <Inline
          justify="between"
          align="center"
          gap="md"
          fullWidth
          className="u-wrap-none"
        >
          <Text as="h4" variant="display" weight="bold" truncate>
            {/* eslint-disable-next-line react/jsx-no-literals */}
            {`${formatEpisodeNumber(activeEpisode.episode_number)}. ${activeEpisode.title || `Episode ${activeEpisode.episode_number}`}`}
          </Text>

          <Inline gap="sm" align="center">
            {/* Flame/Peak button */}
            {item.is_adult && activeEpisode.path && !activeEpisode.is_missing && (
              <IconButton
                variant="ghost"
                size="sm"
                wrapped
                className="u-hover-no-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  addPeakMutation.mutate({ itemId: activeEpisode.id, tvId: cleanId });
                }}
                disabled={addPeakMutation.isPending}
                title={t('library.details.addPeak') || 'Add Peak'}
              >
                <Droplets size={15} color="var(--color-state-danger)" />
              </IconButton>
            )}

            {/* Watch toggle */}
            <IconButton
              variant={activeEpisode.is_watched ? 'success' : 'ghost'}
              size="sm"
              wrapped
              className="u-hover-no-transform"
              onClick={() =>
                updateStatusMutation.mutate({
                  itemId: activeEpisode.id,
                  tvId: cleanId,
                  payload: {
                    is_watched: !activeEpisode.is_watched,
                    media_type: 'episode',
                  },
                })
              }
              title={activeEpisode.is_watched ? 'Mark unwatched' : 'Mark watched'}
            >
              {activeEpisode.is_watched ? <Check size={15} /> : <Eye size={15} />}
            </IconButton>
          </Inline>
        </Inline>

        {/* Episode Meta details */}
        <Inline gap="xs" align="center">
          {metaItems.map((meta, idx) => {
            const bullet = '•';
            return (
              <Inline key={meta} gap="xs" align="center">
                {idx > 0 && (
                  <Text variant="small" color="muted" className="u-opacity-60">
                    {bullet}
                  </Text>
                )}
                <Text variant="small" color="muted">
                  {meta}
                </Text>
              </Inline>
            );
          })}
          {activeEpisode.vote_average != null && activeEpisode.vote_average > 0 && (
            <Pill variant="tmdb">
              <Star size={10} fill="currentColor" strokeWidth={1.8} />
              {parseFloat(activeEpisode.vote_average).toFixed(1)}
            </Pill>
          )}
        </Inline>

        {/* Episode description */}
        {activeEpisode.overview && (
          <Text as="p" variant="small" color="secondary" className={styles.overview}>
            {activeEpisode.overview}
          </Text>
        )}
      </Stack>
    </div>
  );
}

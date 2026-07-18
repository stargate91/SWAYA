import { ChevronRight, ChevronLeft, Check, Eye, Play, Clapperboard, Star, Droplets } from '@/ui/icons';
import Pill from '@/ui/Pill';
import PosterCard from '@/ui/PosterCard';
import IconButton from '@/ui/IconButton';
import Stack from '@/ui/Stack';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { formatEpisodeNumber } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';
import Inline from '@/ui/Inline';
import './BespokeEpisodeDetail.css';

const LPAR = '(';
const RPAR = ')';

export default function BespokeEpisodeDetail({
  activeEpisode,
  activeEpisodeIndex,
  episodes,
  stepEpisode,
  handleOpenLightbox
}) {
  const { state, mutations, t } = useMediaDetailContext();
  const { item, cleanId } = state;
  const { updateStatusMutation, playMutation, addPeakMutation, deletePeakMutation } = mutations;

  if (!activeEpisode) {
    return (
      <div className="bespoke-episode-browser-card__empty">
        {item?.progressive_seasons && activeEpisode === false
          ? (t('library.details.loadingSeason') || 'Loading season...')
          : (t('library.details.noEpisodesFound') || 'No episodes found.')}
      </div>
    );
  }

  const getStillUrl = (path) => path ? resolveMediaImageUrl(path, 'still') : '';
  const getOriginalStillUrl = (path) => path ? resolveMediaImageUrl(path, 'originalStill') : '';

  return (
    <div className="bespoke-browser-card__body bespoke-browser-card__body--episode">
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
        className="bespoke-episode-detail-card__still"
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
        className="bespoke-episode-detail-card__content-col"
      >
        <Inline
          justify="between"
          align="center"
          gap="md"
          fullWidth
          className="bespoke-episode-detail-card__header"
        >
          <h4 className="bespoke-episode-detail-card__title">
            {/* eslint-disable-next-line react/jsx-no-literals */}
            {`${formatEpisodeNumber(activeEpisode.episode_number)}. ${activeEpisode.title || `Episode ${activeEpisode.episode_number}`
              }`}
          </h4>

          <Inline gap="sm" align="center" className="bespoke-episode-detail-card__actions">
            {/* Flame/Peak button */}
            {item.is_adult && activeEpisode.path && !activeEpisode.is_missing && (
              <IconButton
                variant="ghost"
                size="sm"
                wrapped
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
        <Inline gap="md" align="center" className="bespoke-episode-detail-card__meta">
          {activeEpisode.air_date && (
            <span className="bespoke-episode-detail-card__meta-item">
              {String(activeEpisode.air_date).slice(0, 10)}
            </span>
          )}
          {(activeEpisode.runtime || activeEpisode.technical?.duration) && (
            <span className="bespoke-episode-detail-card__meta-item">
              {activeEpisode.runtime
                ? `${activeEpisode.runtime}m`
                : `${Math.round(activeEpisode.technical.duration / 60)}m`}
            </span>
          )}
          {activeEpisode.technical?.resolution && (
            <span className="bespoke-episode-detail-card__meta-item">
              {activeEpisode.technical.resolution}
            </span>
          )}
          {activeEpisode.technical?.video_codec && (
            <span className="bespoke-episode-detail-card__meta-item">
              {activeEpisode.technical.video_codec}
            </span>
          )}
          {activeEpisode.technical?.hdr_type && (
            <span className="bespoke-episode-detail-card__meta-item">
              {activeEpisode.technical.hdr_type}
            </span>
          )}
          {activeEpisode.vote_average != null && activeEpisode.vote_average > 0 && (
            <Pill variant="tmdb">
              <Star size={10} fill="currentColor" strokeWidth={1.8} />
              {parseFloat(activeEpisode.vote_average).toFixed(1)}
            </Pill>
          )}
        </Inline>

        {/* Episode description */}
        {activeEpisode.overview && (
          <p className="bespoke-episode-detail-card__overview">
            {activeEpisode.overview}
          </p>
        )}
      </Stack>
    </div>
  );
}

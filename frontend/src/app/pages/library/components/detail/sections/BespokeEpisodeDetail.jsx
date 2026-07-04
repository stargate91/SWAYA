import { ChevronRight, ChevronLeft, Check, Eye, Play, Clapperboard, Star, Flame, Trash2 } from 'lucide-react';
import IconButton from '@/ui/IconButton';
import Pill from '@/ui/Pill';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { formatEpisodeNumber, formatTime } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';

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
      <button
        type="button"
        className="bespoke-card-nav bespoke-card-nav--left"
        disabled={activeEpisodeIndex <= 0}
        onClick={() => stepEpisode('left')}
        title="Previous Episode"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        type="button"
        className="bespoke-card-nav bespoke-card-nav--right"
        disabled={activeEpisodeIndex >= episodes.length - 1}
        onClick={() => stepEpisode('right')}
        title="Next Episode"
      >
        <ChevronRight size={24} />
      </button>

      {/* Left Column: Large Cinematic 16:9 Still */}
      <div className="bespoke-episode-detail-card__still-col">
        <div
          className={`bespoke-episode-detail-card__still-wrapper ${getStillUrl(activeEpisode.still_path) ? 'is-clickable' : ''}`}
          role="button"
          tabIndex={getStillUrl(activeEpisode.still_path) ? 0 : -1}
          onKeyDown={(e) => {
            if (getStillUrl(activeEpisode.still_path) && (e.key === 'Enter' || e.key === ' ')) {
              handleOpenLightbox(getOriginalStillUrl(activeEpisode.still_path));
            }
          }}
          onClick={() => {
            if (getStillUrl(activeEpisode.still_path)) {
              handleOpenLightbox(getOriginalStillUrl(activeEpisode.still_path));
            }
          }}
        >
          {getStillUrl(activeEpisode.still_path) ? (
            <img
              src={getStillUrl(activeEpisode.still_path)}
              alt={activeEpisode.title}
              className="bespoke-episode-detail-card__still"
            />
          ) : (
            <div className="bespoke-episode-detail-card__still-placeholder">
              <Clapperboard size={48} />
            </div>
          )}

          {activeEpisode.path && !activeEpisode.is_missing && (
            <IconButton
              variant="play-overlay"
              onClick={(e) => {
                e.stopPropagation();
                playMutation.mutate(activeEpisode.id);
              }}
              title="Play episode"
            >
              <Play size={20} fill="currentColor" />
            </IconButton>
          )}
        </div>
      </div>

      {/* Right Column: Metadata & Copy */}
      <div className="bespoke-episode-detail-card__content-col">
        <div className="bespoke-episode-detail-card__header">
          <h4 className="bespoke-episode-detail-card__title">
            {/* eslint-disable-next-line react/jsx-no-literals */}
            {`${formatEpisodeNumber(activeEpisode.episode_number)}. ${
              activeEpisode.title || `Episode ${activeEpisode.episode_number}`
            }`}
          </h4>

          <div className="bespoke-episode-detail-card__actions">
            {/* Flame/Peak button */}
            {item.is_adult && activeEpisode.path && !activeEpisode.is_missing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addPeakMutation.mutate(activeEpisode.id);
                }}
                disabled={addPeakMutation.isPending}
                className="bespoke-action-btn bespoke-action-btn--peak"
                title={t('library.details.addPeak') || 'Add Peak'}
              >
                <Flame size={15} />
              </button>
            )}

            {/* Watch toggle */}
            <button
              type="button"
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
              className={`bespoke-action-btn bespoke-action-btn--watch ${
                activeEpisode.is_watched ? 'is-watched' : ''
              }`}
              title={activeEpisode.is_watched ? 'Mark unwatched' : 'Mark watched'}
            >
              {activeEpisode.is_watched ? <Check size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Episode Meta details */}
        <div className="bespoke-episode-detail-card__meta">
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
            <Pill variant="tmdb" className="bespoke-episode-detail-card__tmdb-pill">
              <Star size={10} fill="currentColor" strokeWidth={1.8} />
              {parseFloat(activeEpisode.vote_average).toFixed(1)}
            </Pill>
          )}
        </div>

        {/* Episode description */}
        {activeEpisode.overview && (
          <p className="bespoke-episode-detail-card__overview">
            {activeEpisode.overview}
          </p>
        )}

        {/* Adult Peaks History */}
        {item.is_adult && activeEpisode.peaks_history && activeEpisode.peaks_history.length > 0 && (
          <div className="bespoke-episode-detail-card__peaks">
            <div className="bespoke-episode-detail-card__peaks-title">
              <Flame size={12} fill="currentColor" />
              <span>{t('library.details.peaksTitle') || 'Peak Moments'} {LPAR}{activeEpisode.peaks_history.length}{RPAR}</span>
            </div>
            <div className="bespoke-episode-detail-card__peaks-list">
              {activeEpisode.peaks_history.map((log) => (
                <div key={log.id} className="bespoke-episode-detail-card__peak-item">
                  <span className="bespoke-episode-detail-card__peak-date">
                    {new Date(log.watched_at).toLocaleDateString()}
                  </span>
                  {log.video_position != null && (
                    <span className="bespoke-episode-detail-card__peak-position">
                      {formatTime(log.video_position)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="bespoke-episode-detail-card__peak-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePeakMutation.mutate({ itemId: activeEpisode.id, logId: log.id });
                    }}
                    disabled={deletePeakMutation.isPending}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

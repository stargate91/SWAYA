import React from 'react';
import { Play, RotateCcw, X, HelpCircle, Star, Tv, Clapperboard, Flame } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import SegmentedRating from '@/ui/SegmentedRating';

export default function PlayerEndOverlay({
  t,
  title,
  nextEpisode,
  countdown,
  userRating,
  hoverRating,
  ratingText,
  starSymbol,
  peaksCount,
  collectionNext,
  performerUnwatched,
  studioUnwatched,
  surpriseMe,
  mediaType,
  isAdult,
  handlePlayNext,
  setNextEpisode,
  setHoverRating,
  handleRate,
  handleReplay,
  handleClose,
}) {


  // Helper to open/play recommended item
  const playItem = (targetId) => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('mpv-open-fullscreen', { itemId: targetId });
    } catch {
      window.location.href = `/player/${targetId}`;
    }
  };

  const isTv = mediaType === 'episode' || mediaType === 'tv';
  const isScene = isAdult || mediaType === 'scene';

  return (
    <div className="player-page__end-overlay active">
      {/* 1. Left Drawer: Feedback & Rating */}
      <div className="player-page__end-drawer player-page__end-drawer--left">
        <div className="player-page__drawer-header">
          <div className="player-page__drawer-tag">{t('player.finished_watching', { defaultValue: 'Finished watching' })}</div>
          <h2 className="player-page__drawer-title">{title}</h2>
        </div>

        {/* Segmented Rater */}
        <div className="player-page__segmented-rater-container">
          <label className="player-page__rater-label">
            {t('player.rate_title', { defaultValue: 'Rate this title' })}
          </label>
          <SegmentedRating
            value={userRating}
            onChange={handleRate}
            t={t}
          />
        </div>

        {/* Scene specific Peaks statistics */}
        {isScene && peaksCount > 0 && (
          <div className="player-page__peaks-stats">
            <Flame size={18} className="player-page__peaks-icon" />
            <span>{t('player.peaks_recorded', { count: peaksCount, defaultValue: `You marked ${peaksCount} finish moments in this scene` })}</span>
          </div>
        )}

        {/* Actions (Replay / Close) */}
        <div className="player-page__drawer-footer">
          <button className="player-page__action-btn" onClick={handleReplay}>
            <RotateCcw size={18} />
            <span>{t('player.replay', { defaultValue: 'Replay' })}</span>
          </button>
          <button className="player-page__action-btn player-page__action-btn--danger" onClick={handleClose}>
            <X size={18} />
            <span>{t('player.close_player', { defaultValue: 'Close Player' })}</span>
          </button>
        </div>
      </div>

      {/* 2. Right Drawer: Discovery & Up Next */}
      <div className="player-page__end-drawer player-page__end-drawer--right">
        <h3 className="player-page__discovery-header">
          {t('player.what_to_watch', { defaultValue: 'What to Watch Next' })}
        </h3>

        <div className="player-page__discovery-content">
          {/* TV SHOWS: Up Next Episode */}
          {isTv && (
            <div className="player-page__tv-next">
              {nextEpisode ? (
                <div className="player-page__card player-page__card--hero" onClick={handlePlayNext}>
                  <div className="player-page__card-badge">{t('player.up_next', { defaultValue: 'Up Next' })}</div>
                  <div className="player-page__card-media">
                    <Tv size={48} className="player-page__card-placeholder-icon" />
                  </div>
                  <div className="player-page__card-meta">
                    <div className="player-page__card-title">{nextEpisode.title}</div>
                    <div className="player-page__card-countdown">
                      {t('player.starting_in', { count: countdown, defaultValue: `Starting in ${countdown}s...` })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="player-page__no-next-msg">
                  <p>{t('player.no_more_episodes', { defaultValue: "You've caught up with this show!" })}</p>
                  {surpriseMe && (
                    <button className="player-page__discover-btn" onClick={() => playItem(surpriseMe.id)}>
                      <Flame size={16} />
                      <span>{t('player.surprise_me', { defaultValue: 'Surprise Me' })}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MOVIES: Collection Next & Surprise Me */}
          {!isTv && !isScene && (
            <div className="player-page__discovery-grid">
              {collectionNext && (
                <div className="player-page__card" onClick={() => playItem(collectionNext.id)}>
                  <div className="player-page__card-badge">{t('player.next_in_collection', { defaultValue: 'Next in Collection' })}</div>
                  <div className="player-page__card-media">
                    {collectionNext.poster_path ? (
                      <img src={resolveMediaImageUrl(collectionNext.poster_path, 'poster')} alt={collectionNext.title} className="player-page__card-img" />
                    ) : (
                      <Clapperboard size={32} />
                    )}
                  </div>
                  <div className="player-page__card-meta">
                    <div className="player-page__card-title">{collectionNext.title}</div>
                  </div>
                </div>
              )}

              {surpriseMe && (
                <div className="player-page__card player-page__card--surprise" onClick={() => playItem(surpriseMe.id)}>
                  <div className="player-page__card-badge">{t('player.surprise_me_label', { defaultValue: 'Surprise Me' })}</div>
                  <div className="player-page__card-media">
                    {surpriseMe.poster_path ? (
                      <img src={resolveMediaImageUrl(surpriseMe.poster_path, surpriseMe.media_type === 'scene' ? 'backdrop' : 'poster')} alt={surpriseMe.title} className="player-page__card-img" />
                    ) : (
                      <HelpCircle size={40} />
                    )}
                  </div>
                  <div className="player-page__card-meta">
                    <div className="player-page__card-title">{surpriseMe.title}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCENES (NSFW): Cast, Studio & Surprise Me */}
          {isScene && (
            <div className="player-page__discovery-grid player-page__discovery-grid--three">
              {performerUnwatched && (
                <div className="player-page__card player-page__card--16-9" onClick={() => playItem(performerUnwatched.id)}>
                  <div className="player-page__card-badge">{t('player.more_from_performer', { defaultValue: 'More Performer' })}</div>
                  <div className="player-page__card-media">
                    {performerUnwatched.poster_path ? (
                      <img src={resolveMediaImageUrl(performerUnwatched.poster_path, 'backdrop')} alt={performerUnwatched.title} className="player-page__card-img" />
                    ) : (
                      <Flame size={32} />
                    )}
                  </div>
                  <div className="player-page__card-meta">
                    <div className="player-page__card-title">{performerUnwatched.title}</div>
                  </div>
                </div>
              )}

              {studioUnwatched && (
                <div className="player-page__card player-page__card--16-9" onClick={() => playItem(studioUnwatched.id)}>
                  <div className="player-page__card-badge">{t('player.more_from_studio', { defaultValue: 'More Studio' })}</div>
                  <div className="player-page__card-media">
                    {studioUnwatched.poster_path ? (
                      <img src={resolveMediaImageUrl(studioUnwatched.poster_path, 'backdrop')} alt={studioUnwatched.title} className="player-page__card-img" />
                    ) : (
                      <Flame size={32} />
                    )}
                  </div>
                  <div className="player-page__card-meta">
                    <div className="player-page__card-title">{studioUnwatched.title}</div>
                  </div>
                </div>
              )}

              {surpriseMe && (
                <div className="player-page__card player-page__card--surprise player-page__card--16-9" onClick={() => playItem(surpriseMe.id)}>
                  <div className="player-page__card-badge">{t('player.surprise_me_label', { defaultValue: 'Surprise Me' })}</div>
                  <div className="player-page__card-media">
                    {surpriseMe.poster_path ? (
                      <img src={resolveMediaImageUrl(surpriseMe.poster_path, 'backdrop')} alt={surpriseMe.title} className="player-page__card-img" />
                    ) : (
                      <HelpCircle size={32} />
                    )}
                  </div>
                  <div className="player-page__card-meta">
                    <div className="player-page__card-title">{surpriseMe.title}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

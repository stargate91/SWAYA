import React from 'react';
import { Play, RotateCcw, X, HelpCircle, Tv, Clapperboard, Flame, Gift } from '@/ui/icons';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import SegmentedRating from '@/ui/SegmentedRating';

export default function PlayerEndOverlay({
  t,
  title,
  nextEpisode,
  firstEpisode,
  episodeNumber,
  countdown,
  userRating,
  peaksCount,
  collectionNext,
  performerUnwatched,
  studioUnwatched,
  surpriseMe,
  mediaType,
  mediaImage,
  isAdult,
  tvShowId,
  tvShowTitle,
  tvShowPoster,
  tvShowRating,
  seasonNumber,
  seasonPoster,
  handlePlayNext,
  handleRate,
  handleReplay,
  handleClose,
}) {


  const [showSurprise, setShowSurprise] = React.useState(false);

  const backendPort = window.location.search.match(/backend_port=(\d+)/)?.[1] || '8000';

  // Left drawer: current episode media image
  const mediaStillSrc = React.useMemo(() => {
    if (mediaImage) return mediaImage;
    return null;
  }, [mediaImage]);
  const [mediaStillError, setMediaStillError] = React.useState(false);
  React.useEffect(() => { setMediaStillError(false); }, [mediaImage]);

  // Right drawer: next episode still
  const nextStillSrc = React.useMemo(() => {
    if (nextEpisode?.still_path) {
      return resolveMediaImageUrl(nextEpisode.still_path, 'still', `http://localhost:${backendPort}`);
    }
    return null;
  }, [nextEpisode, backendPort]);
  const [nextStillError, setNextStillError] = React.useState(false);
  React.useEffect(() => { setNextStillError(false); }, [nextEpisode]);

  // Helper to open/play recommended item
  const playItem = (targetId) => {
    try {
      const { ipcRenderer } = window.require('electron');
      const savedVolume = parseInt(localStorage.getItem('player_volume'), 10);
      const savedMute = localStorage.getItem('player_mute') === 'true';
      ipcRenderer.invoke('mpv-open-fullscreen', {
        itemId: targetId,
        volume: isNaN(savedVolume) ? undefined : savedVolume,
        mute: savedMute,
      }).catch(() => {
        // Swallow IPC promise rejection
      });
    } catch {
      window.location.href = `/player/${targetId}`;
    }
  };

  const isTv = mediaType === 'episode' || mediaType === 'tv';
  const isScene = mediaType === 'scene';
  const activeMovie = (!collectionNext || showSurprise) ? surpriseMe : collectionNext;
  const isDiscoveryEmpty = isTv 
    ? !nextEpisode 
    : (isScene 
        ? (!performerUnwatched && !studioUnwatched && !surpriseMe) 
        : !activeMovie);

  // Resolve episode number from prop or parse from title as fallback
  const parsedEpMatch = title.match(/E(\d{2})/i);
  const resolvedEpisodeNum = episodeNumber ?? (parsedEpMatch ? parseInt(parsedEpMatch[1], 10) : null);

  // Clean the title for TV episodes to prevent redundancy (e.g. Relic Hunter - E06 - Diamond in the Rough -> Diamond in the Rough)
  let displayTitle = title;
  if (tvShowId && tvShowTitle) {
    let clean = title;
    if (clean.startsWith(tvShowTitle)) {
      clean = clean.substring(tvShowTitle.length).trim();
    }
    clean = clean.replace(/^[\s-&_—]+/, '').trim();
    clean = clean.replace(/S?\d{2}E\d{2}/i, '').trim();
    clean = clean.replace(/E\d{2}/i, '').trim();
    clean = clean.replace(/^[\s-&_—]+/, '').trim();
    displayTitle = clean;
  }

  return (
    <div className="player-page__end-overlay active">
      {/* 1. Left Drawer: Feedback & Rating */}
      <div className="player-page__end-drawer player-page__end-drawer--left">
        <div className="player-page__drawer-header">
          <div className="player-page__drawer-tag">{t('player.finished_watching', { defaultValue: 'Finished watching' })}</div>
          <h2 className="player-page__drawer-title">
            {tvShowTitle ? `${tvShowTitle} - ${displayTitle}` : displayTitle}
          </h2>
        </div>

        <div className="player-page__drawer-content">
          <div className="player-page__drawer-media-container">
            <div className={`player-page__card player-page__card--static ${(mediaType === 'episode' || mediaType === 'scene') ? 'player-page__card--hero' : 'player-page__card--single'}`} style={{ width: '100%' }}>
              <div className="player-page__card-media">
                {mediaStillSrc && !mediaStillError ? (
                  <img 
                    src={mediaStillSrc} 
                    alt={title} 
                    className="player-page__card-img" 
                    onError={() => setMediaStillError(true)}
                  />
                ) : (
                  <div className="player-page__card-still-placeholder">
                    <Clapperboard size={48} />
                  </div>
                )}
                {resolvedEpisodeNum !== null && resolvedEpisodeNum !== undefined && (
                  <div className="player-page__episode-badge">
                    {resolvedEpisodeNum}
                  </div>
                )}
              </div>
            </div>
          </div>

          {tvShowId && (
            <div className="player-page__tv-season-context">
              <span className="player-page__tv-season-label-top">
                {t('player.watching_season_top', { defaultValue: 'You are watching this season' })}
              </span>
              <h3 className="player-page__tv-season-title-top">
                {t('player.season_number', { defaultValue: 'Season {{season}}', season: seasonNumber })}
              </h3>
            </div>
          )}

          {/* Segmented Rater */}
          {!tvShowId ? (
            <div className="player-page__segmented-rater-container">
              <SegmentedRating
                value={userRating}
                onChange={handleRate}
                t={t}
                labelUnder={true}
              />
            </div>
          ) : (
            <>
              <hr className="player-page__tv-divider" />
              <div className="player-page__tv-rate-card">
                <span className="player-page__tv-rate-prompt">
                  {t('player.rate_show_prompt', { defaultValue: 'Ready to rate the series?' })}
                </span>
                
                <div className="player-page__tv-rate-split">
                  {(tvShowPoster || seasonPoster) && (
                    <div className="player-page__tv-poster-side">
                      <img src={tvShowPoster || seasonPoster} alt={tvShowTitle} className="player-page__tv-poster" />
                    </div>
                  )}

                  <div className="player-page__tv-details-side">
                    <div className="player-page__segmented-rater-container">
                      <SegmentedRating
                        value={tvShowRating}
                        onChange={handleRate}
                        t={t}
                        labelUnder={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scene specific Peaks statistics */}
        {isScene && isAdult && peaksCount > 0 && (
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
        {!isScene && (
          <div className="player-page__drawer-header">
            <h3 className="player-page__discovery-header">
              {!isTv && activeMovie
                ? (activeMovie === collectionNext
                    ? t('player.continue_collection', { defaultValue: 'Continue your collection' })
                    : t('player.unwatched_movie_recommendation', { defaultValue: "A movie you haven't watched yet" })
                  )
                : t('player.what_to_watch', { defaultValue: 'What to Watch Next' })
              }
            </h3>
            {!isTv && activeMovie && (
              <h2 className="player-page__drawer-title">{activeMovie.title}</h2>
            )}
          </div>
        )}

        <div className={`player-page__discovery-content ${isDiscoveryEmpty ? 'player-page__discovery-content--empty' : ''}`}>
          {/* TV SHOWS: Up Next Episode */}
          {isTv && (
            <div className="player-page__tv-next">
              {nextEpisode ? (
                <div className="player-page__card player-page__card--hero" onClick={handlePlayNext}>
                  <div className="player-page__card-media">
                    {nextStillSrc && !nextStillError ? (
                      <img 
                        src={nextStillSrc} 
                        alt={nextEpisode.title} 
                        className="player-page__card-img" 
                        onError={() => setNextStillError(true)}
                      />
                    ) : (
                      <div className="player-page__card-still-placeholder">
                        <Clapperboard size={48} />
                      </div>
                    )}
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
                  <Tv size={48} className="player-page__card-placeholder-icon" />
                  <p>{t('player.series_completed', { defaultValue: "You've finished this series!" })}</p>
                  {firstEpisode && (
                    <button className="player-page__discover-btn" onClick={() => playItem(firstEpisode.id)}>
                      <RotateCcw size={16} />
                      <span>{t('player.replay_series', { defaultValue: 'Replay Series' })}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MOVIES: Collection Next & Surprise Me (Integrated Single Active Card Layout) */}
          {!isTv && !isScene && activeMovie && (
            <div className="player-page__discovery-container-vertical">
              <div className="player-page__discovery-grid">
                <div className="player-page__card player-page__card--surprise player-page__card--single" onClick={() => playItem(activeMovie.id)}>
                  <div className="player-page__card-media">
                    {activeMovie.poster_path ? (
                      <img 
                        src={resolveMediaImageUrl(activeMovie.poster_path, 'poster')} 
                        alt={activeMovie.title} 
                        className="player-page__card-img" 
                        onError={(e) => { e.target.src = '/no-cover.png'; }}
                      />
                    ) : (
                      <Clapperboard size={40} />
                    )}
                    <div className="player-page__card-play-overlay">
                      <div className="player-page__card-play-btn">
                        <Play size={20} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {activeMovie.overview && (
                <p className="player-page__discovery-overview">
                  {activeMovie.overview.length > 200
                    ? `${activeMovie.overview.substring(0, 200)}...`
                    : activeMovie.overview}
                </p>
              )}
            </div>
          )}

          {!isTv && !isScene && !activeMovie && (
            <div className="player-page__no-next-msg">
              <Clapperboard size={48} className="player-page__card-placeholder-icon" />
              <p>{t('player.all_movies_watched', { defaultValue: "You've watched all your movies!" })}</p>
            </div>
          )}

          {/* SCENES (NSFW): Cast, Studio & Surprise Me */}
          {isScene && !isDiscoveryEmpty && (
            <div className="player-page__discovery-vertical-list">
              {studioUnwatched && (
                <div className="player-page__discovery-section">
                  <h3 className="player-page__discovery-header" style={{ marginBottom: '2px' }}>
                    {t('player.unwatched_studio_recommendation', { 
                      defaultValue: 'FANCY SOME MORE {{studio}}?', 
                      studio: studioUnwatched.studio_name ? studioUnwatched.studio_name.toUpperCase() : 'STUDIO' 
                    })}
                  </h3>
                  <div className="player-page__discovery-item-title" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                    {studioUnwatched.title}
                  </div>
                  <div className="player-page__card player-page__card--16-9" onClick={() => playItem(studioUnwatched.id)}>
                    <div className="player-page__card-media">
                      {studioUnwatched.poster_path ? (
                        <img 
                          src={resolveMediaImageUrl(studioUnwatched.poster_path, 'backdrop')} 
                          alt={studioUnwatched.title} 
                          className="player-page__card-img" 
                          onError={(e) => { e.target.src = '/mockup_still.png'; }}
                        />
                      ) : (
                        <Flame size={32} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {performerUnwatched && (
                <div className="player-page__discovery-section">
                  <h3 className="player-page__discovery-header" style={{ marginBottom: '2px' }}>
                    {t('player.unwatched_performer_recommendation', { 
                      defaultValue: 'CRAVING MORE {{performer}}?', 
                      performer: performerUnwatched.performer_name ? performerUnwatched.performer_name.toUpperCase() : 'PERFORMER' 
                    })}
                  </h3>
                  <div className="player-page__discovery-item-title" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                    {performerUnwatched.title}
                  </div>
                  <div className="player-page__card player-page__card--16-9" onClick={() => playItem(performerUnwatched.id)}>
                    <div className="player-page__card-media">
                      {performerUnwatched.poster_path ? (
                        <img 
                          src={resolveMediaImageUrl(performerUnwatched.poster_path, 'backdrop')} 
                          alt={performerUnwatched.title} 
                          className="player-page__card-img" 
                          onError={(e) => { e.target.src = '/mockup_still.png'; }}
                        />
                      ) : (
                        <Flame size={32} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {surpriseMe && (
                <div className="player-page__discovery-section">
                  <h3 className="player-page__discovery-header" style={{ marginBottom: '2px' }}>
                    {t('player.unwatched_library_recommendation', { 
                      defaultValue: 'SOMETHING UNSEEN FROM YOUR LIBRARY:' 
                    })}
                  </h3>
                  <div className="player-page__discovery-item-title" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                    {surpriseMe.title}
                  </div>
                  <div className="player-page__card player-page__card--surprise player-page__card--16-9" onClick={() => playItem(surpriseMe.id)}>
                    <div className="player-page__card-media">
                      {surpriseMe.poster_path ? (
                        <img 
                          src={resolveMediaImageUrl(surpriseMe.poster_path, 'backdrop')} 
                          alt={surpriseMe.title} 
                          className="player-page__card-img" 
                          onError={(e) => { e.target.src = '/mockup_still.png'; }}
                        />
                      ) : (
                        <HelpCircle size={32} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isScene && isDiscoveryEmpty && (
            <div className="player-page__no-next-msg">
              <Flame size={48} className="player-page__card-placeholder-icon" />
              <p>{t('player.all_scenes_watched', { defaultValue: "You've watched all your scenes!" })}</p>
            </div>
          )}
        </div>

        {!isTv && !isScene && collectionNext && surpriseMe && (
          <div className="player-page__drawer-footer">
            <button className="player-page__action-btn" onClick={() => setShowSurprise(!showSurprise)}>
              {showSurprise ? (
                <>
                  <RotateCcw size={18} />
                  <span>{t('player.show_collection', { defaultValue: 'Back to Collection' })}</span>
                </>
              ) : (
                <>
                  <Gift size={18} />
                  <span>{t('player.surprise_me', { defaultValue: 'Surprise Me' })}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

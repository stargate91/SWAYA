 
export default function PlayerEndOverlay({
  t,
  title,
  nextEpisode,
  countdown,
  userRating,
  hoverRating,
  ratingText,
  starSymbol,
  handlePlayNext,
  setNextEpisode,
  setHoverRating,
  handleRate,
  handleReplay,
  handleClose,
}) {
  return (
    <div className="player-page__end-overlay">
      <div className="player-page__end-card">
        <div className="player-page__end-title">{t('player.finished_watching', { defaultValue: 'Finished watching' })}</div>
        <div className="player-page__end-subtitle">{title}</div>

        {nextEpisode ? (
          <div className="player-page__end-next">
            <div className="player-page__end-next-label">{t('player.up_next', { defaultValue: 'Up Next' })}</div>
            <div className="player-page__end-next-title">{nextEpisode.title}</div>
            <div className="player-page__end-countdown">{t('player.starting_in', { count: countdown, defaultValue: 'Starting in {{count}}s...' })}</div>
            <div className="player-page__end-buttons">
              <button className="player-page__end-btn player-page__end-btn--primary" onClick={handlePlayNext}>
                {t('player.play_now', { defaultValue: 'Play Now' })}
              </button>
              <button className="player-page__end-btn" onClick={() => {
                setNextEpisode(null);
              }}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
            </div>
          </div>
        ) : (
          <div className="player-page__end-rating">
            <div className="player-page__end-rating-label">{t('player.rate_title', { defaultValue: 'Rate this title' })}</div>
            <div className="player-page__end-stars">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  className={`player-page__end-star ${(hoverRating || userRating || 0) >= star ? 'active' : ''}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => handleRate(star)}
                >
                  {starSymbol}
                </button>
              ))}
            </div>
            {userRating && <div className="player-page__end-rating-val">{ratingText}</div>}
          </div>
        )}

        <div className="player-page__end-actions">
          <button className="player-page__end-btn" onClick={handleReplay}>
            {t('player.replay', { defaultValue: 'Replay' })}
          </button>
          <button className="player-page__end-btn player-page__end-btn--danger" onClick={handleClose}>
            {t('player.close_player', { defaultValue: 'Close Player' })}
          </button>
        </div>
      </div>
    </div>
  );
}

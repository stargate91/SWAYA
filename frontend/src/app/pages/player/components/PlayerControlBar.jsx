/* eslint-disable react/forbid-dom-props */
import { Play, Pause, Volume2, VolumeX, Languages, Captions, PictureInPicture2, Square, Rewind, FastForward, SkipBack, SkipForward, Droplets, Minimize2 } from '@/ui/icons';
import Badge from '../../../ui/Badge';

export default function PlayerControlBar({
  t,
  currentTime,
  duration,
  chapters,
  isPaused,
  isMuted,
  volume,
  speed,
  isAdult,
  mediaType,
  justAddedPeak,
  trackList,
  showAudioMenu,
  showSubMenu,
  bottomOffset,
  formatTime,
  handleSeek,
  handleSpeedDown,
  handlePlayPause,
  handleClose,
  handleSpeedUp,
  toggleMute,
  handleVolumeChange,
  handleAddPeak,
  setShowAudioMenu,
  setShowSubMenu,
  handleMinimizePip,
  handleTogglePip,
  sendCommand,
}) {
  const speedText = `${speed}x`;

  return (
    <div className="player-page__bottom" style={bottomOffset > 0 ? { transform: `translateY(-${bottomOffset}px)` } : undefined}>

      {/* Progress Bar */}
      <div className="player-page__progress-container">
        <span className="player-page__time">{formatTime(currentTime)}</span>
        <div className="player-page__slider-wrapper">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="player-page__slider"
          />
          {duration > 0 && chapters.map((chap, index) => {
            if (chap.time <= 1) return null;
            const pct = (chap.time / duration) * 100;
            return (
              <div
                key={`chap-${index}`}
                className="player-page__chapter-marker"
                style={{ left: `${pct}%` }}
              />
            );
          })}
        </div>
        <span className="player-page__time">{formatTime(duration)}</span>
      </div>

      {/* Action Row */}
      <div className="player-page__actions">

        {/* Left Actions */}
        <div className="player-page__actions-group">
          <button className="player-page__btn" onClick={() => sendCommand(['add', 'chapter', -1])}>
            <SkipBack size={18} fill="currentColor" />
          </button>

          <button className="player-page__btn" onClick={handleSpeedDown}>
            <Rewind size={18} fill="currentColor" />
          </button>

          <button className="player-page__btn player-page__btn--primary" onClick={handlePlayPause}>
            {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
          </button>

          <button className="player-page__btn" onClick={handleClose}>
            <Square size={18} fill="currentColor" />
          </button>

          <button className="player-page__btn" onClick={handleSpeedUp}>
            <FastForward size={18} fill="currentColor" />
          </button>

          <button className="player-page__btn" onClick={() => sendCommand(['add', 'chapter', 1])}>
            <SkipForward size={18} fill="currentColor" />
          </button>

          {speed !== 1.0 && (
            <Badge family="status" tone="accent" className="player-page__speed-badge">
              {speedText}
            </Badge>
          )}

          <div className="player-page__volume-group">
            <button className="player-page__btn" onClick={toggleMute}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="player-page__volume-slider"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="player-page__actions-group">

          {/* Audio Tracks Dropdown */}
          {showAudioMenu && (
            <div className="player-page__menu" onWheel={(e) => e.stopPropagation()}>
              <div className="player-page__menu-title">{t('player.audio_tracks', { defaultValue: 'Audio Tracks' })}</div>
              {trackList.filter((track) => track.type === 'audio').map((track) => (
                <button
                  key={track.id}
                  className={`player-page__menu-item ${track.selected ? 'active' : ''}`}
                  onClick={() => {
                    sendCommand(['set_property', 'aid', track.id]);
                    setShowAudioMenu(false);
                  }}
                >
                  {track.title || track.lang?.toUpperCase() || ((t('player.track') || 'Track') + ' ' + track.id)} {track.codec ? `(${track.codec.toUpperCase()})` : ''}
                </button>
              ))}
              {trackList.filter((track) => track.type === 'audio').length === 0 && (
                <div className="player-page__menu-empty">{t('player.no_audio_tracks', { defaultValue: 'No audio tracks' })}</div>
              )}
            </div>
          )}

          {/* Subtitles Dropdown */}
          {showSubMenu && (
            <div className="player-page__menu" onWheel={(e) => e.stopPropagation()}>
              <div className="player-page__menu-title">{t('common.subtitles', { defaultValue: 'Subtitles' })}</div>
              <button
                className={`player-page__menu-item ${!trackList.some((track) => track.type === 'sub' && track.selected) ? 'active' : ''}`}
                onClick={() => {
                  sendCommand(['set_property', 'sid', 'no']);
                  setShowSubMenu(false);
                }}
              >
                {t('player.off', { defaultValue: 'Off' })}
              </button>
              {trackList.filter((track) => track.type === 'sub').map((track) => (
                <button
                  key={track.id}
                  className={`player-page__menu-item ${track.selected ? 'active' : ''}`}
                  onClick={() => {
                    sendCommand(['set_property', 'sid', track.id]);
                    setShowSubMenu(false);
                  }}
                >
                  {track.title || track.lang?.toUpperCase() || ((t('common.subtitle') || 'Subtitle') + ' ' + track.id)}
                </button>
              ))}
            </div>
          )}

          {/* Peak Button */}
          {isAdult && (
            <button
              className={`player-page__btn ${justAddedPeak ? 'player-page__btn--peak-success' : 'player-page__btn--peak'}`}
              onClick={handleAddPeak}
              title={t('library.addPeak') || 'Add Finish'}
            >
              <Droplets size={18} fill="currentColor" />
            </button>
          )}

          <button
            className={`player-page__btn ${showAudioMenu ? 'active' : ''}`}
            onClick={() => {
              setShowAudioMenu(!showAudioMenu);
              setShowSubMenu(false);
            }}
          >
            <Languages size={18} />
          </button>

          <button
            className={`player-page__btn ${showSubMenu ? 'active' : ''}`}
            onClick={() => {
              setShowSubMenu(!showSubMenu);
              setShowAudioMenu(false);
            }}
          >
            <Captions size={18} />
          </button>

          <button className="player-page__btn" onClick={handleMinimizePip}>
            <Minimize2 size={18} />
          </button>

          <button className="player-page__btn" onClick={handleTogglePip}>
            <PictureInPicture2 size={18} />
          </button>
        </div>

      </div>

    </div>
  );
}

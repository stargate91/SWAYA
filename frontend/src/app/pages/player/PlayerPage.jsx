 
import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Maximize2, X, Minimize2 } from '@/ui/icons';
import { useTranslation } from '@/providers/LanguageContext';
import useVideoPlayer from './hooks/useVideoPlayer';
import PlayerControlBar from './components/PlayerControlBar';
import PlayerEndOverlay from './components/PlayerEndOverlay';
import './PlayerPage.css';

const getQueryParam = (name) => {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has(name)) {
    return searchParams.get(name);
  }
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex !== -1) {
    const hashParams = new URLSearchParams(hash.substring(qIndex));
    if (hashParams.has(name)) {
      return hashParams.get(name);
    }
  }
  return null;
};

export default function PlayerPage() {
  const { itemId } = useParams();
  const { t } = useTranslation();
  const containerRef = useRef(null);

  const {
    currentTime,
    isPaused,
    duration,
    volume,
    isMuted,
    title,
    logoUrl,
    showControls,
    isPip,
    showEndOverlay,
    userRating,
    hoverRating,
    nextEpisode,
    countdown,
    speed,
    isAdult,
    mediaType,
    justAddedPeak,
    logoError,
    chapters,
    clockTime,
    endTime,
    trackList,
    showAudioMenu,
    showSubMenu,
    bottomOffset,
    osdMessage,
    setShowAudioMenu,
    setShowSubMenu,
    setLogoError,
    setHoverRating,
    setNextEpisode,
    handleMouseMove,
    handleWheel,
    handleDoubleClick,
    handleClose,
    handlePlayPause,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    handleSpeedUp,
    handleSpeedDown,
    handleAddPeak,
    handleRate,
    handleReplay,
    handleTogglePip,
    handleMinimizePip,
    handlePlayNext,
    sendCommand,
  } = useVideoPlayer({
    itemId,
    containerRef,
  });

  const starSymbol = '\u2605';
  const ratingText = userRating ? `${userRating.toFixed(1)} / 10` : '';

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mStr}:${sStr}` : `${m}:${sStr}`;
  };

  const controlsOnly = getQueryParam('controls_only') === 'true';

  const currentChapter = (() => {
    if (!chapters || chapters.length === 0) return null;
    let active = null;
    for (const chap of chapters) {
      if (currentTime >= chap.time) {
        active = chap;
      } else {
        break;
      }
    }
    return active;
  })();

  if (isPip) {
    return (
      /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
      <div
        className="player-page player-page--transparent player-page--pip"
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div className="player-page__pip-drag-handle" />
        <div className="player-page__pip-overlay">
          <button className="player-page__pip-btn" onClick={handleMinimizePip}>
            <Minimize2 size={16} />
          </button>
          <button className="player-page__pip-btn" onClick={handleTogglePip}>
            <Maximize2 size={16} />
          </button>
          <button className="player-page__pip-btn player-page__pip-btn--close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      className={`player-page ${controlsOnly ? 'player-page--transparent' : ''} ${!showControls ? 'player-page--hide-cursor' : ''}`}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      {/* Video Container (Nesting target) */}
      <div ref={containerRef} className="player-page__video-container" />

      {/* Custom Controls Overlay */}
      <div className={`player-page__controls-overlay ${showControls ? 'active' : ''}`}>

        {/* Top Header */}
        <div className="player-page__header">
          <div className="player-page__header-left">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={title}
                className="player-page__logo"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="player-page__title">{title}</span>
            )}
          </div>

          {currentChapter && (
            <div className="player-page__current-chapter">
              {currentChapter.title}
            </div>
          )}

          <div className="player-page__header-right">
            <div className="player-page__time-info">
              <span className="player-page__clock">{clockTime}</span>
              {endTime && <span className="player-page__ends-at">{t('player.ends_at', { defaultValue: 'Ends at' }) + ' ' + endTime}</span>}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <PlayerControlBar
          t={t}
          currentTime={currentTime}
          duration={duration}
          chapters={chapters}
          isPaused={isPaused}
          isMuted={isMuted}
          volume={volume}
          speed={speed}
          isAdult={isAdult}
          mediaType={mediaType}
          justAddedPeak={justAddedPeak}
          trackList={trackList}
          showAudioMenu={showAudioMenu}
          showSubMenu={showSubMenu}
          bottomOffset={bottomOffset}
          formatTime={formatTime}
          handleSeek={handleSeek}
          handleSpeedDown={handleSpeedDown}
          handlePlayPause={handlePlayPause}
          handleClose={handleClose}
          handleSpeedUp={handleSpeedUp}
          toggleMute={toggleMute}
          handleVolumeChange={handleVolumeChange}
          handleAddPeak={handleAddPeak}
          setShowAudioMenu={setShowAudioMenu}
          setShowSubMenu={setShowSubMenu}
          handleMinimizePip={handleMinimizePip}
          handleTogglePip={handleTogglePip}
          sendCommand={sendCommand}
        />

      </div>

      {osdMessage && (
        <div className="player-page__osd">
          {osdMessage}
        </div>
      )}

      {showEndOverlay && (
        <PlayerEndOverlay
          t={t}
          title={title}
          nextEpisode={nextEpisode}
          countdown={countdown}
          userRating={userRating}
          hoverRating={hoverRating}
          ratingText={ratingText}
          starSymbol={starSymbol}
          handlePlayNext={handlePlayNext}
          setNextEpisode={setNextEpisode}
          setHoverRating={setHoverRating}
          handleRate={handleRate}
          handleReplay={handleReplay}
          handleClose={handleClose}
        />
      )}
    </div>
  );
}

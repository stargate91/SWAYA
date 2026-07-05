import { useState, useEffect } from 'react';

export default function HeroSection({ backdropUrl, isFallback, isPreviewPlaying, previewSrc }) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (!isPreviewPlaying) {
      setIsVideoPlaying(false);
    }
  }, [isPreviewPlaying]);

  return (
    <div className="media-detail-page__hero">
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt="Backdrop"
          className={`media-detail-page__hero-backdrop ${isFallback ? 'media-detail-page__hero-backdrop--blurred' : ''} ${isVideoPlaying ? 'media-detail-page__hero-backdrop--hidden' : ''}`}
        />
      )}
      {isPreviewPlaying && previewSrc && (
        <video
          ref={(el) => {
            if (el) {
              el.muted = true;
              el.defaultMuted = true;
            }
          }}
          src={previewSrc}
          autoPlay
          muted
          loop
          playsInline
          onPlay={() => setIsVideoPlaying(true)}
          onPlaying={() => setIsVideoPlaying(true)}
          className={`media-detail-page__hero-video ${isVideoPlaying ? 'media-detail-page__hero-video--visible' : ''}`}
        />
      )}
      <div className="media-detail-page__hero-overlay" />
    </div>
  );
}


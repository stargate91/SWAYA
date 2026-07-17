import { useState, useEffect, useRef } from 'react';
import './HeroSection.css';

export default function HeroSection({ backdropUrl, isFallback, isPreviewPlaying, previewSrc }) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  const [prevIsPreviewPlaying, setPrevIsPreviewPlaying] = useState(isPreviewPlaying);
  if (isPreviewPlaying !== prevIsPreviewPlaying) {
    setPrevIsPreviewPlaying(isPreviewPlaying);
    if (!isPreviewPlaying) {
      setIsVideoPlaying(false);
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPreviewPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPreviewPlaying]);

  return (
    <div className="media-detail-page__hero">
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt="Backdrop"
          className={`media-detail-page__hero-backdrop ${isFallback ? 'media-detail-page__hero-backdrop--blurred' : ''} ${isVideoPlaying && isPreviewPlaying ? 'media-detail-page__hero-backdrop--hidden' : ''}`}
        />
      )}
      {previewSrc && (
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el) {
              el.muted = true;
              el.defaultMuted = true;
            }
          }}
          src={previewSrc}
          poster={backdropUrl}
          muted
          loop
          playsInline
          onPlay={() => setIsVideoPlaying(true)}
          onPlaying={() => setIsVideoPlaying(true)}
          className={`media-detail-page__hero-video ${isVideoPlaying && isPreviewPlaying ? 'media-detail-page__hero-video--visible' : ''}`}
        />
      )}
      <div className="media-detail-page__hero-overlay" />
    </div>
  );
}


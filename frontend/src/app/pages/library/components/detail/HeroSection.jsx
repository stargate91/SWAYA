import { useState, useEffect, useRef } from 'react';
import AbsoluteOverlay from '@/ui/AbsoluteOverlay';
import styles from './HeroSection.module.css';

export default function HeroSection({ backdropUrl, isFallback, isPreviewPlaying, previewSrc, onPlayingChange }) {
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
    onPlayingChange?.(isVideoPlaying);
  }, [isVideoPlaying, onPlayingChange]);

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
    <div className={styles.hero}>
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt="Backdrop"
          className={`${styles.backdrop} ${isFallback ? styles['backdrop--blurred'] : ''} ${isVideoPlaying && isPreviewPlaying ? styles['backdrop--hidden'] : ''}`}
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
          onTimeUpdate={(e) => {
            if (e.target.currentTime > 0) {
              setIsVideoPlaying(true);
            }
          }}
          className={`${styles.video} ${isVideoPlaying && isPreviewPlaying ? styles['video--visible'] : ''}`}
        />
      )}
      <AbsoluteOverlay
        variant="hero"
        hidden={isPreviewPlaying && isVideoPlaying}
      />
    </div>
  );
}


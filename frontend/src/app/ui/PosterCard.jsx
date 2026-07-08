import { memo, useState, useEffect } from 'react';
import MediaCard from './MediaCard';
import IconButton from './IconButton';
import CardMetadata from './CardMetadata';
import { Check } from '@/ui/icons';
import { API_BASE } from '@/lib/backend';
import { useSettingsQuery } from '@/queries/settingsQueries';
import './PosterCard.css';

const PosterCard = memo(function PosterCard({
  as: Component,
  className = '',
  variant = 'default',
  aspect = 'poster', // 'poster' or 'landscape'
  imageUrl,
  backgroundColor,
  icon: IconComponent,
  placeholderText,
  title,
  subtitle,
  badge,
  topRightBadge,
  topRightAction,
  isWatched = false,
  overlay,
  playOverlay,
  ratingImdb,
  ratingTmdb,
  ratingPorndb,
  ratingPill,
  performers,
  onClick,
  disabled = false,
  active = false,
  style,
  customStyle,
  children,
  previewItemId,
  previewEnabled = true,
  previewDelay = 500,
  ...props
}) {
  const isInteractive = !!onClick;
  const hasInteractiveChildren = Boolean(children);
  const DefaultComponent = Component || ((isInteractive && !hasInteractiveChildren) ? 'button' : 'div');
  const isOverlayTitle = variant === 'overlay-title';

  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const { data: settings = {} } = useSettingsQuery();
  const hoverPreviewsEnabled = settings.hover_previews_enabled !== false;
  const hoverPreviewsDelay = settings.hover_previews_delay ?? previewDelay;

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!previewItemId || !previewEnabled || !isHovered || !hoverPreviewsEnabled) {
      setPreviewSrc(null);
      setIsLoadingPreview(false);
      setIsVideoPlaying(false);
      return;
    }

    let active = true;
    let controller = null;

    const timer = setTimeout(async () => {
      if (!active) return;
      setIsLoadingPreview(true);
      try {
        controller = new AbortController();
        const url = `${API_BASE}/api/v1/media/${previewItemId}/preview`;
        const response = await fetch(url, { signal: controller.signal });
        if (response.ok && active) {
          setPreviewSrc(url);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Failed to load preview:", err);
        }
      } finally {
        if (active) {
          setIsLoadingPreview(false);
        }
      }
    }, hoverPreviewsDelay);

    return () => {
      active = false;
      clearTimeout(timer);
      if (controller) {
        controller.abort();
      }
    };
  }, [isHovered, previewItemId, previewEnabled, hoverPreviewsDelay, hoverPreviewsEnabled]);

  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  const cardClassName = `ui-poster-card ui-poster-card--aspect-${aspect} ${isOverlayTitle ? 'ui-poster-card--overlay-title' : ''} ${active ? 'is-active' : ''} ${className}`.trim();

  const interactiveProps = {};
  if (DefaultComponent === 'div' && isInteractive) {
    interactiveProps.role = 'button';
    interactiveProps.tabIndex = 0;
    interactiveProps.onKeyDown = handleKeyDown;
  }


  return (
    /* eslint-disable-next-line react/forbid-dom-props */
    <div
      className={cardClassName}
      style={customStyle || style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="ui-poster-card__media-shell">
        <DefaultComponent
          type={DefaultComponent === 'button' ? 'button' : undefined}
          className="ui-poster-card__image-wrapper"
          onClick={onClick}
          disabled={disabled || undefined}
          {...interactiveProps}
          {...props}
        >
          <MediaCard className="ui-poster-card__media">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt=""
                className="ui-poster-card__image"
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className="ui-poster-card__placeholder"
                /* eslint-disable-next-line react/forbid-dom-props */
                style={backgroundColor ? { background: backgroundColor } : undefined}
              >
                {IconComponent && <IconComponent size={32} className="ui-poster-card__placeholder-icon" />}
                {placeholderText && <span className="ui-poster-card__placeholder-text">{placeholderText}</span>}
              </div>
            )}
            {isHovered && previewItemId && previewEnabled && hoverPreviewsEnabled && !isVideoPlaying && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backdropFilter: 'blur(8px)',
                  background: 'rgba(0, 0, 0, 0.15)',
                  zIndex: 2,
                  pointerEvents: 'none',
                  transition: 'opacity 0.3s ease',
                }}
              />
            )}
            {previewSrc && (
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
                className="ui-poster-card__image"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 3,
                  opacity: isVideoPlaying ? 1 : 0,
                  transition: 'opacity 0.35s ease-in-out',
                }}
              />
            )}
            {isLoadingPreview && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 4,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '3px solid var(--color-accent, var(--color-accent-blue, #0088ff))',
                    borderRadius: '50%',
                    animation: 'ui-poster-card-spin 0.6s linear infinite',
                  }}
                />
              </div>
            )}
            {overlay}
            {badge}
            {topRightBadge}
            {isWatched && (
              <div className="ui-poster-card__watched-badge">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
            {isOverlayTitle && title ? (
              <div className="ui-poster-card__title-overlay">
                <div className="ui-poster-card__title-overlay-gradient" />
                <Tooltip content={title} side="top">
                  <div className="ui-poster-card__title-overlay-label">{title}</div>
                </Tooltip>
              </div>
            ) : null}
            {children}
          </MediaCard>
        </DefaultComponent>
        {topRightAction}
        {playOverlay ? (
          <IconButton
            variant="play-overlay"
            onClick={playOverlay.onClick}
            title={null}
            label={playOverlay.label}
            disabled={playOverlay.disabled}
          >
            {playOverlay.icon}
          </IconButton>
        ) : null}
      </div>

      {!isOverlayTitle && (
        <CardMetadata
          title={title}
          subtitle={subtitle}
          performers={performers}
          ratingImdb={ratingImdb}
          ratingTmdb={ratingTmdb}
          ratingPorndb={ratingPorndb}
          ratingPill={ratingPill}
        />
      )}
    </div>
  );
});

export default PosterCard;

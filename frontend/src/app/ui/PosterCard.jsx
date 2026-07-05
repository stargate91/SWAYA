import { memo, useState, useEffect } from 'react';
import MediaCard from './MediaCard';
import Pill from './Pill';
import IconButton from './IconButton';
import { Star, Check } from '@/ui/icons';
import Tooltip from './Tooltip';
import { API_BASE } from '@/lib/backend';
import './PosterCard.css';

const PosterCard = memo(function PosterCard({
  as: Component,
  className = '',
  variant = 'default',
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
  onClick,
  disabled = false,
  active = false,
  style,
  customStyle,
  children,
  previewItemId,
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

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!previewItemId || !isHovered) {
      setPreviewSrc(null);
      setIsLoadingPreview(false);
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
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
      if (controller) {
        controller.abort();
      }
    };
  }, [isHovered, previewItemId]);

  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  const cardClassName = `ui-poster-card ${isOverlayTitle ? 'ui-poster-card--overlay-title' : ''} ${active ? 'is-active' : ''} ${className}`.trim();

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
                className="ui-poster-card__image"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 3,
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
                  background: 'rgba(0, 0, 0, 0.4)',
                  zIndex: 4,
                  backdropFilter: 'blur(2px)',
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
            title={playOverlay.title}
            label={playOverlay.label}
            disabled={playOverlay.disabled}
          >
            {playOverlay.icon}
          </IconButton>
        ) : null}
      </div>

      {!isOverlayTitle && (title || subtitle || ratingImdb || ratingTmdb || ratingPorndb || ratingPill) && (
        <div className="ui-poster-card__details">
          {title && (
            <Tooltip content={title} side="top">
              <div className="ui-poster-card__title">{title}</div>
            </Tooltip>
          )}
          {(subtitle || ratingImdb || ratingTmdb || ratingPorndb || ratingPill) && (
            <div className="ui-poster-card__subtitle-row">
              {subtitle && <div className="ui-poster-card__subtitle">{subtitle}</div>}
              {ratingPill ? ratingPill : (() => {
                const hasImdb = ratingImdb !== undefined && ratingImdb !== null && ratingImdb !== '' && parseFloat(ratingImdb) > 0;
                const hasTmdb = ratingTmdb !== undefined && ratingTmdb !== null && ratingTmdb !== '' && parseFloat(ratingTmdb) > 0;
                const hasPorndb = ratingPorndb !== undefined && ratingPorndb !== null && ratingPorndb !== '' && parseFloat(ratingPorndb) > 0;
                if (hasImdb) {
                  const val = parseFloat(ratingImdb);
                  return (
                    <Pill variant="imdb">
                      <Star size={10} fill="currentColor" strokeWidth={1.8} />
                      {isNaN(val) ? ratingImdb : val.toFixed(1)}
                    </Pill>
                  );
                } else if (hasTmdb) {
                  const val = parseFloat(ratingTmdb);
                  return (
                    <Pill variant="tmdb">
                      <Star size={10} fill="currentColor" strokeWidth={1.8} />
                      {isNaN(val) ? ratingTmdb : val.toFixed(1)}
                    </Pill>
                  );
                } else if (hasPorndb) {
                  const val = parseFloat(ratingPorndb);
                  return (
                    <Pill variant="porndb">
                      <Star size={10} fill="currentColor" strokeWidth={1.8} />
                      {isNaN(val) ? ratingPorndb : val.toFixed(1)}
                    </Pill>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default PosterCard;

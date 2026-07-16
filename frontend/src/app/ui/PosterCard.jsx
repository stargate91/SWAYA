import { memo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import IconButton from './IconButton';
import CardMetadata from './CardMetadata';
import Tooltip from './Tooltip';
import Badge from './Badge';
import { Check, Star, Heart } from '@/ui/icons';
import { API_BASE } from '@/lib/backend';
import { useSettingsQuery } from '@/queries/settingsQueries';
import styles from './PosterCard.module.css';

const PosterCard = memo(function PosterCard({
  as: Component,
  className = '',
  variant = 'default',
  aspect = 'poster', // 'poster', 'landscape', or 'mixed-landscape'
  imageUrl,
  backgroundColor,
  icon: IconComponent,
  placeholderText,
  title,
  subtitle,
  userRating = 0,
  isFavorite = false,
  topRightAction,
  topLeftAction,
  isWatched = false,
  overlay,
  playOverlay,
  ratingImdb,
  ratingTmdb,
  ratingPorndb,
  ratingPill,
  performers,
  date,
  onClick,
  disabled = false,
  active = false,
  disableHoverAnimation = false,
  fillHeight = false,
  imageWrapperClassName = '',
  imageClassName = '',
  style,
  customStyle,
  children,
  previewItemId,
  previewEnabled = true,
  previewDelay = 800,
  isMissing = false,
  ...props
}) {
  const isInteractive = !!onClick;
  const DefaultComponent = Component || 'div';
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

  const cardClassName = `
    ${styles.card}
    ${active ? styles['is-active'] : ''}
    ${disableHoverAnimation ? styles['no-hover-animation'] : ''}
    ${className}
  `.trim();

  const interactiveProps = {};
  if (DefaultComponent === 'div' && isInteractive) {
    interactiveProps.role = 'button';
    interactiveProps.tabIndex = 0;
    interactiveProps.onKeyDown = handleKeyDown;
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={cardClassName}
      data-aspect={aspect}
      data-variant={variant}
      data-fill-height={fillHeight}
      data-clickable={!!onClick || undefined}
      data-missing={isMissing || undefined}
      // eslint-disable-next-line react/forbid-dom-props
      style={customStyle || style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={disabled ? undefined : onClick}
      {...interactiveProps}
      {...props}
    >
      <div className={styles['media-shell']}>
        <DefaultComponent
          className={`${styles['image-wrapper']} ${imageWrapperClassName}`.trim()}
        >
          <div className={styles.media}>
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt=""
                className={`${styles.image} ${imageClassName}`.trim()}
                onError={() => setImageError(true)}
              />
            ) : (
              <div
                className={styles.placeholder}
                // eslint-disable-next-line react/forbid-dom-props
                style={backgroundColor ? { background: backgroundColor } : undefined}
              >
                {IconComponent && <IconComponent size={32} className={styles['placeholder-icon']} />}
                {placeholderText && <span className={styles['placeholder-text']}>{placeholderText}</span>}
              </div>
            )}
            {isHovered && previewItemId && previewEnabled && hoverPreviewsEnabled && !isVideoPlaying && (
              <div className={styles['hover-overlay']} />
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
                className={`${styles.image} ${styles['preview-video']} ${imageClassName}`.trim()}
                // eslint-disable-next-line react/forbid-dom-props
                style={{
                  opacity: isVideoPlaying ? 1 : 0,
                }}
              />
            )}
            {isLoadingPreview && (
              <div className={styles['loader-overlay']}>
                <div className={styles['loader-spinner']} />
              </div>
            )}
            {overlay}
            {userRating > 0 && (
              <Badge
                className={styles['user-rating-badge']}
                leftIcon={<Star size={10} fill="currentColor" />}
              >
                {Number.isInteger(userRating) ? String(userRating) : userRating.toFixed(1)}
              </Badge>
            )}
            {isFavorite && (
              <div className={styles['favorite-badge']}>
                <Heart size={14} fill="currentColor" strokeWidth={2.2} />
              </div>
            )}
            {isWatched && (
              <div className={styles['watched-badge']}>
                <Check size={14} strokeWidth={3} />
              </div>
            )}
            {isOverlayTitle && title ? (
              <div className={styles['title-overlay']}>
                <div className={styles['title-overlay-gradient']} />
                <Tooltip content={title} side="top" triggerClassName={styles['tooltip-trigger']}>
                  <div className={styles['title-overlay-label']}>{title}</div>
                </Tooltip>
              </div>
            ) : null}
            {children}
          </div>
        </DefaultComponent>
        {topLeftAction}
        {topRightAction}
        {playOverlay ? (
          <IconButton
            type="button"
            className={styles['play-overlay']}
            onClick={playOverlay.onClick}
            label={playOverlay.label}
            title={null}
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
          date={date}
          className={styles.details}
          titleClassName={styles.title}
          subtitleRowClassName={styles['subtitle-row']}
          subtitleClassName={styles.subtitle}
          performerLinkClassName={styles['performer-link']}
          metaRightClassName={styles['meta-right']}
          dateClassName={styles.date}
          tooltipTriggerClassName={styles['tooltip-trigger']}
        />
      )}
    </div>
  );
});

PosterCard.propTypes = {
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  className: PropTypes.string,
  variant: PropTypes.string,
  aspect: PropTypes.string,
  imageUrl: PropTypes.string,
  backgroundColor: PropTypes.string,
  icon: PropTypes.elementType,
  placeholderText: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  userRating: PropTypes.number,
  isFavorite: PropTypes.bool,
  topRightAction: PropTypes.node,
  topLeftAction: PropTypes.node,
  isWatched: PropTypes.bool,
  overlay: PropTypes.node,
  playOverlay: PropTypes.shape({
    onClick: PropTypes.func.isRequired,
    icon: PropTypes.node.isRequired,
    label: PropTypes.string,
    disabled: PropTypes.bool,
  }),
  ratingImdb: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  ratingTmdb: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  ratingPorndb: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  ratingPill: PropTypes.node,
  performers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  date: PropTypes.string,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  active: PropTypes.bool,
  disableHoverAnimation: PropTypes.bool,
  fillHeight: PropTypes.bool,
  imageWrapperClassName: PropTypes.string,
  imageClassName: PropTypes.string,
  style: PropTypes.object,
  customStyle: PropTypes.object,
  children: PropTypes.node,
  previewItemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  previewEnabled: PropTypes.bool,
  previewDelay: PropTypes.number,
  isMissing: PropTypes.bool,
};

export default PosterCard;

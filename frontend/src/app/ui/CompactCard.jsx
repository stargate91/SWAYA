import { useState } from 'react';
import './CompactCard.css';

export default function CompactCard({
  title,
  description,
  imageUrl,
  aspect = 'poster', // 'poster', 'landscape', 'square', 'circle'
  fallbackIcon: FallbackIcon = null,
  badge = null,
  meta = null,
  rightElement = null,
  active = false,
  disabled = false,
  onClick = null,
  className = '',
  ...props
}) {
  const [imageError, setImageError] = useState(false);
  const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
  if (prevImageUrl !== imageUrl) {
    setPrevImageUrl(imageUrl);
    setImageError(false);
  }

  const hasInteractive = typeof onClick === 'function' && !disabled;
  const Component = hasInteractive ? 'button' : 'div';

  const cardClass = [
    'ui-compact-card',
    `ui-compact-card--aspect-${aspect}`,
    active && 'is-active',
    disabled && 'is-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      type={hasInteractive ? 'button' : undefined}
      className={cardClass}
      onClick={hasInteractive ? onClick : undefined}
      disabled={disabled || undefined}
      {...props}
    >
      <div className="ui-compact-card__poster-wrapper">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt=""
            className="ui-compact-card__image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="ui-compact-card__placeholder">
            {FallbackIcon && <FallbackIcon size={18} />}
          </div>
        )}
      </div>

      <div className="ui-compact-card__body">
        <div className="ui-compact-card__topline">
          <strong className="ui-compact-card__title">{title}</strong>
          {badge && <div className="ui-compact-card__badge">{badge}</div>}
        </div>

        {meta && <div className="ui-compact-card__meta">{meta}</div>}
        {description && <p className="ui-compact-card__description">{description}</p>}
      </div>

      {rightElement && (
        <div className="ui-compact-card__right">
          {rightElement}
        </div>
      )}
    </Component>
  );
}

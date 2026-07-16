import { useState } from 'react';
import { Check } from '@/ui/icons';
import styles from './SelectableCard.module.css';

/**
 * SelectableCard is an interactive card component that supports both text/content layout selection
 * (e.g. settings themes, bulk options) and image/media selection (e.g. posters, backdrops, logos).
 *
 * @param {object} props
 * @param {React.ReactNode} [props.children] - Children to render inside the card
 * @param {string} [props.imageUrl] - Optional image URL to render an image card
 * @param {string} [props.alt] - Alternate text for image
 * @param {'landscape' | 'poster' | 'logo' | 'none'} [props.aspect] - Layout aspect ratio
 * @param {boolean} [props.selected] - Active selected highlight state
 * @param {boolean} [props.isPending] - Display loading spinner overlay (for image selection)
 * @param {string} [props.infoLeft] - Optional overlay text aligned to the left (for image selection)
 * @param {string} [props.infoRight] - Optional overlay text aligned to the right (for image selection)
 * @param {boolean} [props.disabled] - Disabled state
 * @param {'default' | 'theme'} [props.variant] - Style variant (for non-image cards)
 * @param {'button' | 'div'} [props.as] - HTML wrapper tag to render
 * @param {string} [props.className] - Additional custom class names
 * @param {() => void} [props.onClick] - Click event handler
 * @param {React.Ref<any>} [props.ref] - Element reference
 */
export default function SelectableCard({
  children,
  imageUrl,
  alt = 'Selectable card',
  aspect = 'none',
  selected = false,
  isPending = false,
  infoLeft,
  infoRight,
  disabled = false,
  variant = 'default',
  as = 'button',
  className = '',
  onClick,
  ref,
  showCheckmark = true,
  ...props
}) {
  const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
  const [imageError, setImageError] = useState(false);

  if (imageUrl !== prevImageUrl) {
    setPrevImageUrl(imageUrl);
    setImageError(false);
  }

  const isImageCard = aspect !== 'none';
  const isDisabled = isPending || disabled;
  const Wrapper = as === 'div' ? 'div' : 'button';

  const interactiveProps = {};
  if (Wrapper === 'div') {
    interactiveProps.role = 'button';
    interactiveProps.tabIndex = isDisabled ? -1 : 0;
    interactiveProps.onKeyDown = isDisabled ? undefined : (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.(event);
      }
    };
  }

  return (
    <Wrapper
      ref={ref}
      type={Wrapper === 'button' ? 'button' : undefined}
      data-card-type={isImageCard ? 'image' : 'content'}
      data-variant={variant}
      data-aspect={isImageCard ? aspect : undefined}
      data-selected={selected}
      data-disabled={isDisabled}
      className={`${styles.card} ui-selectable-card ${className}`.trim()}
      onClick={isDisabled ? undefined : onClick}
      disabled={Wrapper === 'button' ? isDisabled : undefined}
      {...interactiveProps}
      {...props}
    >
      {isImageCard ? (
        <>
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={alt}
              className={`${styles.img} ui-selectable-card__img`}
              loading="lazy"
              decoding="async"
              draggable="false"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`${styles.placeholder} ui-selectable-card__placeholder`}>
              {alt || 'No Image'}
            </div>
          )}
          {isPending && (
            <div className={`${styles['spinner-overlay']} ui-selectable-card__spinner-overlay`}>
              <div className={styles.spinner} />
            </div>
          )}
          {selected && !isPending && (
            <div className={`${styles['selected-overlay']} ui-selectable-card__selected-overlay`}>
              {showCheckmark && <Check size={18} />}
            </div>
          )}
          {(infoLeft || infoRight) && (
            <div className={`${styles['info-overlay']} ui-selectable-card__info-overlay`}>
              {infoLeft && <span>{infoLeft}</span>}
              {infoRight && <span>{infoRight}</span>}
            </div>
          )}
          {children}
        </>
      ) : (
        children
      )}
    </Wrapper>
  );
}

import PropTypes from 'prop-types';
import Badge from './Badge';
import styles from './AdultOverlay.module.css';

/**
 * AdultOverlay applies a solid dark overlay (obscure) or glassmorphism blur (blur)
 * on NSFW/adult content blocks, fading out on container hover.
 *
 * @param {object} props
 * @param {'obscure' | 'blur'} [props.variant] - The overlay rendering style flavor
 * @param {string} [props.badgeText] - Indicator label text inside the badge (defaults to "18+")
 * @param {string} [props.className] - Additional class name
 */
export default function AdultOverlay({ variant = 'obscure', badgeText = '18+', className = '' }) {
  return (
    <div
      data-variant={variant}
      className={`${styles.overlay} ${className}`.trim()}
    >
      {badgeText && <Badge family="adult" tone="danger">{badgeText}</Badge>}
    </div>
  );
}

AdultOverlay.propTypes = {
  variant: PropTypes.oneOf(['obscure', 'blur']),
  badgeText: PropTypes.string,
  className: PropTypes.string,
};

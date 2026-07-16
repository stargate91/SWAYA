import PropTypes from 'prop-types';
import styles from './LinearProgress.module.css';

/**
 * Pure linear progress bar.
 *
 * @param {object} props
 * @param {number} props.value - Percentage value between 0 and 100
 * @param {'blue' | 'accent' | 'success' | 'danger' | 'dna' | 'timeline'} [props.variant] - Visual style theme
 * @param {string} [props.className] - Custom classes for container styling
 */
export default function LinearProgress({ value = 0, variant = 'blue', className = '', ...props }) {
  const fillStyle = {
    width: `${Math.min(100, Math.max(0, value))}%`
  };

  return (
    <div className={`${styles.container} ${className}`.trim()} {...props}>
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div className={styles.bar} data-variant={variant} style={fillStyle} />
    </div>
  );
}

LinearProgress.propTypes = {
  value: PropTypes.number.isRequired,
  variant: PropTypes.oneOf(['blue', 'accent', 'success', 'danger', 'dna', 'timeline']),
  className: PropTypes.string,
};

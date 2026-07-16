import PropTypes from 'prop-types';
import styles from './Spinner.module.css';

export default function Spinner({
  label = 'Loading',
  description = '',
  className = '',
  size,
}) {
  const spinnerStyle = size ? { width: size, height: size } : undefined;

  return (
    <div
      className={`${styles.wrap} ${className}`.trim()}
      aria-live="polite"
      aria-label={label}
      role="status"
    >
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <span className={styles.spinner} style={spinnerStyle} />
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description ? <span className={styles.description}>{description}</span> : null}
      </div>
    </div>
  );
}

Spinner.propTypes = {
  label: PropTypes.string,
  description: PropTypes.string,
  className: PropTypes.string,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

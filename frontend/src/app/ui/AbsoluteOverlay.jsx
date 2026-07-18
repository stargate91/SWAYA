import PropTypes from 'prop-types';
import styles from './AbsoluteOverlay.module.css';

export default function AbsoluteOverlay({
  variant = 'hero',
  className = '',
  hidden = false,
}) {
  const variantClass = styles[`overlay--${variant}`];
  
  return (
    <div className={`${styles.overlay} ${variantClass || ''} ${hidden ? styles['overlay--hidden'] : ''} ${className}`.trim()} />
  );
}

AbsoluteOverlay.propTypes = {
  variant: PropTypes.oneOf(['hero']),
  className: PropTypes.string,
  hidden: PropTypes.bool,
};

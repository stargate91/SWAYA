import { useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from './ColorSwatch.module.css';

export default function ColorSwatch({
  color,
  selected = false,
  onClick,
  disabled = false,
  className = '',
  shape = 'circle', // 'circle' | 'square'
  'aria-label': ariaLabel,
  ...props
}) {
  // Use callback ref to set background-color dynamically without violating CSP or simple inline layout styles
  const ref = useCallback((node) => {
    if (node) {
      node.style.backgroundColor = color;
    }
  }, [color]);

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.swatch} ${className}`.trim()}
      data-selected={selected}
      data-shape={shape}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || color}
      {...props}
    />
  );
}

ColorSwatch.propTypes = {
  color: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  shape: PropTypes.oneOf(['circle', 'square']),
  'aria-label': PropTypes.string,
};

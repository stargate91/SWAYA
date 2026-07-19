import PropTypes from 'prop-types';
import styles from './Grid.module.css';

/**
 * Grid layout primitive to display items in a responsive grid.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'poster' | 'scene' | 'backdrop' | 'logo' | 'mixed' | 'auto-poster' | 'auto-scene' | 'stats' | 'bento' | 'split' | 'auto-card' | 'picker' | 'default' | 'auto-fit' | 'auto-gallery' | 'auto-fill-xs' | 'auto-fit-xs' | 'three-cols' | 'specs'} [props.variant] - The type/variant of the grid layout
 * @param {'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'} [props.gap] - Custom gap token
 * @param {string} [props.className] - Additional class name
 * @param {object} [props.style] - Inline style override
 */
export default function Grid({ children, variant = 'default', gap, className = '', style, ...props }) {
  const mergedStyle = gap ? { ...style, gap: `var(--space-${gap})` } : style;

  return (
    <div
      data-variant={variant}
      className={`${styles.grid} ui-grid ${className}`.trim()}
      style={mergedStyle}
      {...props}
    >
      {children}
    </div>
  );
}

Grid.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    'default',
    'poster',
    'scene',
    'backdrop',
    'logo',
    'mixed',
    'auto-poster',
    'auto-scene',
    'auto-gallery',
    'stats',
    'bento',
    'split',
    'auto-card',
    'picker',
    'specs',
    'auto-fit',
    'auto-fill-xs',
    'auto-fit-xs',
    'three-cols',
  ]),
  gap: PropTypes.oneOf(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
  className: PropTypes.string,
  style: PropTypes.object,
};


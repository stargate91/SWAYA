import styles from './Grid.module.css';

/**
 * Grid layout primitive to display items in a responsive grid.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'poster' | 'scene' | 'backdrop' | 'logo' | 'mixed' | 'auto-poster' | 'auto-scene' | 'stats' | 'bento' | 'split' | 'auto-card' | 'default'} [props.variant] - The type/variant of the grid layout
 * @param {string} [props.className] - Additional class name
 */
export default function Grid({ children, variant = 'default', className = '', ...props }) {
  return (
    <div
      data-variant={variant}
      className={`${styles.grid} ui-grid ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

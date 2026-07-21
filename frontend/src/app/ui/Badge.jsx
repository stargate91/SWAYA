import styles from './Badge.module.css';

/**
 * Presentational Badge component to display status labels, tags, or count indicators.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.children] - Badge content text or elements
 * @param {'default' | 'status' | 'adult'} [props.family] - Styling group family
 * @param {'neutral' | 'accent' | 'success' | 'danger' | 'warning' | 'overlay'} [props.tone] - Theme/color flavor
 * @param {'inline' | 'overlay' | 'top-left'} [props.variant] - Placement variant behavior
 * @param {'sm' | 'md' | 'lg'} [props.size] - Sizing scale
 * @param {'none' | 'sm' | 'md' | 'full'} [props.roundness] - Corner radius rounding variant
 * @param {React.ReactNode} [props.leftIcon] - Leading icon element to render on the left
 * @param {React.ReactNode} [props.rightIcon] - Trailing icon element to render on the right
 * @param {string} [props.className] - External styles or override classes
 * @param {React.ElementType} [props.as] - HTML element or React component type to render
 * @param {React.Ref<any>} [props.ref] - React 19 element reference
 */
export default function Badge({
  children,
  family = 'default',
  tone = 'neutral',
  variant = 'inline',
  size = 'md',
  roundness = family === 'adult' ? 'sm' : 'md',
  leftIcon,
  rightIcon,
  className = '',
  as: Component = 'span',
  ref,
  ...props
}) {
  return (
    <Component
      ref={ref}
      data-family={family}
      data-tone={tone}
      data-variant={variant}
      data-size={size}
      data-roundness={roundness}
      className={`${styles.badge} ${className}`.trim()}
      {...props}
    >
      {leftIcon && <span data-badge-icon="left" className={styles.icon}>{leftIcon}</span>}
      {children && <span className={styles.content}>{children}</span>}
      {rightIcon && <span data-badge-icon="right" className={styles.icon}>{rightIcon}</span>}
    </Component>
  );
}

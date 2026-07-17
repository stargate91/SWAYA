import styles from './IconButton.module.css';

/**
 * IconButton wraps an icon inside a styled button.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Icon element to render
 * @param {string} [props.className] - Additional custom class names
 * @param {'primary' | 'primary-neutral' | 'secondary' | 'secondary-neutral' | 'ghost' | 'danger' | 'flat-danger' | 'close' | 'play-overlay' | 'carousel-arrow' | 'glass' | 'success'} [props.variant] - Button variant
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'md-btn'} [props.size] - Button size
 * @param {string} [props.label] - Accessible label
 * @param {string} [props.title] - Tooltip text
 * @param {boolean} [props.wrapped] - Optional border container wrapping
 * @param {boolean} [props.wrapperHoverOnly] - Transparent wrapper that appears on hover only
 */
export default function IconButton({
  children,
  className = '',
  variant = 'secondary-neutral',
  size = 'md',
  label,
  title,
  wrapped = false,
  wrapperHoverOnly = false,
  ...props
}) {
  const accessibleLabel = label || title;

  const button = (
    <button
      data-variant={variant}
      data-size={size}
      className={`${styles['icon-button']} ui-icon-button ${className}`.trim()}
      aria-label={accessibleLabel}
      title={title === null ? undefined : (title || accessibleLabel)}
      {...props}
    >
      {children}
    </button>
  );

  if (wrapped) {
    return (
      <div
        data-hover-only={wrapperHoverOnly}
        className={`${styles['icon-button-wrapper']} ui-icon-button-wrapper`}
      >
        {button}
      </div>
    );
  }

  return button;
}

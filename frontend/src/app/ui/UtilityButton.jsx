import styles from './UtilityButton.module.css';

/**
 * Presentational and window control UtilityButton.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'sm' | 'titlebar'} [props.size] - Sizing mode
 * @param {boolean} [props.danger] - Apply warning/danger variant styling
 * @param {string} [props.className] - Additional custom class names
 */
export default function UtilityButton({
  children,
  className = '',
  size = 'md',
  danger = false,
  ...props
}) {
  return (
    <button
      data-size={size}
      data-danger={danger}
      className={`${styles['utility-button']} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

import PropTypes from 'prop-types';
import { X } from '@/ui/icons';
import styles from './Chip.module.css';

/**
 * Reusable Chip component for choices, filters, or removable input tags.
 */
export default function Chip({
  children,
  onClick,
  onRemove,
  variant = 'default',
  size = 'md',
  color,
  leftElement,
  rightElement,
  active = false,
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const isRemovable = Boolean(onRemove) || variant === 'removable';

  const handleClick = (e) => {
    if (disabled) return;
    if (onClick) {
      onClick(e);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onRemove) {
      onRemove(e);
    }
  };

  const hasAction = Boolean(onClick) || isRemovable;

  const chipClass = `
    ${styles.chip}
    ${styles[`chip--${variant}`]}
    ${styles[`chip--${size}`]}
    ${hasAction ? styles['chip--interactive'] : ''}
    ${className}
  `.trim();

  return (
    <button
      type="button"
      className={chipClass}
      data-variant={isRemovable ? 'removable' : variant}
      data-active={active || undefined}
      onClick={isRemovable && !onClick ? handleRemove : handleClick}
      disabled={disabled}
      ref={(el) => {
        if (el) {
          if (color) {
            el.style.setProperty('--chip-color', color);
          }
          if (style) {
            Object.keys(style).forEach((key) => {
              el.style[key] = style[key];
            });
          }
        }
      }}
      {...props}
    >
      {leftElement && <span className={styles['left-element']}>{leftElement}</span>}
      <span className={styles.content}>{children}</span>
      {!isRemovable && rightElement && <span className={styles['right-element']}>{rightElement}</span>}
      {isRemovable && (
        /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
        <span className={styles.icon} onClick={onClick ? handleRemove : undefined}>
          <X size={size === 'xs' || size === 'sm' ? 10 : 12} />
        </span>
      )}
    </button>
  );
}

Chip.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  variant: PropTypes.oneOf(['default', 'outline', 'glass', 'ghost', 'dashed', 'removable']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  color: PropTypes.string,
  leftElement: PropTypes.node,
  rightElement: PropTypes.node,
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

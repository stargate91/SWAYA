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
  className = '',
  ...props
}) {
  const isRemovable = Boolean(onRemove) || variant === 'removable';

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(e);
    }
  };

  return (
    <button
      type="button"
      className={`${styles.chip} ${className}`.trim()}
      data-variant={isRemovable ? 'removable' : 'default'}
      onClick={isRemovable && !onClick ? handleRemove : handleClick}
      {...props}
    >
      <span>{children}</span>
      {isRemovable && (
        /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
        <span className={styles.icon} onClick={onClick ? handleRemove : undefined}>
          <X size={12} />
        </span>
      )}
    </button>
  );
}

Chip.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  variant: PropTypes.oneOf(['default', 'removable']),
  className: PropTypes.string,
};

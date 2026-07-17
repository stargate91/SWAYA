import PropTypes from 'prop-types';
import IconButton from './IconButton';
import { X } from './icons';
import styles from './Thumbnail.module.css';

export default function Thumbnail({
  src,
  alt = 'Thumbnail',
  size = 'md', // 'sm' | 'md' | 'lg'
  onRemove,
  removeLabel = 'Remove image',
  className = '',
  children,
  ...props
}) {
  return (
    <div
      className={`${styles.root} ${className}`.trim()}
      data-size={size}
      {...props}
    >
      {children || (
        src && <img src={src} alt={alt} className={styles.image} />
      )}
      
      {onRemove && (
        <IconButton
          variant="close-overlay"
          size="xs"
          onClick={onRemove}
          className={styles['remove-btn']}
          label={removeLabel}
        >
          <X size={12} />
        </IconButton>
      )}
    </div>
  );
}

Thumbnail.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  onRemove: PropTypes.func,
  removeLabel: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
};

import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import styles from './ImageTooltip.module.css';

const ImageTooltip = forwardRef(function ImageTooltip({ imageUrl, visible, x, y, aspect = 'poster' }, ref) {
  if (!visible || !imageUrl) return null;

  const style = {
    transform: `translate3d(${x + 15}px, ${y + 15}px, 0)`,
  };

  return (
    /* eslint-disable-next-line react/forbid-dom-props */
    <div ref={ref} className={styles.tooltip} style={style} data-aspect={aspect}>
      <img
        src={imageUrl}
        alt="Preview"
        className={styles.image}
      />
    </div>
  );
});

ImageTooltip.propTypes = {
  imageUrl: PropTypes.string,
  visible: PropTypes.bool.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  aspect: PropTypes.oneOf(['poster', 'landscape']),
};

export default ImageTooltip;

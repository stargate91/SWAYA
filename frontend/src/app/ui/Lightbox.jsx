import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { X } from '@/ui/icons';
import IconButton from './IconButton';
import './Lightbox.css';

export default function Lightbox({ imageUrl, onClose, t }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="ui-lightbox"
      role="button"
      tabIndex={0}
      aria-label={t?.('common.close') || 'Close image preview'}
      onClick={onClose}
    >
      <div className="ui-close-container ui-lightbox__close-container" onClick={(e) => e.stopPropagation()}>
        <IconButton
          className="ui-close-btn ui-lightbox__close-btn"
          onClick={onClose}
          label={t?.('common.close') || 'Close'}
          title={null}
          size="md"
        >
          <X size={18} />
        </IconButton>
        <span className="ui-close-esc-hint">ESC</span>
      </div>
      <img
        src={imageUrl}
        alt="Enlarged preview"
        className="ui-lightbox__image"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

Lightbox.propTypes = {
  imageUrl: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  t: PropTypes.func,
};

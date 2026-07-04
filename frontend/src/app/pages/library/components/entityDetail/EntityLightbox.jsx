 
import { createPortal } from 'react-dom';
import { X } from '@/ui/icons';

export default function EntityLightbox({ lightboxUrl, onClose, t }) {
  if (!lightboxUrl || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="organizer-details__lightbox"
      role="button"
      tabIndex={0}
      aria-label={t('common.close') || 'Close image preview'}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="organizer-details__lightbox-close"
        aria-label={t('common.close') || 'Close image preview'}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <X size={18} />
      </button>
      <img
        src={lightboxUrl}
        alt="Enlarged preview"
        className="organizer-details__lightbox-image"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body
  );
}

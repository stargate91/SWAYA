 
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/ui/Button';

const timesChar = '\u00D7';

export default function RatingsReviewDrawer({
  editingItem,
  setEditingItem,
  reviewText,
  setReviewText,
  handleSaveReview,
  t
}) {
  const drawerRef = useRef(null);

  if (!editingItem || typeof document === 'undefined') {
    return null;
  }

  const handleKeyDownBackdrop = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setEditingItem(null);
    }
  };

  return createPortal(
    <>
      <div
        className="review-drawer-backdrop ui-drawer-backdrop"
        onClick={() => setEditingItem(null)}
        onKeyDown={handleKeyDownBackdrop}
        role="button"
        tabIndex={0}
      />
      <div ref={drawerRef} className={`review-drawer ui-drawer ui-drawer--sm ${editingItem ? 'is-open' : ''}`}>
        <div className="review-drawer__header">
          <span className="review-drawer__title">
            {t('ratings.dialog.editReview', { defaultValue: 'Edit Review' })}
          </span>
          <button
            type="button"
            className="review-drawer-close-btn"
            onClick={() => setEditingItem(null)}
          >
            {timesChar}
          </button>
        </div>
        <div className="review-drawer__content">
          <span className="review-drawer-media-title">
            {editingItem.name || editingItem.title || editingItem.displayTitle}
          </span>
          <textarea
            className="review-drawer__textarea"
            placeholder={t('ratings.dialog.placeholder', { defaultValue: 'Write review...' })}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            autoFocus
          />
        </div>
        <div className="review-drawer__footer">
          <Button variant="secondary-neutral" onClick={() => setEditingItem(null)}>
            {t('ratings.dialog.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="primary" onClick={handleSaveReview}>
            {t('ratings.dialog.save', { defaultValue: 'Save Review' })}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}

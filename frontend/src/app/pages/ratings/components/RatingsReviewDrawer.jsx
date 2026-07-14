import { useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/ui/Button';
import IconButton from '@/ui/IconButton';
import { X } from '@/ui/icons';
import styles from './RatingsReviewDrawer.module.css';

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
      <div ref={drawerRef} className={`${styles['review-drawer']} ui-drawer ui-drawer--sm ${editingItem ? 'is-open' : ''}`}>
        <div className={styles['review-drawer__header']}>
          <span className={styles['review-drawer__title']}>
            {t('ratings.dialog.editReview', { defaultValue: 'Edit Review' })}
          </span>
          <IconButton
            type="button"
            variant="close"
            onClick={() => setEditingItem(null)}
            label={t('common.close') || 'Close'}
            size="sm"
          >
            <X size={18} />
          </IconButton>
        </div>
        <div className={styles['review-drawer__content']}>
          <span className={styles['review-drawer-media-title']}>
            {editingItem.name || editingItem.title || editingItem.displayTitle}
          </span>
          <textarea
            className={styles['review-drawer__textarea']}
            placeholder={t('ratings.dialog.placeholder', { defaultValue: 'Write review...' })}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles['review-drawer__footer']}>
          <Button variant="secondary-neutral" onClick={() => setEditingItem(null)}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
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

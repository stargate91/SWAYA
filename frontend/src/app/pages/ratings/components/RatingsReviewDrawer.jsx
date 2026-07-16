import PropTypes from 'prop-types';
import Button from '@/ui/Button';
import Drawer from '@/ui/Drawer';
import styles from './RatingsReviewDrawer.module.css';
import Inline from '@/ui/Inline';

export default function RatingsReviewDrawer({
  editingItem,
  setEditingItem,
  reviewText,
  setReviewText,
  handleSaveReview,
  t
}) {
  if (!editingItem) {
    return null;
  }

  return (
    <Drawer
      isOpen={!!editingItem}
      onClose={() => setEditingItem(null)}
      title={t('ratings.dialog.editReview', { defaultValue: 'Edit Review' })}
      size="sm"
      className={styles['review-drawer']}
    >
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
      <Inline gap="md" align="center" justify="end" className={styles['review-drawer__footer']}>
        <Button variant="secondary-neutral" onClick={() => setEditingItem(null)}>
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button variant="primary" onClick={handleSaveReview}>
          {t('ratings.dialog.save', { defaultValue: 'Save Review' })}
        </Button>
      </Inline>
    </Drawer>
  );
}

RatingsReviewDrawer.propTypes = {
  editingItem: PropTypes.object,
  setEditingItem: PropTypes.func.isRequired,
  reviewText: PropTypes.string.isRequired,
  setReviewText: PropTypes.func.isRequired,
  handleSaveReview: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

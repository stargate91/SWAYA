import PropTypes from 'prop-types';
import Button from '@/ui/Button';
import Drawer from '@/ui/Drawer';
import Input from '@/ui/Input';
import Text from '@/ui/Text';
import Inline from '@/ui/Inline';
import styles from './RatingsReviewDrawer.module.css';

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
        <Text variant="small" weight="semibold" color="secondary">
          {editingItem.name || editingItem.title || editingItem.displayTitle}
        </Text>
        <Input
          multiline={true}
          resizable="vertical"
          placeholder={t('ratings.dialog.placeholder', { defaultValue: 'Write review...' })}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          autoFocus
          rows={12}
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

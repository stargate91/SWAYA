import { createPortal } from 'react-dom';
import { HelpCircle } from '@/ui/icons';
import Button from '../../../ui/Button';
import Checkbox from '../../../ui/Checkbox';
import styles from '@/ui/Modal.module.css';

export default function MatchModalConfirmDialog({
  confirmState,
  dontShowAgain,
  setDontShowAgain,
  onCancel,
  onConfirm,
  t,
}) {
  if (!confirmState || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles['confirm-overlay']}>
      <div className={styles['confirm-dialog']}>
        <div className={styles['confirm-header']}>
          <HelpCircle size={20} className={styles['confirm-icon']} />
          <strong className={styles['confirm-title']}>
            {t(`organizer.details.matchModal.confirm.${confirmState.type}.title`)}
          </strong>
        </div>
        <p className={styles['confirm-description']}>
          {confirmState.type === 'bucket'
            ? t('organizer.details.matchModal.confirm.bucket.desc')
            : confirmState.hasExisting
              ? t(`organizer.details.matchModal.confirm.${confirmState.type}.descWithExisting`).replace('{existing}', confirmState.existingDetails)
              : t(`organizer.details.matchModal.confirm.${confirmState.type}.descNoExisting`)}
        </p>
        <div className={styles['confirm-optout']}>
          <Checkbox
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          >
            {t('organizer.details.matchModal.confirm.dontShowAgain')}
          </Checkbox>
        </div>
        <div className={styles['confirm-actions']}>
          <Button
            type="button"
            variant="secondary-neutral"
            size="sm"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
          >
            {t('organizer.details.matchModal.confirm.confirmBtn')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

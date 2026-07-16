import Card from '@/ui/Card';
import Button from '@/ui/Button';
import Inline from '@/ui/Inline';
import styles from '../SettingsPage.module.css';

export default function SettingsErrorState({ t, onRetry, onClose }) {
  return (
    <div className="settings-overlay settings-overlay--centered">
      <Card
        title={t('settingsPage.errorTitle')}
        className={styles['settings-error-card']}
      >
        <div className={styles['settings-error-content']}>
          <span className="ui-field__hint">
            {t('settingsPage.errorText')}
          </span>
          <Inline gap="md" align="center" className={styles['settings-error-actions']}>
            <Button variant="primary" onClick={onRetry}>
              {t('settingsPage.retry')}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          </Inline>
        </div>
      </Card>
    </div>
  );
}

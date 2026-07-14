import Spinner from '@/ui/Spinner';
import styles from '../SettingsPage.module.css';

export default function SettingsLoadingState({ t }) {
  return (
    <div className="settings-overlay settings-overlay--centered">
      <div className={styles['settings-loading-state']}>
        <Spinner label={t('settingsPage.loading')} />
        <span className={styles['settings-loading-text']}>
          {t('settingsPage.loading')}
        </span>
      </div>
    </div>
  );
}

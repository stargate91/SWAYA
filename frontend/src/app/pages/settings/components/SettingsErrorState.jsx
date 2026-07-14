import styles from '../SettingsPage.module.css';

export default function SettingsErrorState({ t, onRetry, onClose }) {
  return (
    <div className="settings-overlay settings-overlay--centered">
      <div className={`ui-card ${styles['settings-error-card']}`}>
        <div className={styles['settings-error-content']}>
          <h2 className="ui-card__title">{t('settingsPage.errorTitle')}</h2>
          <span className="ui-field__hint">
            {t('settingsPage.errorText')}
          </span>
          <div className={styles['settings-error-actions']}>
            <button className="ui-button ui-button--primary" onClick={onRetry}>
              {t('settingsPage.retry')}
            </button>
            <button className="ui-button ui-button--secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

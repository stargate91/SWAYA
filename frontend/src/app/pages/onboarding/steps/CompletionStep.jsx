import { CheckCircle } from '@/ui/icons';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './CompletionStep.module.css';

export default function CompletionStep() {
  const { t } = useTranslation();

  return (
    <div className={styles['onboarding-completion-step']}>
      <div className={styles['success-icon-animation']}>
        <CheckCircle size={40} />
      </div>
      <h2>{t('onboarding.completion.title')}</h2>
      <p>{t('onboarding.completion.description')}</p>
    </div>
  );
}

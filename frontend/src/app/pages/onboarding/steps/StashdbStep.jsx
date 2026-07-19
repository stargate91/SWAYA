import { Key, Database } from '@/ui/icons';
import Button from '@/ui/Button';
import OnboardingInfoCard from '../components/OnboardingInfoCard';
import OnboardingOrbitHero from '../components/OnboardingOrbitHero';
import OnboardingPanelCard from '../components/OnboardingPanelCard';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './FormStep.module.css';

export default function StashdbStep({
  stashdbApiKey,
  setStashdbApiKey,
  stashdbEndpoint,
  setStashdbEndpoint,
  stashdbValidation,
  validateStashdb,
  isValidatingApi,
  onOpenDocs,
}) {
  const { t } = useTranslation();

  return (
    <div className="onboarding-split-layout">
      <OnboardingInfoCard
        visual={(
          <OnboardingOrbitHero
            icon={Database}
            chips={[
              { label: 'Scene Hub' },
              { label: 'Star Directory' },
              { label: 'Metadata Magic' },
            ]}
          />
        )}
        kicker={t('onboarding.stashdb.kicker', { defaultValue: 'Adult Metadata' })}
        title={t('onboarding.stashdb.heroTitle', { defaultValue: 'Configure StashDB' })}
        description={t('onboarding.stashdb.heroDesc', { defaultValue: 'StashDB provides scenes, performers, and studio metadata for your adult content library.' })}
        footerLabel={t('onboarding.stashdb.helpNeeded', { defaultValue: 'Need help?' })}
        footerValue={(
          <button 
            type="button"
            className={styles['footer-link-btn']}
            onClick={onOpenDocs}
          >
            {t('onboarding.stashdb.readDocs', { defaultValue: 'Read the documentation' })}
          </button>
        )}
        items={[
          {
            icon: Key,
            title: t('onboarding.stashdb.itemTitle', { defaultValue: 'API Key integration' }),
            description: t('onboarding.stashdb.itemDesc', { defaultValue: 'Generate an API key in your StashDB user settings page.' }),
          }
        ]}
      />

      <div className="tmdb-credentials-column">
        <OnboardingPanelCard
          eyebrow={t('onboarding.stashdb.eyebrow', { defaultValue: 'StashDB' })}
          title={t('onboarding.stashdb.title', { defaultValue: 'Set up StashDB scraper' })}
          meta={<div className="welcome-lang-pill">{t('onboarding.stashdb.optional', { defaultValue: 'Optional' })}</div>}
          description={t('onboarding.stashdb.description', { defaultValue: 'You can skip this step by continuing, or paste your API key to validate.' })}
          footerLabel={t('onboarding.stashdb.endpoint', { defaultValue: 'Endpoint' })}
          footerValue={stashdbEndpoint || 'https://stashdb.org/graphql'}
        >
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.stashdb.apiKeyLabel', { defaultValue: 'StashDB API Key' })}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="password" 
                value={stashdbApiKey}
                onChange={(e) => setStashdbApiKey(e.target.value)}
                placeholder={t('onboarding.stashdb.apiKeyPlaceholder', { defaultValue: 'Enter StashDB API Key' })}
              />
            </div>
          </div>
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.stashdb.endpointLabel', { defaultValue: 'GraphQL Endpoint' })}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="text" 
                value={stashdbEndpoint}
                onChange={(e) => setStashdbEndpoint(e.target.value)}
                placeholder="https://stashdb.org/graphql"
              />
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={validateStashdb}
            disabled={isValidatingApi || !stashdbApiKey}
          >
            {isValidatingApi ? (t('onboarding.stashdb.validating', { defaultValue: 'Validating...' })) : (t('onboarding.stashdb.validateBtn', { defaultValue: 'Validate Connection' }))}
          </Button>
          {stashdbValidation.valid !== null && (
            <div className={`${styles['onboarding-validation-status']} ${stashdbValidation.valid ? styles['success'] : styles['error']}`}>
              {stashdbValidation.message || (stashdbValidation.valid ? 'Successfully connected to StashDB!' : 'Validation failed. Please check your endpoint or API key.')}
            </div>
          )}
          <div className={styles['documentation-link-box']}>
            <p>{t('onboarding.stashdb.needHelpText', { defaultValue: 'Need help finding or generating your StashDB API credentials? Detailed instructions are available in the app settings help section.' })}</p>
            <button type="button" className={styles['doc-link-btn']} onClick={onOpenDocs}>
              {t('onboarding.stashdb.readDocs', { defaultValue: 'Read the documentation →' })}
            </button>
          </div>
        </OnboardingPanelCard>
      </div>
    </div>
  );
}

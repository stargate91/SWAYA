import { Key, Database } from '@/ui/icons';
import Button from '@/ui/Button';
import OnboardingInfoCard from '../components/OnboardingInfoCard';
import OnboardingOrbitHero from '../components/OnboardingOrbitHero';
import OnboardingPanelCard from '../components/OnboardingPanelCard';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './FormStep.module.css';

export default function FansdbStep({
  fansdbApiKey,
  setFansdbApiKey,
  fansdbEndpoint,
  setFansdbEndpoint,
  fansdbValidation,
  validateFansdb,
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
              { label: 'Creator Finder' },
              { label: 'Indie Vibes' },
              { label: 'Uncut Archive' },
            ]}
          />
        )}
        kicker={t('onboarding.fansdb.kicker', { defaultValue: 'Adult Metadata' })}
        title={t('onboarding.fansdb.heroTitle', { defaultValue: 'Configure FansDB' })}
        description={t('onboarding.fansdb.heroDesc', { defaultValue: 'FansDB specializes in matching metadata for content creators, models, and custom productions.' })}
        footerLabel={t('onboarding.fansdb.helpNeeded', { defaultValue: 'Need help?' })}
        footerValue={(
          <button 
            type="button"
            className={styles['footer-link-btn']}
            onClick={onOpenDocs}
          >
            {t('onboarding.fansdb.readDocs', { defaultValue: 'Read the documentation' })}
          </button>
        )}
        items={[
          {
            icon: Key,
            title: t('onboarding.fansdb.itemTitle', { defaultValue: 'API Key integration' }),
            description: t('onboarding.fansdb.itemDesc', { defaultValue: 'Retrieve your API key from your profile page on FansDB.' }),
          }
        ]}
      />

      <div className="tmdb-credentials-column">
        <OnboardingPanelCard
          eyebrow={t('onboarding.fansdb.eyebrow', { defaultValue: 'FansDB' })}
          title={t('onboarding.fansdb.title', { defaultValue: 'Set up FansDB scraper' })}
          meta={<div className="welcome-lang-pill">{t('onboarding.fansdb.optional', { defaultValue: 'Optional' })}</div>}
          description={t('onboarding.fansdb.description', { defaultValue: 'You can skip this step by continuing, or paste your API key to validate.' })}
          footerLabel={t('onboarding.fansdb.endpoint', { defaultValue: 'Endpoint' })}
          footerValue={fansdbEndpoint || 'https://fansdb.cc/graphql'}
        >
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.fansdb.apiKeyLabel', { defaultValue: 'FansDB API Key' })}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="password" 
                value={fansdbApiKey}
                onChange={(e) => setFansdbApiKey(e.target.value)}
                placeholder={t('onboarding.fansdb.apiKeyPlaceholder', { defaultValue: 'Enter FansDB API Key' })}
              />
            </div>
          </div>
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.fansdb.endpointLabel', { defaultValue: 'GraphQL Endpoint' })}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="text" 
                value={fansdbEndpoint}
                onChange={(e) => setFansdbEndpoint(e.target.value)}
                placeholder="https://fansdb.cc/graphql"
              />
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={validateFansdb}
            disabled={isValidatingApi || !fansdbApiKey}
          >
            {isValidatingApi ? (t('onboarding.fansdb.validating', { defaultValue: 'Validating...' })) : (t('onboarding.fansdb.validateBtn', { defaultValue: 'Validate Connection' }))}
          </Button>
          {fansdbValidation.valid !== null && (
            <div className={`${styles['onboarding-validation-status']} ${fansdbValidation.valid ? styles['success'] : styles['error']}`}>
              {fansdbValidation.message || (fansdbValidation.valid ? 'Successfully connected to FansDB!' : 'Validation failed. Please check your endpoint or API key.')}
            </div>
          )}
          <div className={styles['documentation-link-box']}>
            <p>{t('onboarding.fansdb.needHelpText', { defaultValue: 'Need help finding or generating your FansDB API credentials? Detailed instructions are available in the app settings help section.' })}</p>
            <button type="button" className={styles['doc-link-btn']} onClick={onOpenDocs}>
              {t('onboarding.fansdb.readDocs', { defaultValue: 'Read the documentation →' })}
            </button>
          </div>
        </OnboardingPanelCard>
      </div>
    </div>
  );
}

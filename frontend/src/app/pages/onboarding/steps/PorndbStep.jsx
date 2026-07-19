import { Key, Database } from '@/ui/icons';
import Button from '@/ui/Button';
import OnboardingInfoCard from '../components/OnboardingInfoCard';
import OnboardingOrbitHero from '../components/OnboardingOrbitHero';
import OnboardingPanelCard from '../components/OnboardingPanelCard';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './FormStep.module.css';

export default function PorndbStep({
  porndbApiKey,
  setPorndbApiKey,
  porndbEndpoint,
  setPorndbEndpoint,
  porndbValidation,
  validatePorndb,
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
              { label: 'Studio Catalog' },
              { label: 'Scene Indexer' },
              { label: 'Collector Dream' },
            ]}
          />
        )}
        kicker={t('onboarding.porndb.kicker', { defaultValue: 'Adult Metadata' })}
        title={t('onboarding.porndb.heroTitle', { defaultValue: 'Configure PornDB' })}
        description={t('onboarding.porndb.heroDesc', { defaultValue: 'PornDB helps scan, match, and organize files with scene metadata, cast databases, and studio entries.' })}
        footerLabel={t('onboarding.porndb.helpNeeded', { defaultValue: 'Need help?' })}
        footerValue={(
          <button 
            type="button"
            className={styles['footer-link-btn']}
            onClick={onOpenDocs}
          >
            {t('onboarding.porndb.readDocs', { defaultValue: 'Read the documentation' })}
          </button>
        )}
        items={[
          {
            icon: Key,
            title: t('onboarding.porndb.itemTitle', { defaultValue: 'API Key integration' }),
            description: t('onboarding.porndb.itemDesc', { defaultValue: 'Retrieve your API Read Access Token from your developer profile.' }),
          }
        ]}
      />

      <div className="tmdb-credentials-column">
        <OnboardingPanelCard
          eyebrow={t('onboarding.porndb.eyebrow', { defaultValue: 'PornDB' })}
          title={t('onboarding.porndb.title', { defaultValue: 'Set up PornDB scraper' })}
          meta={<div className="welcome-lang-pill">{t('onboarding.porndb.optional', { defaultValue: 'Optional' })}</div>}
          description={t('onboarding.porndb.description', { defaultValue: 'You can skip this step by continuing, or paste your API key to validate.' })}
          footerLabel={t('onboarding.porndb.endpoint', { defaultValue: 'Endpoint' })}
          footerValue={porndbEndpoint || 'https://theporndb.net/graphql'}
        >
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.porndb.apiKeyLabel', { defaultValue: 'PornDB API Key' })}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="password" 
                value={porndbApiKey}
                onChange={(e) => setPorndbApiKey(e.target.value)}
                placeholder={t('onboarding.porndb.apiKeyPlaceholder', { defaultValue: 'Enter PornDB API Key' })}
              />
            </div>
          </div>
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.porndb.endpointLabel', { defaultValue: 'GraphQL Endpoint' })}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="text" 
                value={porndbEndpoint}
                onChange={(e) => setPorndbEndpoint(e.target.value)}
                placeholder="https://theporndb.net/graphql"
              />
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={validatePorndb}
            disabled={isValidatingApi || !porndbApiKey}
          >
            {isValidatingApi ? (t('onboarding.porndb.validating', { defaultValue: 'Validating...' })) : (t('onboarding.porndb.validateBtn', { defaultValue: 'Validate Connection' }))}
          </Button>
          {porndbValidation.valid !== null && (
            <div className={`${styles['onboarding-validation-status']} ${porndbValidation.valid ? styles['success'] : styles['error']}`}>
              {porndbValidation.message || (porndbValidation.valid ? 'Successfully connected to PornDB!' : 'Validation failed. Please check your endpoint or API key.')}
            </div>
          )}
          <div className={styles['documentation-link-box']}>
            <p>{t('onboarding.porndb.needHelpText', { defaultValue: 'Need help finding or generating your PornDB API credentials? Detailed instructions are available in the app settings help section.' })}</p>
            <button type="button" className={styles['doc-link-btn']} onClick={onOpenDocs}>
              {t('onboarding.porndb.readDocs', { defaultValue: 'Read the documentation →' })}
            </button>
          </div>
        </OnboardingPanelCard>
      </div>
    </div>
  );
}

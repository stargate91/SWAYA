import { Key } from '@/ui/icons';
import Button from '@/ui/Button';
import OnboardingInfoCard from '../components/OnboardingInfoCard';
import OnboardingOrbitHero from '../components/OnboardingOrbitHero';
import OnboardingPanelCard from '../components/OnboardingPanelCard';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './FormStep.module.css';

export default function TmdbStep({
  tmdbApiKey,
  setTmdbApiKey,
  tmdbBearerToken,
  setTmdbBearerToken,
  tmdbValidation,
  validateTmdb,
  isValidatingApi,
  onOpenDocs,
}) {
  const { t } = useTranslation();

  return (
    <div className="onboarding-split-layout">
      <OnboardingInfoCard
        visual={(
          <OnboardingOrbitHero
            icon={Key}
            chips={[
              { label: 'Movie Catalog' },
              { label: 'Art Finder' },
              { label: 'Cast Info' },
            ]}
          />
        )}
        kicker={t('onboarding.tmdbGuide.eyebrow', { defaultValue: 'Metadata Access' })}
        title={t('onboarding.tmdbGuide.activateTmdb', { defaultValue: 'Activate TMDB access' })}
        description={t('onboarding.tmdbGuide.scanningLimitedDesc', { defaultValue: 'SWAYA needs TMDB before scanning can do real metadata matching, artwork lookups, and clean organization.' })}
        footerLabel={t('onboarding.tmdbGuide.helpNeeded', { defaultValue: 'Need help?' })}
        footerValue={(
          <button 
            type="button"
            className={styles['footer-link-btn']}
            onClick={onOpenDocs}
          >
            {t('onboarding.tmdbGuide.readDocs', { defaultValue: 'Read the documentation' })}
          </button>
        )}
        items={[
          {
            icon: Key,
            title: t('onboarding.tmdbGuide.requiredOneTimeSetup', { defaultValue: 'One-time setup' }),
            description: t('onboarding.tmdbGuide.scanningLimited', { defaultValue: 'Without TMDb, scanning runs in offline-only mode with basic metadata.' }),
          }
        ]}
      />

      <div className="tmdb-credentials-column">
        <OnboardingPanelCard
          eyebrow={t('onboarding.tmdb.eyebrow') || 'TMDB credentials'}
          title={t('onboarding.tmdb.title') || 'Paste your TMDB keys to unlock scanning'}
          meta={<div className="welcome-lang-pill">{t('onboarding.tmdb.optionalFields', { defaultValue: 'Optional fields' })}</div>}
          description={t('onboarding.tmdb.description') || 'You can skip this step or paste your keys and validate them below.'}
          footerLabel={t('onboarding.tmdb.offlineScan', { defaultValue: 'Offline Mode' })}
          footerValue={t('onboarding.tmdb.offlineScanActive', { defaultValue: 'Leave empty for local file scanning only' })}
        >
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.tmdb.apiKeyLabel')}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="text" 
                value={tmdbApiKey}
                onChange={(e) => setTmdbApiKey(e.target.value)}
                placeholder={t('onboarding.tmdb.apiKeyPlaceholder') || 'Enter TMDB API Key'}
              />
            </div>
          </div>
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.tmdb.readAccessTokenLabel')}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="text" 
                value={tmdbBearerToken}
                onChange={(e) => setTmdbBearerToken(e.target.value)}
                placeholder={t('onboarding.tmdb.bearerTokenPlaceholder') || 'Enter TMDB bearer token'}
              />
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={validateTmdb}
            disabled={isValidatingApi || (!tmdbApiKey && !tmdbBearerToken)}
          >
            {isValidatingApi ? (t('onboarding.tmdb.validating') || 'Validating...') : (t('onboarding.tmdb.validateBtn') || 'Validate Credentials')}
          </Button>
          {tmdbValidation.valid !== null && (
            <div className={`${styles['onboarding-validation-status']} ${tmdbValidation.valid ? styles['success'] : styles['error']}`}>
              {tmdbValidation.message}
            </div>
          )}
          <div className={styles['documentation-link-box']}>
            <p>{t('onboarding.tmdbGuide.needHelpText', { defaultValue: 'Need help finding or generating your TMDb API credentials? Detailed instructions are available in the app settings help section.' })}</p>
            <button type="button" className={styles['doc-link-btn']} onClick={onOpenDocs}>
              {t('onboarding.tmdbGuide.readDocs', { defaultValue: 'Read the documentation →' })}
            </button>
          </div>
        </OnboardingPanelCard>
      </div>
    </div>
  );
}


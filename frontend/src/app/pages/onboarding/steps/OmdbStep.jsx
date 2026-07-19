import { Key } from '@/ui/icons';
import Button from '@/ui/Button';
import OnboardingInfoCard from '../components/OnboardingInfoCard';
import OnboardingOrbitHero from '../components/OnboardingOrbitHero';
import OnboardingPanelCard from '../components/OnboardingPanelCard';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './FormStep.module.css';

export default function OmdbStep({
  omdbApiKey,
  setOmdbApiKey,
  omdbValidation,
  validateOmdb,
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
              { label: 'Score Card' },
              { label: 'Review Radar' },
              { label: 'Tomato Meter' },
            ]}
          />
        )}
        kicker={t('onboarding.omdbGuide.eyebrow', { defaultValue: 'Ratings Integration' })}
        title={t('onboarding.omdbGuide.ratingsPurpose', { defaultValue: 'Activate OMDb ratings' })}
        description={t('onboarding.omdbGuide.ratingsPurposeDesc', { defaultValue: 'SWAYA uses OMDb for IMDb, Metascore, and Rotten Tomatoes ratings during enrichment.' })}
        footerLabel={t('onboarding.omdbGuide.helpNeeded', { defaultValue: 'Need help?' })}
        footerValue={(
          <button 
            type="button"
            className={styles['footer-link-btn']}
            onClick={onOpenDocs}
          >
            {t('onboarding.omdbGuide.readDocs', { defaultValue: 'Read the documentation' })}
          </button>
        )}
        items={[
          {
            icon: Key,
            title: t('onboarding.omdbGuide.ratingsPurpose', { defaultValue: 'Ratings & Scores' }),
            description: t('onboarding.omdbGuide.ratingsMetricsDesc', { defaultValue: 'These ratings are displayed on detail pages for movies and shows.' }),
          }
        ]}
      />

      <div className="tmdb-credentials-column">
        <OnboardingPanelCard
          eyebrow={t('onboarding.omdb.eyebrow') || 'OMDb key'}
          title={t('onboarding.omdb.title') || 'Paste your OMDb key to unlock ratings'}
          meta={<div className="welcome-lang-pill">{t('onboarding.omdb.optionalField', { defaultValue: 'Optional field' })}</div>}
          description={t('onboarding.omdb.description') || 'This key is used before SWAYA can enrich items with ratings data.'}
          footerLabel={t('onboarding.omdb.offlineScan', { defaultValue: 'Offline Mode' })}
          footerValue={t('onboarding.omdb.offlineScanActive', { defaultValue: 'Leave empty for local file scanning only' })}
        >
          <div className={styles['onboarding-form-group']}>
            <label>{t('onboarding.omdb.apiKeyLabel')}</label>
            <div className={styles['onboarding-input-wrapper']}>
              <input 
                type="text" 
                value={omdbApiKey}
                onChange={(e) => setOmdbApiKey(e.target.value)}
                placeholder={t('onboarding.omdb.apiKeyPlaceholder') || 'Enter OMDb API Key'}
              />
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={validateOmdb}
            disabled={isValidatingApi || !omdbApiKey}
          >
            {isValidatingApi ? (t('onboarding.omdb.validating') || 'Validating...') : (t('onboarding.omdb.validateBtn') || 'Validate Key')}
          </Button>
          {omdbValidation.valid !== null && (
            <div className={`${styles['onboarding-validation-status']} ${omdbValidation.valid ? styles['success'] : styles['error']}`}>
              {omdbValidation.message}
            </div>
          )}
          <div className={styles['documentation-link-box']}>
            <p>{t('onboarding.omdbGuide.needHelpText', { defaultValue: 'Need a free OMDb API key to fetch movie ratings? You can request a free key on the OMDb website.' })}</p>
            <button type="button" className={styles['doc-link-btn']} onClick={onOpenDocs}>
              {t('onboarding.omdbGuide.readDocs', { defaultValue: 'Read the documentation →' })}
            </button>
          </div>
        </OnboardingPanelCard>
      </div>
    </div>
  );
}

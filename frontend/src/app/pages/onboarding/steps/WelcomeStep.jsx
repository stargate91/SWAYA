import { Globe, Languages, SlidersHorizontal, Search, CheckCircle, Check } from '@/ui/icons';
import OnboardingInfoCard from '../components/OnboardingInfoCard';
import OnboardingOrbitHero from '../components/OnboardingOrbitHero';
import OnboardingPanelCard from '../components/OnboardingPanelCard';
import { useTranslation } from '@/providers/LanguageContext';
import Inline from '@/ui/Inline';
import styles from './WelcomeStep.module.css';

export default function WelcomeStep({
  locale,
  setLocale,
  filteredLanguages,
  langSearch,
  setLangSearch,
  availableLanguages,
}) {
  const { t } = useTranslation();

  return (
    <div className="onboarding-split-layout">
      <OnboardingInfoCard
        visual={(
          <OnboardingOrbitHero
            icon={Globe}
            chips={[
              { label: 'Hello!', position: 'top-right' },
              { label: 'Szia!', position: 'bottom-left' },
              { label: 'Global Vibe', position: 'top-left' },
            ]}
          />
        )}
        kicker={t('onboarding.welcome.kicker') || 'Getting started'}
        title={t('onboarding.welcome.heroTitle') || 'A few quick steps and you are ready.'}
        description={t('onboarding.welcome.heroDesc') || 'You can revisit everything later in Settings.'}
        items={[
          {
            icon: Languages,
            title: t('onboarding.welcome.step1Title') || 'Step 1 of 6',
            description: t('onboarding.welcome.step1Desc') || 'After this, we move on to metadata access and library folders.',
          },
          {
            icon: SlidersHorizontal,
            title: t('onboarding.welcome.appWideTitle') || 'One setup, app-wide',
            description: t('onboarding.welcome.appWideDesc') || 'These preferences shape how SWAYA behaves across the rest of the app.',
          },
        ]}
      />

      <OnboardingPanelCard
        eyebrow={t('onboarding.welcome.eyebrow') || 'Step 1'}
        title={t('onboarding.welcome.title') || 'Choose your interface language'}
        meta={(
          <div className="welcome-lang-pill">{filteredLanguages.length} {t('onboarding.welcome.options')}</div>
        )}
        description={t('onboarding.welcome.description') || 'Select your interface language to begin setup.'}
        footerLabel={t('onboarding.welcome.footerLabel') || 'Current selection'}
        footerValue={availableLanguages.find((lang) => lang.code === locale)?.name || 'English'}
      >
        <div className={styles['lang-search-wrapper']}>
          <Search size={16} className={styles['lang-search-icon']} />
          <input 
            type="text" 
            placeholder={t('onboarding.welcome.searchPlaceholder') || 'Search languages...'} 
            value={langSearch}
            onChange={(e) => setLangSearch(e.target.value)}
          />
        </div>

        <div className={styles['welcome-lang-active-note']}>
          <CheckCircle size={16} />
          {t('onboarding.welcome.englishOnlyActiveNote')}
        </div>

        <div className={styles['language-list-scroll']}>
          {filteredLanguages.map((lang) => {
            return (
              // eslint-disable-next-line jsx-a11y/no-static-element-interactions
              <div 
                key={lang.code}
                className={`${styles['language-row-item']} ${locale === lang.code ? styles['is-selected'] : ''} ${!lang.active ? styles['is-disabled'] : ''}`}
                onClick={() => lang.active && setLocale(lang.code)}
              >
                <Inline gap="md" align="center" className="lang-row-left">
                  <span className={styles['lang-row-flag-frame']}>
                    <span className={styles['lang-row-flag-glow']} />
                    <img src={lang.flagUrl} alt={lang.name} className={styles['lang-row-flag-img']} />
                  </span>
                  <span className={styles['lang-row-name']}>{lang.name}</span>
                </Inline>
                {locale === lang.code && <Check size={16} className={styles['lang-checked-icon']} />}
                {!lang.active && <span className={styles['lang-coming-soon']}>{t('onboarding.welcome.comingSoon')}</span>}
              </div>
            );
          })}
        </div>
      </OnboardingPanelCard>
    </div>
  );
}

import { Cpu, FileJson } from '@/ui/icons';
import OnboardingInfoCard from '../OnboardingInfoCard';
import OnboardingOrbitHero from '../OnboardingOrbitHero';
import OnboardingPanelCard from '../OnboardingPanelCard';
import { useTranslation } from '@/providers/LanguageContext';

export default function ChoiceStep({
  configChoice,
  setConfigChoice,
  isImporting,
  handleFileImport,
}) {
  const { t } = useTranslation();

  return (
    <div className="onboarding-split-layout">
      <OnboardingInfoCard
        visual={(
          <OnboardingOrbitHero
            icon={Cpu}
            chips={[
              { label: 'Setup', position: 'top-right' },
              { label: 'Import', position: 'bottom-left' },
              { label: 'Profile', position: 'top-left' },
            ]}
          />
        )}
        kicker={t('onboarding.choice.kicker') || 'Setup path'}
        title={t('onboarding.choice.heroTitle') || 'Choose how you want to begin.'}
        description={t('onboarding.choice.heroDesc') || 'Start from scratch or bring in a saved profile.'}
        items={[
          {
            icon: Cpu,
            title: t('onboarding.choice.step2Title') || 'Step 2 of 6',
            description: t('onboarding.choice.step2Desc') || 'This decides whether the next steps build a fresh setup or use an existing one.',
          },
          {
            icon: FileJson,
            title: t('onboarding.choice.flexibleTitle') || 'Flexible either way',
            description: t('onboarding.choice.flexibleDesc') || 'You can keep going manually or jump ahead by importing a backup file.',
          },
        ]}
      />

      <OnboardingPanelCard
        className="onboarding-choice-panel"
        eyebrow={t('onboarding.choice.eyebrow') || 'Step 2'}
        title={t('onboarding.choice.title') || 'How would you like to continue?'}
        meta={<div className="welcome-lang-pill">{configChoice === 'new' ? (t('onboarding.choice.freshSetup') || 'Fresh setup') : (t('onboarding.choice.importProfile') || 'Import profile')}</div>}
        description={t('onboarding.choice.description') || 'Pick the setup path that fits how you want to configure SWAYA.'}
        footerLabel={t('onboarding.choice.footerLabel') || 'Current mode'}
        footerValue={configChoice === 'new' ? (t('onboarding.choice.configScratch') || 'Configure from scratch') : (t('onboarding.choice.importBackup') || 'Import from backup')}
      >
        <div className="onboarding-choice-step">
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div 
            className={`onboarding-choice-card ${configChoice === 'new' ? 'is-selected' : ''}`}
            onClick={() => setConfigChoice('new')}
          >
            <div className="choice-icon-wrapper">
              <Cpu size={24} />
            </div>
            <h3>{t('onboarding.choice.configureNewSetup')}</h3>
            <p>{t('onboarding.choice.configureNewSetupDesc')}</p>
          </div>

          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div 
            className={`onboarding-choice-card ${configChoice === 'import' ? 'is-selected' : ''}`}
            onClick={() => setConfigChoice('import')}
          >
            <div className="choice-icon-wrapper">
              <FileJson size={24} />
            </div>
            <h3>{t('onboarding.choice.importBackupProfile')}</h3>
            <p>{t('onboarding.choice.importBackupProfileDesc')}</p>
            
            <div className={`onboarding-choice-action-slot ${configChoice === 'import' ? 'is-active' : ''}`}>
              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
              <div className="onboarding-dropzone" onClick={(e) => e.stopPropagation()}>
                <label className="onboarding-dropzone-label">
                  <p>{isImporting ? (t('onboarding.choice.importingSettings') || 'Importing settings...') : (t('onboarding.choice.browseJson') || 'Click to Browse JSON')}</p>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="onboarding-hidden-input"
                    onChange={handleFileImport}
                    disabled={isImporting || configChoice !== 'import'}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </OnboardingPanelCard>
    </div>
  );
}

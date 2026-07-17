import { FolderOpen, CheckCircle } from '@/ui/icons';
import Button from '@/ui/Button';
import OnboardingInfoCard from '../components/OnboardingInfoCard';
import OnboardingPanelCard from '../components/OnboardingPanelCard';
import OnboardingOrbitHero from '../components/OnboardingOrbitHero';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './FormStep.module.css';

export default function FolderStep({
  scanDir,
  setScanDir,
  pickScanDir,
  libraryPath,
  setLibraryPath,
  pickLibraryPath,
  validateDirs,
  isValidatingFolders,
  folderValidation,
}) {
  const { t } = useTranslation();

  return (
    <div className="onboarding-split-layout">
      <OnboardingInfoCard
        visual={(
          <OnboardingOrbitHero
            icon={FolderOpen}
            chips={[
              { label: 'Scan folder' },
              { label: 'Library' },
              { label: 'Organize' },
            ]}
          />
        )}
        kicker={t('onboarding.folder.kicker') || 'Library paths'}
        title={t('onboarding.folder.heroTitle') || 'Choose where SWAYA should work.'}
        description={t('onboarding.folder.heroDesc') || 'Set the source folder SWAYA watches and, if you want, the clean library destination it should build into.'}
        items={[
          {
            icon: FolderOpen,
            title: t('onboarding.folder.step5Title') || 'Step 6 of 7',
            description: t('onboarding.folder.step5Desc') || 'This tells SWAYA where your unorganized files live and where finished media can go.',
          },
          {
            icon: CheckCircle,
            title: t('onboarding.folder.validateTitle') || 'Validate before continuing',
            description: t('onboarding.folder.validateDesc') || 'SWAYA checks the folders now so the first scan does not fail later.',
          },
        ]}
      />

      <OnboardingPanelCard
        eyebrow={t('onboarding.folder.eyebrow') || 'Step 6'}
        title={t('onboarding.folder.title') || 'Set your library folders'}
        meta={<div className="welcome-lang-pill">{t('onboarding.folder.pathsRequired')}</div>}
        description={t('onboarding.folder.description') || 'Pick the folders SWAYA should read from and organize into.'}
        footerLabel={t('onboarding.folder.footerLabel') || 'Required to continue'}
        footerValue={t('onboarding.folder.footerValue') || 'Validate the folder setup first'}
      >
        <div className={styles['onboarding-form-group']}>
          <label>{t('onboarding.folder.scanSourceDirectory')}</label>
          <div className={styles['onboarding-input-wrapper']}>
            <input 
              type="text" 
              value={scanDir}
              onChange={(e) => setScanDir(e.target.value)}
              placeholder={t('onboarding.folder.scanPlaceholder') || 'Select source folder (optional)'}
            />
            <Button variant="secondary" onClick={pickScanDir}>{t('onboarding.folder.browse')}</Button>
          </div>
        </div>
        <div className={styles['onboarding-form-group']}>
          <label>{t('onboarding.folder.targetLibraryDirectory')}</label>
          <div className={styles['onboarding-input-wrapper']}>
            <input 
              type="text" 
              value={libraryPath}
              onChange={(e) => setLibraryPath(e.target.value)}
              placeholder={t('onboarding.folder.targetPlaceholder') || 'Select target library folder'}
            />
            <Button variant="secondary" onClick={pickLibraryPath}>{t('onboarding.folder.browse')}</Button>
          </div>
        </div>
        <Button 
          variant="secondary" 
          onClick={validateDirs}
          disabled={isValidatingFolders}
        >
          {isValidatingFolders ? (t('onboarding.folder.validating') || 'Validating...') : (t('onboarding.folder.validateBtn') || 'Validate Folders')}
        </Button>
        {folderValidation.valid !== null && (
          <div className={`${styles['onboarding-validation-status']} ${folderValidation.valid ? styles['success'] : styles['error']}`}>
            {folderValidation.message}
          </div>
        )}
      </OnboardingPanelCard>
    </div>
  );
}

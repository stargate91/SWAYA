import { FolderOpen, CheckCircle, Library, FolderTree } from '@/ui/icons';
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
  orgMode,
  setOrgMode,
}) {
  const { t } = useTranslation();

  const options = [
    {
      id: 'register',
      icon: Library,
      title: t('onboarding.folder.registerTitle', { defaultValue: 'Register Only' }),
      desc: t('onboarding.folder.registerDesc', { defaultValue: 'Imports metadata to the database, leaving files completely untouched.' }),
    },
    {
      id: 'rename_inplace',
      icon: FolderOpen,
      title: t('onboarding.folder.renameTitle', { defaultValue: 'Rename In-Place' }),
      desc: t('onboarding.folder.renameDesc', { defaultValue: 'Renames and formats files directly in their current directories.' }),
    },
    {
      id: 'move_organize',
      icon: FolderTree,
      title: t('onboarding.folder.moveTitle', { defaultValue: 'Move & Organize' }),
      desc: t('onboarding.folder.moveDesc', { defaultValue: 'Renames, structures, and moves files into a dedicated target folder.' }),
    },
  ];

  const activeOption = options.find((opt) => opt.id === orgMode) || options[0];

  return (
    <div className="onboarding-split-layout">
      <OnboardingInfoCard
        visual={(
          <OnboardingOrbitHero
            icon={FolderOpen}
            chips={[
              { label: 'Watch Zone' },
              { label: 'Media Vault' },
              { label: 'Tidy Up' },
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
        meta={<div className="welcome-lang-pill">{activeOption.title}</div>}
        description={t('onboarding.folder.description') || 'Pick the folders SWAYA should read from and organize into.'}
        footerLabel={t('onboarding.folder.footerLabel') || 'Required to continue'}
        footerValue={orgMode === 'move_organize' ? t('onboarding.folder.footerValue') || 'Validate the folder setup first' : t('onboarding.buttons.continue') || 'Continue'}
      >
        <div className={styles['onboarding-form-group']}>
          <label>{t('onboarding.folder.modeTitle', { defaultValue: 'Organization Mode' })}</label>
          <div className={styles['onboarding-mode-step']}>
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = orgMode === opt.id;
              return (
                /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
                <div
                  key={opt.id}
                  className={`${styles['onboarding-type-card']} ${isSelected ? styles['is-selected'] : ''}`}
                  onClick={() => setOrgMode(opt.id)}
                >
                  <div className={styles['type-icon-wrapper']}>
                    <Icon size={18} />
                  </div>
                  <div className={styles['card-text-content']}>
                    <h3>{opt.title}</h3>
                    <p>{opt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

        {orgMode === 'move_organize' && (
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
        )}

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

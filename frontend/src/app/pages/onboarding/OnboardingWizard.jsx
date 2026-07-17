import { useState } from 'react';
import Button from '@/ui/Button';
import { ArrowRight, ArrowLeft } from '@/ui/icons';
import './OnboardingWizard.css';
import { useTranslation } from '@/providers/LanguageContext';
import { useSettingsQuery, useUpdateSettingsMutation } from '@/queries';
import Overlay from '@/ui/Overlay';
import Lightbox from '@/ui/Lightbox';
import DocsWizardPanel from '@/pages/about/components/DocsWizardPanel';
import useOnboardingState from './hooks/useOnboardingState';

const BRAND_TEXT = 'SWAYA';

import WelcomeStep from './steps/WelcomeStep';
import ChoiceStep from './steps/ChoiceStep';
import ProfileStep from './steps/ProfileStep';
import TmdbStep from './steps/TmdbStep';
import OmdbStep from './steps/OmdbStep';
import FolderStep from './steps/FolderStep';
import CompletionStep from './steps/CompletionStep';
import OnboardingTimeline from './components/OnboardingTimeline';

function DocsModalOverlay({ docsModal, onClose, settings, updateSettingsMutation, t }) {
  const [wizardStep, setWizardStep] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  return (
    <Overlay centered onClose={onClose}>
      <Overlay.ContentWrapper className="onboarding-docs-modal">
        <Overlay.Content>
          <div className="settings-tab-content">
            <DocsWizardPanel
              activeTab={docsModal}
              wizardStep={wizardStep}
              setWizardStep={setWizardStep}
              settings={settings}
              updateSettingsMutation={updateSettingsMutation}
              setActiveLightboxUrl={setLightboxUrl}
              t={t}
            />
          </div>
        </Overlay.Content>
      </Overlay.ContentWrapper>
      {lightboxUrl && (
        <Lightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </Overlay>
  );
}

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const {
    locale,
    setLocale,
    step,
    stepDirection,
    configChoice,
    setConfigChoice,
    isImporting,
    handleFileImport,
    langSearch,
    setLangSearch,
    AVAILABLE_LANGUAGES,
    filteredLanguages,
    userName,
    setUserName,
    avatarPath,
    setAvatarPath,
    tmdbApiKey,
    setTmdbApiKey,
    tmdbBearerToken,
    setTmdbBearerToken,
    tmdbValidation,
    validateTmdb,
    isValidatingApi,
    omdbApiKey,
    setOmdbApiKey,
    omdbValidation,
    validateOmdb,
    scanDir,
    setScanDir,
    pickScanDir,
    libraryPath,
    setLibraryPath,
    pickLibraryPath,
    validateDirs,
    isValidatingFolders,
    folderValidation,
    isFinishing,
    handleFinish,
    handlePrev,
    handleNext,
    docsModal,
    setDocsModal,
  } = useOnboardingState();

  const { data: settings = {} } = useSettingsQuery();
  const updateSettingsMutation = useUpdateSettingsMutation();

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-container">

        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-title-group">
            <h1>{BRAND_TEXT}</h1>
          </div>
          <OnboardingTimeline step={step} isAnyGuideOpen={false} />
        </div>

        {/* Content Panel */}
        <div className="onboarding-content">
          <div key={step} className={`step-transition step-transition--${stepDirection}`}>

            {/* Step 1: Welcome & Lang */}
            {step === 1 && (
              <WelcomeStep
                locale={locale}
                setLocale={setLocale}
                filteredLanguages={filteredLanguages}
                langSearch={langSearch}
                setLangSearch={setLangSearch}
                availableLanguages={AVAILABLE_LANGUAGES}
              />
            )}

            {/* Step 2: Config Choice */}
            {step === 2 && (
              <ChoiceStep
                configChoice={configChoice}
                setConfigChoice={setConfigChoice}
                isImporting={isImporting}
                handleFileImport={handleFileImport}
              />
            )}

            {/* Step 3: Profile Builder */}
            {step === 3 && (
              <ProfileStep
                userName={userName}
                setUserName={setUserName}
                avatarPath={avatarPath}
                setAvatarPath={setAvatarPath}
              />
            )}

            {/* Step 4: TMDB API Setup */}
            {step === 4 && (
              <TmdbStep
                tmdbApiKey={tmdbApiKey}
                setTmdbApiKey={setTmdbApiKey}
                tmdbBearerToken={tmdbBearerToken}
                setTmdbBearerToken={setTmdbBearerToken}
                tmdbValidation={tmdbValidation}
                validateTmdb={validateTmdb}
                isValidatingApi={isValidatingApi}
                onOpenDocs={() => setDocsModal('docs_tmdb')}
              />
            )}

            {/* Step 5: OMDB API Setup */}
            {step === 5 && (
              <OmdbStep
                omdbApiKey={omdbApiKey}
                setOmdbApiKey={setOmdbApiKey}
                omdbValidation={omdbValidation}
                validateOmdb={validateOmdb}
                isValidatingApi={isValidatingApi}
                onOpenDocs={() => setDocsModal('docs_omdb')}
              />
            )}

            {/* Step 6: Folders Setup */}
            {step === 6 && (
              <FolderStep
                scanDir={scanDir}
                setScanDir={setScanDir}
                pickScanDir={pickScanDir}
                libraryPath={libraryPath}
                setLibraryPath={setLibraryPath}
                pickLibraryPath={pickLibraryPath}
                validateDirs={validateDirs}
                isValidatingFolders={isValidatingFolders}
                folderValidation={folderValidation}
              />
            )}

            {/* Step 7: Completion */}
            {step === 7 && <CompletionStep />}

          </div>
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <>
            {step > 1 && step < 7 ? (
              <Button variant="onboarding-back" leftIcon={<ArrowLeft size={14} />} animateIcon onClick={handlePrev}>
                {t('common.back')}
              </Button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <Button
                variant="onboarding-continue"
                rightIcon={<ArrowRight size={14} />}
                animateIcon
                onClick={handleNext}
                disabled={
                  (step === 2 && configChoice === 'import') ||
                  (step === 3 && !userName.trim())
                }
              >
                {t('onboarding.buttons.continue')}
              </Button>
            ) : step === 6 ? (
              <Button
                variant="onboarding-continue"
                rightIcon={<ArrowRight size={14} />}
                animateIcon
                onClick={handleNext}
              >
                {t('onboarding.buttons.continue')}
              </Button>
            ) : (
              <Button
                variant="onboarding-continue"
                onClick={handleFinish}
                disabled={isFinishing}
              >
                {isFinishing ? t('onboarding.buttons.saving') : t('onboarding.buttons.finishSetup')}
              </Button>
            )}
          </>
        </div>

      </div>

      {/* Docs Modal Overlay */}
      {docsModal && (
        <DocsModalOverlay
          docsModal={docsModal}
          onClose={() => setDocsModal(null)}
          settings={settings}
          updateSettingsMutation={updateSettingsMutation}
          t={t}
        />
      )}
    </div>
  );
}

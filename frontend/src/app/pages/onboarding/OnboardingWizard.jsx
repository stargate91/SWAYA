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
import ContentTypeStep from './steps/ContentTypeStep';
import TmdbStep from './steps/TmdbStep';
import OmdbStep from './steps/OmdbStep';
import StashdbStep from './steps/StashdbStep';
import FansdbStep from './steps/FansdbStep';
import PorndbStep from './steps/PorndbStep';
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
    stepsList,
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
    contentTypeChoice,
    setContentTypeChoice,
    tmdbApiKey,
    setTmdbApiKey,
    tmdbBearerToken,
    setTmdbBearerToken,
    tmdbValidation,
    validateTmdb,
    omdbApiKey,
    setOmdbApiKey,
    omdbValidation,
    validateOmdb,
    stashdbApiKey,
    setStashdbApiKey,
    stashdbEndpoint,
    setStashdbEndpoint,
    stashdbValidation,
    validateStashdb,
    fansdbApiKey,
    setFansdbApiKey,
    fansdbEndpoint,
    setFansdbEndpoint,
    fansdbValidation,
    validateFansdb,
    porndbApiKey,
    setPorndbApiKey,
    porndbEndpoint,
    setPorndbEndpoint,
    porndbValidation,
    validatePorndb,
    isValidatingApi,
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
    orgMode,
    setOrgMode,
  } = useOnboardingState();

  const { data: settings = {} } = useSettingsQuery();
  const updateSettingsMutation = useUpdateSettingsMutation();

  const currentStepKey = stepsList[step - 1];

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-container">

        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-title-group">
            <h1>{BRAND_TEXT}</h1>
          </div>
          <OnboardingTimeline step={step} totalSteps={stepsList.length} isAnyGuideOpen={false} />
        </div>

        {/* Content Panel */}
        <div className="onboarding-content">
          <div key={step} className={`step-transition step-transition--${stepDirection}`}>

            {/* Step: Welcome & Lang */}
            {currentStepKey === 'welcome' && (
              <WelcomeStep
                locale={locale}
                setLocale={setLocale}
                filteredLanguages={filteredLanguages}
                langSearch={langSearch}
                setLangSearch={setLangSearch}
                availableLanguages={AVAILABLE_LANGUAGES}
              />
            )}

            {/* Step: Config Choice */}
            {currentStepKey === 'choice' && (
              <ChoiceStep
                configChoice={configChoice}
                setConfigChoice={setConfigChoice}
                isImporting={isImporting}
                handleFileImport={handleFileImport}
              />
            )}

            {/* Step: Profile Builder */}
            {currentStepKey === 'profile' && (
              <ProfileStep
                userName={userName}
                setUserName={setUserName}
                avatarPath={avatarPath}
                setAvatarPath={setAvatarPath}
              />
            )}

            {/* Step: Content Type Choice */}
            {currentStepKey === 'content-type' && (
              <ContentTypeStep
                contentTypeChoice={contentTypeChoice}
                setContentTypeChoice={setContentTypeChoice}
              />
            )}

            {/* Step: TMDB API Setup */}
            {currentStepKey === 'tmdb' && (
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

            {/* Step: OMDB API Setup */}
            {currentStepKey === 'omdb' && (
              <OmdbStep
                omdbApiKey={omdbApiKey}
                setOmdbApiKey={setOmdbApiKey}
                omdbValidation={omdbValidation}
                validateOmdb={validateOmdb}
                isValidatingApi={isValidatingApi}
                onOpenDocs={() => setDocsModal('docs_omdb')}
              />
            )}

            {/* Step: StashDB API Setup */}
            {currentStepKey === 'stashdb' && (
              <StashdbStep
                stashdbApiKey={stashdbApiKey}
                setStashdbApiKey={setStashdbApiKey}
                stashdbEndpoint={stashdbEndpoint}
                setStashdbEndpoint={setStashdbEndpoint}
                stashdbValidation={stashdbValidation}
                validateStashdb={validateStashdb}
                isValidatingApi={isValidatingApi}
                onOpenDocs={() => setDocsModal('docs_stashdb')}
              />
            )}

            {/* Step: FansDB API Setup */}
            {currentStepKey === 'fansdb' && (
              <FansdbStep
                fansdbApiKey={fansdbApiKey}
                setFansdbApiKey={setFansdbApiKey}
                fansdbEndpoint={fansdbEndpoint}
                setFansdbEndpoint={setFansdbEndpoint}
                fansdbValidation={fansdbValidation}
                validateFansdb={validateFansdb}
                isValidatingApi={isValidatingApi}
                onOpenDocs={() => setDocsModal('docs_fansdb')}
              />
            )}

            {/* Step: PornDB API Setup */}
            {currentStepKey === 'porndb' && (
              <PorndbStep
                porndbApiKey={porndbApiKey}
                setPorndbApiKey={setPorndbApiKey}
                porndbEndpoint={porndbEndpoint}
                setPorndbEndpoint={setPorndbEndpoint}
                porndbValidation={porndbValidation}
                validatePorndb={validatePorndb}
                isValidatingApi={isValidatingApi}
                onOpenDocs={() => setDocsModal('docs_porndb')}
              />
            )}

            {/* Step: Folders Setup */}
            {currentStepKey === 'folders' && (
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
                orgMode={orgMode}
                setOrgMode={setOrgMode}
              />
            )}

            {/* Step: Completion */}
            {currentStepKey === 'completion' && <CompletionStep />}

          </div>
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <>
            {step > 1 && currentStepKey !== 'completion' ? (
              <Button variant="onboarding-back" leftIcon={<ArrowLeft size={14} />} animateIcon onClick={handlePrev}>
                {t('common.back')}
              </Button>
            ) : (
              <div />
            )}

            {currentStepKey !== 'folders' && currentStepKey !== 'completion' ? (
              <Button
                variant="onboarding-continue"
                rightIcon={<ArrowRight size={14} />}
                animateIcon
                onClick={handleNext}
                disabled={
                  (currentStepKey === 'choice' && configChoice === 'import') ||
                  (currentStepKey === 'profile' && !userName.trim())
                }
              >
                {t('onboarding.buttons.continue')}
              </Button>
            ) : currentStepKey === 'folders' ? (
              <Button
                variant="onboarding-continue"
                rightIcon={<ArrowRight size={14} />}
                animateIcon
                onClick={handleNext}
                disabled={orgMode === 'move_organize' && folderValidation.valid !== true}
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

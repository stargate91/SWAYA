import Button from '@/ui/Button';
import { ArrowRight, ArrowLeft } from '@/ui/icons';
import './OnboardingWizard.css';
import { useTranslation } from '@/providers/LanguageContext';
import Inline from '@/ui/Inline';

import useOnboardingState from './hooks/useOnboardingState';

const BRAND_TEXT = 'SWAYA';

import WelcomeStep from './steps/WelcomeStep';
import ChoiceStep from './steps/ChoiceStep';
import TmdbStep from './steps/TmdbStep';
import OmdbStep from './steps/OmdbStep';
import FolderStep from './steps/FolderStep';
import CompletionStep from './steps/CompletionStep';

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
    tmdbApiKey,
    setTmdbApiKey,
    tmdbBearerToken,
    setTmdbBearerToken,
    tmdbValidation,
    validateTmdb,
    isValidatingApi,
    isTmdbGuideOpen,
    openTmdbGuide,
    closeTmdbGuide,
    tmdbGuideStep,
    goToTmdbGuideStep,
    tmdbGuideDirection,
    activeTmdbGuideStep,
    openGuideLink,
    omdbApiKey,
    setOmdbApiKey,
    omdbValidation,
    validateOmdb,
    isOmdbGuideOpen,
    openOmdbGuide,
    closeOmdbGuide,
    omdbGuideStep,
    goToOmdbGuideStep,
    omdbGuideDirection,
    activeOmdbGuideStep,
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
    isAnyGuideOpen,
  } = useOnboardingState();

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-container">

        {/* Header */}
        <div className="onboarding-header">
          <div className={`onboarding-title-group ${isAnyGuideOpen ? 'is-hidden' : ''}`}>
            <h1>{BRAND_TEXT}</h1>
          </div>
          <div className={`onboarding-timeline ${isAnyGuideOpen ? 'is-hidden' : ''}`}>
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className={`timeline-dot-wrapper ${num <= step ? 'is-active' : ''} ${num === step ? 'is-current' : ''}`}>
                <div className="timeline-dot" />
                {num < 6 && <div className="timeline-line" />}
              </div>
            ))}
          </div>
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

            {/* Step 3: TMDB API Setup */}
            {step === 3 && (
              <TmdbStep
                tmdbApiKey={tmdbApiKey}
                setTmdbApiKey={setTmdbApiKey}
                tmdbBearerToken={tmdbBearerToken}
                setTmdbBearerToken={setTmdbBearerToken}
                tmdbValidation={tmdbValidation}
                validateTmdb={validateTmdb}
                isValidatingApi={isValidatingApi}
                isTmdbGuideOpen={isTmdbGuideOpen}
                openTmdbGuide={openTmdbGuide}
                closeTmdbGuide={closeTmdbGuide}
                tmdbGuideStep={tmdbGuideStep}
                goToTmdbGuideStep={goToTmdbGuideStep}
                tmdbGuideDirection={tmdbGuideDirection}
                activeTmdbGuideStep={activeTmdbGuideStep}
                openGuideLink={openGuideLink}
                step={step}
              />
            )}

            {/* Step 4: OMDB API Setup */}
            {step === 4 && (
              <OmdbStep
                omdbApiKey={omdbApiKey}
                setOmdbApiKey={setOmdbApiKey}
                omdbValidation={omdbValidation}
                validateOmdb={validateOmdb}
                isValidatingApi={isValidatingApi}
                isOmdbGuideOpen={isOmdbGuideOpen}
                openOmdbGuide={openOmdbGuide}
                closeOmdbGuide={closeOmdbGuide}
                omdbGuideStep={omdbGuideStep}
                goToOmdbGuideStep={goToOmdbGuideStep}
                omdbGuideDirection={omdbGuideDirection}
                activeOmdbGuideStep={activeOmdbGuideStep}
                openGuideLink={openGuideLink}
                step={step}
              />
            )}

            {/* Step 5: Folders Setup */}
            {step === 5 && (
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

            {/* Step 6: Completion */}
            {step === 6 && <CompletionStep />}

          </div>
        </div>

        {/* Footer */}
        <div className={`onboarding-footer ${isAnyGuideOpen ? 'onboarding-footer--guided-actions' : ''}`}>
          {isAnyGuideOpen ? (
            <>
              <div />
              <Inline gap="md" align="center" className="onboarding-footer-actions-cluster">
                <Button variant="onboarding-back" leftIcon={<ArrowLeft size={14} />} animateIcon onClick={handlePrev}>
                  {t('common.back')}
                </Button>
                <Button
                  variant="onboarding-continue"
                  rightIcon={<ArrowRight size={14} />}
                  animateIcon
                  onClick={handleNext}
                >
                  {t('onboarding.buttons.continue')}
                </Button>
              </Inline>
            </>
          ) : (
            <>
              {step > 1 && step < 6 ? (
                <Button variant="onboarding-back" leftIcon={<ArrowLeft size={14} />} animateIcon onClick={handlePrev}>
                  {t('common.back')}
                </Button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <Button
                  variant="onboarding-continue"
                  rightIcon={<ArrowRight size={14} />}
                  animateIcon
                  onClick={handleNext}
                  disabled={
                    (step === 2 && configChoice === 'import') ||
                    (step === 3 && tmdbValidation.valid !== true) ||
                    (step === 4 && omdbValidation.valid !== true)
                  }
                >
                  {t('onboarding.buttons.continue')}
                </Button>
              ) : step === 5 ? (
                <Button
                  variant="onboarding-continue"
                  rightIcon={<ArrowRight size={14} />}
                  animateIcon
                  onClick={handleNext}
                  disabled={folderValidation.valid !== true}
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
          )}
        </div>

      </div>
    </div>
  );
}

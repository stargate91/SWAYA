import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/providers/LanguageContext';
import { useUi } from '@/providers/UiProvider';
import { selectFolder } from '@/lib/ipc';
import api from '@/lib/api';
import { buildSettingsPayload } from '@/lib/api/settings';
import { validateImportedSettings } from '@/lib/validation';
import { getInitialFormValues } from '@/pages/settings/settingsFormValues';
import { TARGET_LANGUAGE_OPTIONS } from '@/pages/settings/settingsLanguageOptions';
import { getFlagUrl } from '../onboarding.constants';

export default function useOnboardingState() {
  const { locale, setLocale, t } = useTranslation();
  const { toast } = useUi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [stepDirection, setStepDirection] = useState('forward');
  const [configChoice, setConfigChoice] = useState('new'); // 'new' or 'import'
  const [isImporting, setIsImporting] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [docsModal, setDocsModal] = useState(null); // null | 'docs_tmdb' | 'docs_omdb'


  const AVAILABLE_LANGUAGES = TARGET_LANGUAGE_OPTIONS.map(lang => {
    const nativeMatch = lang.label.match(/\(([^)]+)\)/);
    return {
      code: lang.value,
      name: nativeMatch ? nativeMatch[1] : lang.label,
      flagUrl: getFlagUrl(lang.value),
      active: lang.value === 'en'
    };
  });

  const filteredLanguages = AVAILABLE_LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(langSearch.toLowerCase())
  );

  // Profile builder state
  const [userName, setUserName] = useState('');
  const [avatarPath, setAvatarPath] = useState('');

  // API credentials state
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [tmdbBearerToken, setTmdbBearerToken] = useState('');
  const [omdbApiKey, setOmdbApiKey] = useState('');

  // Validation states
  const [tmdbValidation, setTmdbValidation] = useState({ valid: null, message: '' });
  const [omdbValidation, setOmdbValidation] = useState({ valid: null, message: '' });
  const [isValidatingApi, setIsValidatingApi] = useState(false);

  // Folder paths state
  const [scanDir, setScanDir] = useState('');
  const [libraryPath, setLibraryPath] = useState('');
  const [folderValidation, setFolderValidation] = useState({ valid: null, message: '' });
  const [isValidatingFolders, setIsValidatingFolders] = useState(false);

  // Final completion state
  const [isFinishing, setIsFinishing] = useState(false);

  const goToStep = (nextStep, direction = 'forward') => {
    setStepDirection(direction);
    setStep(Math.max(1, Math.min(nextStep, 7)));
  };

  const handleNext = () => goToStep(step + 1, 'forward');
  const handlePrev = () => goToStep(step - 1, 'backward');

  // Step 2: Handle config JSON import
  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        const reference = getInitialFormValues({});
        const { valid, settings } = validateImportedSettings(imported, reference);

        if (!valid || !settings) {
          throw new Error('Invalid structure or value types');
        }

        const normalizedSettings = buildSettingsPayload(getInitialFormValues(settings, t));

        const importPayload = {
          ...normalizedSettings,
          onboarding_completed: true,
        };
        await api.settings.import(importPayload);
        queryClient.setQueryData(['settings'], importPayload);
        await queryClient.invalidateQueries({ queryKey: ['settings'] });
        
        toast(t('settingsPage.sections.backup.importSuccess') || 'Settings imported successfully!', 'success');
        
        // Skip straight to completion/finish step
        goToStep(7, 'forward');
      } catch (err) {
        console.error(err);
        toast(t('settingsPage.sections.backup.importError') || 'Failed to import settings file.', 'danger');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  // Validate TMDB Credentials
  const validateTmdb = async () => {
    if (!tmdbApiKey.trim() || !tmdbBearerToken.trim()) {
      setTmdbValidation({
        valid: false,
        message: 'Both TMDB API Key (v3) and Read Access Token (v4) are required.'
      });
      return;
    }

    setIsValidatingApi(true);
    try {
      const response = await api.settings.validateApiKeys({
        tmdb_api_key: tmdbApiKey,
        tmdb_bearer_token: tmdbBearerToken,
      });

      if (response?.tmdb?.valid) {
        setTmdbValidation({ valid: true, message: response.tmdb.message });
        toast(t('onboarding.toasts.tmdbVerified') || 'TMDB credentials successfully verified.', 'success');
        setTimeout(() => {
          goToStep(4, 'forward');
        }, 800);
      } else {
        setTmdbValidation({ valid: false, message: response?.tmdb?.message || t('onboarding.toasts.verificationFailed') || 'Verification failed.' });
        toast(response?.tmdb?.message || t('onboarding.toasts.tmdbVerificationFailed') || 'TMDB credentials verification failed.', 'danger');
      }
    } catch (err) {
      console.error(err);
      setTmdbValidation({ valid: false, message: t('onboarding.toasts.connectionError') || 'Connection error during validation.' });
      toast(t('onboarding.toasts.validationServerFailed') || 'Failed to connect to validation server.', 'danger');
    } finally {
      setIsValidatingApi(false);
    }
  };

  // Validate OMDB Credentials
  const validateOmdb = async () => {
    if (!omdbApiKey.trim()) {
      setOmdbValidation({
        valid: false,
        message: t('onboarding.toasts.omdbKeyRequired') || 'OMDB API Key is required.'
      });
      return;
    }

    setIsValidatingApi(true);
    try {
      const response = await api.settings.validateApiKeys({
        omdb_api_key: omdbApiKey,
      });

      if (response?.omdb?.valid) {
        setOmdbValidation({ valid: true, message: response.omdb.message });
        toast(t('onboarding.toasts.omdbVerified') || 'OMDB API Key successfully verified.', 'success');
        setTimeout(() => {
          goToStep(5, 'forward');
        }, 800);
      } else {
        setOmdbValidation({ valid: false, message: response?.omdb?.message || t('onboarding.toasts.verificationFailed') || 'Verification failed.' });
        toast(response?.omdb?.message || t('onboarding.toasts.omdbVerificationFailed') || 'OMDB verification failed.', 'danger');
      }
    } catch (err) {
      console.error(err);
      setOmdbValidation({ valid: false, message: t('onboarding.toasts.connectionError') || 'Connection error during validation.' });
      toast(t('onboarding.toasts.validationServerFailed') || 'Failed to connect to validation server.', 'danger');
    } finally {
      setIsValidatingApi(false);
    }
  };

  // Pick Folders
  const pickScanDir = async () => {
    const path = await selectFolder(scanDir);
    if (path) setScanDir(path);
  };

  const pickLibraryPath = async () => {
    const path = await selectFolder(libraryPath);
    if (path) setLibraryPath(path);
  };

  // Validate Folders
  const validateDirs = async () => {
    if (!libraryPath.trim()) {
      setFolderValidation({ valid: false, message: t('onboarding.toasts.targetFolderRequired') || 'Target library folder is required.' });
      return;
    }

    setIsValidatingFolders(true);
    try {
      const response = await api.settings.validateFolders({
        default_scan_dir: scanDir,
        folder_library_path: libraryPath,
        folder_move_to_library: true,
      });

      if (response.valid) {
        setFolderValidation({ valid: true, message: t('onboarding.toasts.foldersReady') || 'Folders validated and ready.' });
        toast(t('onboarding.toasts.folderValid') || 'Folder configuration is valid.', 'success');
        setTimeout(() => {
          goToStep(6, 'forward');
        }, 800);
      } else {
        const firstErr = response.errors 
          ? (response.errors.scanFolder || response.errors.targetFolder)
          : response.code;
        setFolderValidation({ valid: false, message: firstErr || t('onboarding.toasts.validationFailed') || 'Validation failed.' });
        toast(firstErr || t('onboarding.toasts.folderValidationFailed') || 'Folder validation failed.', 'danger');
      }
    } catch (err) {
      console.error(err);
      setFolderValidation({ valid: false, message: t('onboarding.toasts.folderValidationFailed') || 'Folder validation failed.' });
    } finally {
      setIsValidatingFolders(false);
    }
  };

  // Final Save Settings & Onboard Complete
  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      if (configChoice === 'import') {
        toast(t('onboarding.toasts.onboardingCompleted') || 'Onboarding completed! Welcome to SWAYA.', 'success');
        navigate('/dashboard');
        return;
      }

      // Load current settings first to merge other values
      const currentSettings = await api.settings.get();
      
      const payload = {
        ...currentSettings,
        user_name: userName,
        avatar_path: avatarPath,
        tmdb_api_key: tmdbApiKey,
        tmdb_bearer_token: tmdbBearerToken,
        omdb_api_key: omdbApiKey,
        default_scan_dir: scanDir,
        folder_library_path: libraryPath,
        folder_move_to_library: Boolean(libraryPath.trim()),
        onboarding_completed: true,
      };

      await api.settings.update(payload);
      queryClient.setQueryData(['settings'], payload);
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast(t('onboarding.toasts.onboardingCompleted') || 'Onboarding completed! Welcome to SWAYA.', 'success');
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast(t('onboarding.toasts.saveConfigFailed') || 'Failed to save configuration settings.', 'danger');
    } finally {
      setIsFinishing(false);
    }
  };

  return {
    locale,
    setLocale,
    t,
    step,
    goToStep,
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
  };
}

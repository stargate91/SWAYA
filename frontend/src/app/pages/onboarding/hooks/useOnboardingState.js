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

  // Content selection & adult scraper states
  const [contentTypeChoice, setContentTypeChoice] = useState('sfw'); // 'sfw', 'nsfw', 'hybrid'
  const [stashdbApiKey, setStashdbApiKey] = useState('');
  const [stashdbEndpoint, setStashdbEndpoint] = useState('https://stashdb.org/graphql');
  const [fansdbApiKey, setFansdbApiKey] = useState('');
  const [fansdbEndpoint, setFansdbEndpoint] = useState('https://fansdb.cc/graphql');
  const [porndbApiKey, setPorndbApiKey] = useState('');
  const [porndbEndpoint, setPorndbEndpoint] = useState('https://theporndb.net/graphql');

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
  const [stashdbValidation, setStashdbValidation] = useState({ valid: null, message: '' });
  const [fansdbValidation, setFansdbValidation] = useState({ valid: null, message: '' });
  const [porndbValidation, setPorndbValidation] = useState({ valid: null, message: '' });
  const [isValidatingApi, setIsValidatingApi] = useState(false);

  // Folder paths state
  const [scanDir, setScanDir] = useState('');
  const [libraryPath, setLibraryPath] = useState('');
  const [folderValidation, setFolderValidation] = useState({ valid: null, message: '' });
  const [isValidatingFolders, setIsValidatingFolders] = useState(false);

  // Final completion state
  const [isFinishing, setIsFinishing] = useState(false);

  // Dynamic steps calculation
  const getStepsList = () => {
    if (configChoice === 'import') {
      return ['welcome', 'choice', 'completion'];
    }
    const base = ['welcome', 'choice', 'profile', 'content-type'];
    let scrapers = [];
    if (contentTypeChoice === 'sfw') {
      scrapers = ['tmdb', 'omdb'];
    } else if (contentTypeChoice === 'nsfw') {
      scrapers = ['stashdb', 'fansdb', 'porndb'];
    } else if (contentTypeChoice === 'hybrid') {
      scrapers = ['tmdb', 'omdb', 'stashdb', 'fansdb', 'porndb'];
    }
    return [...base, ...scrapers, 'folders', 'completion'];
  };

  const stepsList = getStepsList();

  const goToStep = (nextStep, direction = 'forward') => {
    setStepDirection(direction);
    setStep(Math.max(1, Math.min(nextStep, stepsList.length)));
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
        goToStep(stepsList.indexOf('completion') + 1, 'forward');
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
          handleNext();
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
          handleNext();
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

  // Validate StashDB Credentials
  const validateStashdb = async () => {
    if (!stashdbApiKey.trim()) {
      setStashdbValidation({
        valid: false,
        message: t('onboarding.toasts.stashdbKeyRequired') || 'StashDB API Key is required.'
      });
      return;
    }

    setIsValidatingApi(true);
    try {
      const response = await api.settings.validateApiKeys({
        stashdb_api_key: stashdbApiKey,
        stashdb_endpoint: stashdbEndpoint,
      });

      if (response?.stashdb?.valid) {
        setStashdbValidation({ valid: true, message: response.stashdb.message });
        toast(t('onboarding.toasts.stashdbVerified') || 'StashDB credentials successfully verified.', 'success');
        setTimeout(() => {
          handleNext();
        }, 800);
      } else {
        setStashdbValidation({ valid: false, message: response?.stashdb?.message || t('onboarding.toasts.verificationFailed') || 'Verification failed.' });
        toast(response?.stashdb?.message || t('onboarding.toasts.stashdbVerificationFailed') || 'StashDB credentials verification failed.', 'danger');
      }
    } catch (err) {
      console.error(err);
      setStashdbValidation({ valid: false, message: t('onboarding.toasts.connectionError') || 'Connection error during validation.' });
      toast(t('onboarding.toasts.validationServerFailed') || 'Failed to connect to validation server.', 'danger');
    } finally {
      setIsValidatingApi(false);
    }
  };

  // Validate FansDB Credentials
  const validateFansdb = async () => {
    if (!fansdbApiKey.trim()) {
      setFansdbValidation({
        valid: false,
        message: t('onboarding.toasts.fansdbKeyRequired') || 'FansDB API Key is required.'
      });
      return;
    }

    setIsValidatingApi(true);
    try {
      const response = await api.settings.validateApiKeys({
        fansdb_api_key: fansdbApiKey,
        fansdb_endpoint: fansdbEndpoint,
      });

      if (response?.fansdb?.valid) {
        setFansdbValidation({ valid: true, message: response.fansdb.message });
        toast(t('onboarding.toasts.fansdbVerified') || 'FansDB credentials successfully verified.', 'success');
        setTimeout(() => {
          handleNext();
        }, 800);
      } else {
        setFansdbValidation({ valid: false, message: response?.fansdb?.message || t('onboarding.toasts.verificationFailed') || 'Verification failed.' });
        toast(response?.fansdb?.message || t('onboarding.toasts.fansdbVerificationFailed') || 'FansDB credentials verification failed.', 'danger');
      }
    } catch (err) {
      console.error(err);
      setFansdbValidation({ valid: false, message: t('onboarding.toasts.connectionError') || 'Connection error during validation.' });
      toast(t('onboarding.toasts.validationServerFailed') || 'Failed to connect to validation server.', 'danger');
    } finally {
      setIsValidatingApi(false);
    }
  };

  // Validate PornDB Credentials
  const validatePorndb = async () => {
    if (!porndbApiKey.trim()) {
      setPorndbValidation({
        valid: false,
        message: t('onboarding.toasts.porndbKeyRequired') || 'PornDB API Key is required.'
      });
      return;
    }

    setIsValidatingApi(true);
    try {
      const response = await api.settings.validateApiKeys({
        porndb_api_key: porndbApiKey,
        porndb_endpoint: porndbEndpoint,
      });

      if (response?.porndb?.valid) {
        setPorndbValidation({ valid: true, message: response.porndb.message });
        toast(t('onboarding.toasts.porndbVerified') || 'PornDB credentials successfully verified.', 'success');
        setTimeout(() => {
          handleNext();
        }, 800);
      } else {
        setPorndbValidation({ valid: false, message: response?.porndb?.message || t('onboarding.toasts.verificationFailed') || 'Verification failed.' });
        toast(response?.porndb?.message || t('onboarding.toasts.porndbVerificationFailed') || 'PornDB credentials verification failed.', 'danger');
      }
    } catch (err) {
      console.error(err);
      setPorndbValidation({ valid: false, message: t('onboarding.toasts.connectionError') || 'Connection error during validation.' });
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
          handleNext();
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
        // Adult settings
        include_adult: contentTypeChoice !== 'sfw',
        stashdb_api_key: stashdbApiKey,
        stashdb_endpoint: stashdbEndpoint,
        fansdb_api_key: fansdbApiKey,
        fansdb_endpoint: fansdbEndpoint,
        porndb_api_key: porndbApiKey,
        porndb_endpoint: porndbEndpoint,
        // folders
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
    stepsList,
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
  };
}

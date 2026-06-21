import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { buildSettingsPayload } from '@/lib/api/settings';
import { useSettingsQuery, useUpdateSettingsMutation, useSyncLanguageMutation } from '@/queries';
import { getInitialFormValues } from '../settingsFormValues.js';
import { isSettingsDirty } from '../settingsMapper.js';
import Button from '@/ui/Button';
import Checkbox from '@/ui/Checkbox';
import { Info } from 'lucide-react';

export default function useSettingsPersistence({
  t,
  toast,
  openModal,
  closeModal,
  validateFormFolders,
  onValidationInvalid,
}) {
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data;
  const updateSettingsMutation = useUpdateSettingsMutation();
  const syncLanguageMutation = useSyncLanguageMutation();
  const [form, setForm] = useState(() => getInitialFormValues(null, t));
  const [isSaving, setIsSaving] = useState(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (settings && !isInitializedRef.current) {
      setForm(getInitialFormValues(settings, t));
      isInitializedRef.current = true;
    }
  }, [settings, t]);

  const executeSave = useCallback(async (payload) => {
    isInitializedRef.current = false;
    await updateSettingsMutation.mutateAsync(payload);
    toast(t('settingsPage.saved'), 'success');
  }, [t, toast, updateSettingsMutation]);


  const validateAdultApiKeys = useCallback(async (payload) => {
    const adultProviders = [
      {
        key: 'stashdb',
        shouldValidate: Boolean(payload.stashdb_api_key) && (
          payload.stashdb_api_key !== (settings?.stashdb_api_key || '') ||
          payload.stashdb_endpoint !== (settings?.stashdb_endpoint || '')
        ),
      },
      {
        key: 'fansdb',
        shouldValidate: Boolean(payload.fansdb_api_key) && (
          payload.fansdb_api_key !== (settings?.fansdb_api_key || '') ||
          payload.fansdb_endpoint !== (settings?.fansdb_endpoint || '')
        ),
      },
      {
        key: 'porndb',
        shouldValidate: Boolean(payload.porndb_api_key) && (
          payload.porndb_api_key !== (settings?.porndb_api_key || '') ||
          payload.porndb_endpoint !== (settings?.porndb_endpoint || '')
        ),
      },
    ];

    if (!adultProviders.some((provider) => provider.shouldValidate)) {
      return true;
    }

    const validationResponse = await api.settings.validateApiKeys(payload);
    const firstInvalidProvider = adultProviders.find(
      (provider) => provider.shouldValidate && validationResponse?.[provider.key]?.valid === false
    );

    if (firstInvalidProvider) {
      const validationMessage = validationResponse?.[firstInvalidProvider.key]?.message;
      const validationCode = validationResponse?.[firstInvalidProvider.key]?.code;
      const validationProvider = validationResponse?.[firstInvalidProvider.key]?.provider;
      const providerLabel = validationProvider
        ? (t(`settingsPage.validation.adultProviderNames.${validationProvider}`) || validationProvider)
        : '';
      const localizedMessage = validationCode
        ? (t(`settingsPage.validation.${validationCode}`, { provider: providerLabel }) || validationMessage)
        : validationMessage;
      toast(localizedMessage || t('settingsPage.saveFailed'), 'danger');
      return false;
    }

    return true;
  }, [settings, t, toast]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const validationResult = await validateFormFolders(form);
      if (!validationResult.valid) {
        onValidationInvalid?.();
        setIsSaving(false);
        let localizedMessage = '';

        if (validationResult.errors) {
          const firstKey = Object.keys(validationResult.errors)[0];
          const errorValue = validationResult.errors[firstKey];
          localizedMessage = t(`settingsPage.validation.${errorValue}`) || errorValue;
        } else {
          localizedMessage = t(`settingsPage.validation.${validationResult.code}`) || validationResult.code;
        }

        toast(localizedMessage || t('settingsPage.saveFailed'), 'danger');
        return;
      }

      const payload = buildSettingsPayload(form);

      const adultKeysValid = await validateAdultApiKeys(payload);
      if (!adultKeysValid) {
        setIsSaving(false);
        return;
      }
      
      const savedPrimary = settings?.primary_metadata_language || 'en-US';
      const savedFallback = settings?.fallback_metadata_language || 'en-US';
      const savedTarget = settings?.default_target_language || 'en';

      const isLanguageChanging = 
        (payload.primary_metadata_language !== savedPrimary) ||
        (payload.fallback_metadata_language !== savedFallback) ||
        (payload.default_target_language !== savedTarget);

      // Execute save first
      await executeSave(payload);

      // Trigger the info modal popup after saving if languages were modified
      if (isLanguageChanging && localStorage.getItem('swaya:skip-settings-language-sync-warning') !== 'true') {
        let dontShowAgain = false;
        
        openModal({
          title: t('settingsPage.languageChangeInfo.title'),
          icon: Info,
          variant: 'info',
          content: (
            <div className="ui-modal__body-text">
              <p className="ui-modal__body-paragraph">
                {t('settingsPage.languageChangeInfo.description')}
              </p>
              <Checkbox onChange={(e) => { dontShowAgain = e.target.checked; }}>
                {t('settingsPage.languageChangeInfo.dontShowAgain')}
              </Checkbox>
            </div>
          ),
          footer: (
            <>
              <Button
                variant="secondary-neutral"
                onClick={() => {
                  if (dontShowAgain) {
                    localStorage.setItem('swaya:skip-settings-language-sync-warning', 'true');
                  }
                  closeModal();
                }}
              >
                {t('settingsPage.languageChangeInfo.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (dontShowAgain) {
                    localStorage.setItem('swaya:skip-settings-language-sync-warning', 'true');
                  }
                  closeModal();
                  try {
                    await syncLanguageMutation.mutateAsync();
                    toast(t('settingsPage.languageChangeInfo.syncStarted'), 'success');
                  } catch (syncError) {
                    toast(t('settingsPage.languageChangeInfo.syncFailed') || syncError.message, 'danger');
                  }
                }}
              >
                {t('settingsPage.languageChangeInfo.syncButton')}
              </Button>
            </>
          ),
        });
      }
    } catch (error) {
      const localizedErrorMessage = t(`settingsPage.validation.${error.message}`) || error.message;
      toast(localizedErrorMessage || t('settingsPage.saveFailed'), 'danger');
    } finally {
      setIsSaving(false);
    }
  }, [form, settings, onValidationInvalid, t, toast, validateFormFolders, openModal, closeModal, executeSave, syncLanguageMutation, validateAdultApiKeys]);

  const handleReset = useCallback(() => {
    if (settings) {
      setForm(getInitialFormValues(settings, t));
    }
  }, [settings, t]);

  return {
    settingsQuery,
    settings,
    form,
    setForm,
    isSaving,
    isDirty: isSettingsDirty(form, settings, t),
    handleSave,
    handleReset,
    resetInitialization: () => {
      isInitializedRef.current = false;
    },
  };
}



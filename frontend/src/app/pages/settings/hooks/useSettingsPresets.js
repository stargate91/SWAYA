import { useCallback, useMemo } from 'react';
import { useSettingsViewContext } from '../SettingsFormContext.jsx';
import { getPresetCards, PRESETS_CONFIG } from '../settingsPresets.jsx';

export default function useSettingsPresets() {
  const { form, setForm, t, renderContext } = useSettingsViewContext();
  const isBackgroundActive = Boolean(renderContext?.isBackgroundActive);

  const presetCards = useMemo(() => getPresetCards(t), [t]);

  const setOrganizationMode = useCallback((mode) => {
    if (isBackgroundActive) return;
    setForm((prev) => ({
      ...prev,
      folder_organization_enabled: mode !== 'register',
      folder_move_to_library: mode === 'move_organize',
    }));
  }, [setForm, isBackgroundActive]);

  const applyPreset = useCallback((presetId) => {
    if (isBackgroundActive) return;
    const config = PRESETS_CONFIG[presetId];

    if (!config || form.custom_organization_enabled) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      ...config,
      organization_preset: presetId,
    }));
  }, [form.custom_organization_enabled, setForm, isBackgroundActive]);

  const setCustomOrganizationEnabled = useCallback((enabled) => {
    if (isBackgroundActive) return;
    setForm((prev) => ({
      ...prev,
      custom_organization_enabled: enabled,
    }));
  }, [setForm, isBackgroundActive]);

  return {
    form,
    t,
    presetCards,
    applyPreset,
    setOrganizationMode,
    setCustomOrganizationEnabled,
    isScanActive: isBackgroundActive,
  };
}

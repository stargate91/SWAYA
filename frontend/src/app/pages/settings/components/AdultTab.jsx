import Stack from '@/ui/Stack';
import { useSettingsField, useSettingsViewContext } from '../SettingsFormContext.jsx';
import SettingsSectionRenderer from './SettingsSectionRenderer.jsx';
import {
  createAdultGeneralSection,
  createAdultStashdbSection,
  createAdultFansdbSection,
  createAdultTheporndbSection,
  createAdultPreviewsSection,
} from '../settingsSectionConfigs.jsx';

export default function AdultTab() {
  const { adultGenderPreferenceOptions, t } = useSettingsViewContext();
  const includeAdultField = useSettingsField('include_adult');
  const hoverPreviewsEnabledField = useSettingsField('hover_previews_enabled');
  const context = {
    include_adult: includeAdultField.checked,
    hover_previews_enabled: hoverPreviewsEnabledField.checked
  };

  return (
    <Stack gap="xl">
      <SettingsSectionRenderer
        section={createAdultGeneralSection(t, adultGenderPreferenceOptions)}
        context={context}
      />
      {includeAdultField.checked && (
        <>
          <SettingsSectionRenderer
            section={createAdultPreviewsSection(t)}
            context={context}
          />
          <SettingsSectionRenderer
            section={createAdultStashdbSection(t)}
            context={context}
          />
          <SettingsSectionRenderer
            section={createAdultFansdbSection(t)}
            context={context}
          />
          <SettingsSectionRenderer
            section={createAdultTheporndbSection(t)}
            context={context}
          />
        </>
      )}
    </Stack>
  );
}

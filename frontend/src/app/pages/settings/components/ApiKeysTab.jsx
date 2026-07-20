import Stack from '@/ui/Stack';
import { useSettingsField, useSettingsViewContext } from '../SettingsFormContext.jsx';
import SettingsSectionRenderer from './SettingsSectionRenderer.jsx';
import {
  createApiTmdbSection,
  createApiOmdbSection,
  createAdultStashdbSection,
  createAdultFansdbSection,
  createAdultTheporndbSection,
} from '../settingsSectionConfigs.js';

export default function ApiKeysTab() {
  const { t } = useSettingsViewContext();
  const includeAdultField = useSettingsField('include_adult');
  const context = {
    include_adult: includeAdultField.checked,
    t
  };

  return (
    <Stack gap="xl">
      <SettingsSectionRenderer section={createApiTmdbSection(t)} />
      <SettingsSectionRenderer section={createApiOmdbSection(t)} />
      {includeAdultField.checked && (
        <>
          <SettingsSectionRenderer section={createAdultStashdbSection(t)} context={context} />
          <SettingsSectionRenderer section={createAdultFansdbSection(t)} context={context} />
          <SettingsSectionRenderer section={createAdultTheporndbSection(t)} context={context} />
        </>
      )}
    </Stack>
  );
}

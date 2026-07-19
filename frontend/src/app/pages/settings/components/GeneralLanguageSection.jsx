import { useSettingsViewContext } from '../SettingsFormContext.jsx';
import SettingsSectionRenderer from './SettingsSectionRenderer.jsx';
import { createGeneralLanguageSection } from '../settingsSectionConfigs.js';

export default function GeneralLanguageSection() {
  const { t, appLanguageOptions } = useSettingsViewContext();
  return <SettingsSectionRenderer section={createGeneralLanguageSection(t, appLanguageOptions)} />;
}

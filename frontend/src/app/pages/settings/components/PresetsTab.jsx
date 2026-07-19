import Card from '@/ui/Card';
import SelectableCard from '@/ui/SelectableCard';
import Switch from '@/ui/Switch';
import { useSettingsPresets } from '../hooks';
import SettingsLiveImpact from './SettingsLiveImpact.jsx';
import { useSettingsFormContext } from '../SettingsFormContext.jsx';
import styles from '../SettingsPage.module.css';
import Inline from '@/ui/Inline';
import ChoiceField from '@/ui/ChoiceField';
import Label from '@/ui/Label';
import Hint from '@/ui/Hint';
import Stack from '@/ui/Stack';
import Badge from '@/ui/Badge';
import Text from '@/ui/Text';
import Grid from '@/ui/Grid';

export default function PresetsTab() {
  const {
    form,
    t,
    presetCards,
    applyPreset,
    setOrganizationMode,
    setCustomOrganizationEnabled,
  } = useSettingsPresets();
  const { renderContext } = useSettingsFormContext();
  const isScanActive = Boolean(renderContext?.isBackgroundActive);

  const isRegisterSelected = !form.folder_organization_enabled;
  const isInplaceSelected = form.folder_organization_enabled && !form.folder_move_to_library;
  const isLibrarySelected = form.folder_organization_enabled && form.folder_move_to_library;

  return (
    <Stack gap="3xl">
      <Card
        title={t('settingsPage.sections.mode.title')}
        eyebrow={t('settingsPage.sections.mode.eyebrow')}
      >
        <Stack gap="lg">
          <Hint className={styles['hint-tight-top']}>
            {t('settingsPage.sections.mode.hint')}
          </Hint>
          <Grid variant="auto-card">
            {/* Mode A: Register Only */}
            <SelectableCard
              as="div"
              onClick={isScanActive ? undefined : () => setOrganizationMode('register')}
              selected={isRegisterSelected}
              disabled={isScanActive}
            >
              <Stack gap="sm">
                <Inline gap="md" align="center" className="settings-choice-header">
                  <ChoiceField.Input
                    type="radio"
                    checked={isRegisterSelected}
                    onChange={() => {}}
                    disabled={isScanActive}
                  />
                  <ChoiceField.Title isActive={isRegisterSelected}>
                    {t('settingsPage.sections.mode.register')}
                  </ChoiceField.Title>
                </Inline>
                <ChoiceField.Description>
                  {t('settingsPage.sections.mode.registerHint')}
                </ChoiceField.Description>
              </Stack>
            </SelectableCard>

            {/* Mode B: In-place Rename */}
            <SelectableCard
              as="div"
              onClick={isScanActive ? undefined : () => setOrganizationMode('rename_inplace')}
              selected={isInplaceSelected}
              disabled={isScanActive}
            >
              <Stack gap="sm">
                <Inline gap="md" align="center" className="settings-choice-header">
                  <ChoiceField.Input
                    type="radio"
                    checked={isInplaceSelected}
                    onChange={() => {}}
                    disabled={isScanActive}
                  />
                  <ChoiceField.Title isActive={isInplaceSelected}>
                    {t('settingsPage.sections.mode.inplace')}
                  </ChoiceField.Title>
                </Inline>
                <ChoiceField.Description>
                  {t('settingsPage.sections.mode.inplaceHint')}
                </ChoiceField.Description>
              </Stack>
            </SelectableCard>

            {/* Mode C: Move & Organize */}
            <SelectableCard
              as="div"
              onClick={isScanActive ? undefined : () => setOrganizationMode('move_organize')}
              selected={isLibrarySelected}
              disabled={isScanActive}
            >
              <Stack gap="sm">
                <Inline gap="md" align="center" className="settings-choice-header">
                  <ChoiceField.Input
                    type="radio"
                    checked={isLibrarySelected}
                    onChange={() => {}}
                    disabled={isScanActive}
                  />
                  <ChoiceField.Title isActive={isLibrarySelected}>
                    {t('settingsPage.sections.mode.library')}
                  </ChoiceField.Title>
                </Inline>
                <ChoiceField.Description>
                  {t('settingsPage.sections.mode.libraryHint')}
                </ChoiceField.Description>
              </Stack>
            </SelectableCard>
          </Grid>
        </Stack>
      </Card>

      <Card
        title={t('settingsPage.sections.organization.title')}
        eyebrow={t('settingsPage.sections.organization.eyebrow')}
      >
        <Stack gap="lg">
          <Label>{t('settingsPage.sections.organization.presetLabel')}</Label>
          <Hint className={styles['hint-compact-bottom']}>
            {t('settingsPage.sections.organization.presetHint')}
          </Hint>
          <Grid variant="auto-card">
            {presetCards.map((preset) => {
              const isSelected = form.organization_preset === preset.value;
              const isCardDisabled = isScanActive || (form.custom_organization_enabled && !isSelected);
              return (
                <SelectableCard
                  as="div"
                  key={preset.value}
                  onClick={isScanActive || form.custom_organization_enabled ? undefined : () => applyPreset(preset.value)}
                  selected={isSelected}
                  disabled={isCardDisabled}
                >
                  <Stack gap="sm">
                    <Inline gap="sm" align="center" className="settings-choice-header settings-choice-header--compact">
                      <Text variant="display">{preset.icon}</Text>
                      <Text variant="small" weight={isSelected ? 'semibold' : 'normal'} color={isSelected ? 'accent' : 'primary'}>
                        {preset.label}
                      </Text>
                      {isSelected && (
                        <Badge tone="accent" size="sm" className="u-margin-left-auto">
                          {t('settingsPage.sections.organization.activePreset')}
                        </Badge>
                      )}
                    </Inline>
                    <Text variant="caption" color="muted">
                      {preset.desc}
                    </Text>
                  </Stack>
                </SelectableCard>
              );
            })}
          </Grid>
          
          <Stack gap="xs">
            <Switch
              id="custom_organization_enabled"
              checked={form.custom_organization_enabled}
              disabled={isScanActive}
              onChange={(e) => setCustomOrganizationEnabled(e.target.checked)}
            >
              <ChoiceField.LabelText>
                {t('settingsPage.sections.organization.customToggleLabel')}
              </ChoiceField.LabelText>
            </Switch>
            <Hint className={styles['hint-indented']}>
              {t('settingsPage.sections.organization.customToggleHint')}
            </Hint>
          </Stack>
        </Stack>
      </Card>

      <SettingsLiveImpact
        form={form}
        t={t}
        title={t('settingsPage.sections.organization.previewTitle')}
        eyebrow={t('settingsPage.sections.organization.previewEyebrow')}
        hint={t('settingsPage.sections.organization.previewHint')}
      />
    </Stack>
  );
}

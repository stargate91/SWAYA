import { AlertTriangle } from '@/ui/icons';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Alert from '@/ui/Alert';
import { useSettingsField, useSettingsFormContext, useSettingsInputRef } from '../SettingsFormContext.jsx';
import SettingsPathField from './fields/SettingsPathField.jsx';
import styles from '../SettingsPage.module.css';

export default function GeneralFoldersSection({ t }) {
  const { form, validationErrors } = useSettingsFormContext();
  const scanFolderInputRef = useSettingsInputRef('scanFolder');
  const targetFolderInputRef = useSettingsInputRef('targetFolder');
  const adultTargetFolderInputRef = useSettingsInputRef('adultTargetFolder');

  return (
    <Card
      title={t('settingsPage.sections.folders.title')}
      eyebrow={t('settingsPage.sections.folders.eyebrow')}
    >
      <Stack gap="lg">
        {validationErrors.folders && !validationErrors.scanFolder && !validationErrors.targetFolder && !validationErrors.adultTargetFolder && (
          <Alert variant="danger">
            <AlertTriangle size={16} />
            <span>{validationErrors.folders}</span>
          </Alert>
        )}

        <Stack gap="xs">
          <SettingsPathField
            field="default_scan_dir"
            t={t}
            label={t('settingsPage.sections.folders.scanFolder')}
            placeholder={t('settingsPage.sections.folders.scanFolderPlaceholder')}
            inputRef={scanFolderInputRef}
          />
        </Stack>

        {form.folder_move_to_library && (
          <>
            <Stack gap="xs">
              <SettingsPathField
                field="folder_library_path"
                t={t}
                label={t('settingsPage.sections.folders.targetFolder')}
                placeholder={t('settingsPage.sections.folders.targetFolderPlaceholder')}
                inputRef={targetFolderInputRef}
              />
            </Stack>

            {form.include_adult && (
              <Stack gap="xs">
                <SettingsPathField
                  field="folder_adult_library_path"
                  t={t}
                  label={t('settingsPage.sections.adult.customTargetFolder')}
                  placeholder={t('settingsPage.sections.adult.customTargetFolderPlaceholder')}
                  hint={t('settingsPage.sections.adult.customTargetFolderHint')}
                  inputRef={adultTargetFolderInputRef}
                />
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

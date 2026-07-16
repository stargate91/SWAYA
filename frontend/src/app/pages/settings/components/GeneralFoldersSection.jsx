import { AlertTriangle } from '@/ui/icons';
import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Alert from '@/ui/Alert';
import { useSettingsField, useSettingsFormContext, useSettingsInputRef } from '../SettingsFormContext.jsx';
import SettingsPathField from './fields/SettingsPathField.jsx';
import styles from '../SettingsPage.module.css';

export default function GeneralFoldersSection({ t }) {
  const { validationErrors } = useSettingsFormContext();
  const targetFolderField = useSettingsField('folder_library_path');
  const moveToLibraryField = useSettingsField('folder_move_to_library');
  const scanFolderInputRef = useSettingsInputRef('scanFolder');
  const targetFolderInputRef = useSettingsInputRef('targetFolder');

  return (
    <Card
      title={t('settingsPage.sections.folders.title')}
      eyebrow={t('settingsPage.sections.folders.eyebrow')}
    >
      <Stack>
        {validationErrors.folders && !validationErrors.scanFolder && !validationErrors.targetFolder && (
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

        {moveToLibraryField.checked && (
          <Stack gap="xs" className={styles['nested-block-top']}>
            <SettingsPathField
              field="folder_library_path"
              t={t}
              label={t('settingsPage.sections.folders.targetFolder')}
              placeholder={t('settingsPage.sections.folders.targetFolderPlaceholder')}
              inputRef={targetFolderInputRef}
            />
            {!(targetFolderField.value || '').trim() && (
              <Alert variant="warning">
                <AlertTriangle size={16} className="settings-icon-shrink-0" />
                <span>{t('settingsPage.sections.mode.warningHint')}</span>
              </Alert>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

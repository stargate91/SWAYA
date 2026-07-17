import Button from '@/ui/Button';
import SettingsTextField from './SettingsTextField.jsx';
import { useSettingsFormContext, useSettingsField } from '../../SettingsFormContext.jsx';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import styles from '../../SettingsPage.module.css';

export default function SettingsPathField({
  field,
  t,
  picker = 'folder',
  disabled = false,
  buttonLabel,
  className = '',
  ...props
}) {
  const { actions, isSaving } = useSettingsFormContext();
  const fieldState = useSettingsField(field);
  const handlePick = picker === 'file'
    ? actions.handlePickFile(field)
    : actions.handlePickFolder(field);

  const isFieldDisabled = disabled || fieldState.disabled;

  return (
    <Inline gap="md" align="end" className="settings-input-row">
      <Stack flex={1}>
        <SettingsTextField field={field} {...props} />
      </Stack>
      <Button
        variant="secondary"
        onClick={handlePick}
        disabled={isFieldDisabled || isSaving}
        className={`${styles['browse-button']} ${className}`}
      >
        {buttonLabel || t('settingsPage.sections.folders.browse')}
      </Button>
    </Inline>
  );
}

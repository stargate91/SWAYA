import Button from '@/ui/Button';
import SettingsTextField from './SettingsTextField.jsx';
import { useSettingsFormContext, useSettingsField } from '../../SettingsFormContext.jsx';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Field from '@/ui/Field';
import styles from '../../SettingsPage.module.css';

export default function SettingsPathField({
  field,
  t,
  picker = 'folder',
  disabled = false,
  buttonLabel,
  className = '',
  label,
  hint,
  required,
  ...props
}) {
  const { actions, isSaving } = useSettingsFormContext();
  const fieldState = useSettingsField(field);
  const handlePick = picker === 'file'
    ? actions.handlePickFile(field)
    : actions.handlePickFolder(field);

  const isFieldDisabled = disabled || fieldState.disabled;
  const error = props.error ?? fieldState.error;

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <Inline gap="md" align="center" className="settings-input-row">
        <Stack flex={1}>
          <SettingsTextField
            field={field}
            {...props}
            label={null}
            hint={null}
            error={null}
            invalid={!!error}
          />
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

    </Field>
  );
}


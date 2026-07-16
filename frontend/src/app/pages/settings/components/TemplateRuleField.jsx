import SettingsSelectField from './fields/SettingsSelectField.jsx';
import TemplateFieldSection from './TemplateFieldSection.jsx';
import styles from '../SettingsPage.module.css';

export default function TemplateRuleField({
  t,
  actionFieldName,
  actionLabel,
  actionField,
  actionOptions,
  templateLabel,
  templateField,
  templatePlaceholder,
  templateTags,
  templateFieldKey,
  inputRef,
  insertTag,
  previewText,
  disabled,
}) {
  return (
    <div>
      <SettingsSelectField
        field={actionFieldName}
        label={actionLabel}
        options={actionOptions}
        disabled={disabled}
      />
      {actionField.value === 'rename' && (
        <TemplateFieldSection
          t={t}
          inputRef={inputRef}
          label={templateLabel}
          value={templateField.value}
          onChange={templateField.onChange}
          disabled={disabled || templateField.disabled}
          placeholder={templatePlaceholder}
          tags={templateTags}
          fieldKey={templateFieldKey}
          insertTag={insertTag}
          previewText={previewText}
          className={`${styles['nested-block']} ${styles['nested-block-top']}`}
        />
      )}
    </div>
  );
}


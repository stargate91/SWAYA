import Button from '@/ui/Button';
import styles from './StructurePreview.module.css';
import Inline from '@/ui/Inline';

export default function TemplateTagSelector({ t, tags, fieldKey, inputRef, insertTag, disabled }) {
  const commonTags = tags.common || [];
  const allTags = tags.all || tags;
  const additionalTags = allTags.filter((tag) => !commonTags.includes(tag));

  return (
    <div className={styles['template-tag-selector']}>
      {commonTags.length > 0 && (
        <div className={styles['template-tag-selector-group']}>
          <div className={styles['template-tag-selector-label']}>
            {t('settingsPage.templateTags.common')}
          </div>
          <Inline gap="sm" className={styles['template-tag-selector-container']}>
            {commonTags.map((tag) => (
              <Button
                key={tag}
                variant="tag"
                disabled={disabled}
                onClick={disabled ? undefined : () => insertTag(fieldKey, inputRef, tag)}
              >
                {tag}
              </Button>
            ))}
          </Inline>
        </div>
      )}
      {additionalTags.length > 0 && (
        <div className={styles['template-tag-selector-group']}>
          <div className={styles['template-tag-selector-label']}>
            {t('settingsPage.templateTags.more')}
          </div>
          <Inline gap="sm" className={styles['template-tag-selector-container']}>
            {additionalTags.map((tag) => (
              <Button
                key={tag}
                variant="tag"
                disabled={disabled}
                onClick={disabled ? undefined : () => insertTag(fieldKey, inputRef, tag)}
              >
                {tag}
              </Button>
            ))}
          </Inline>
        </div>
      )}
    </div>
  );
}

import styles from './StructurePreview.module.css';

export default function PreviewBadge({ previewText, t }) {
  if (!previewText) return null;
  return (
    <div className={styles['preview-badge-container']}>
      <span className={styles['preview-badge-label']}>
        {t('settingsPage.sections.organization.previewBadge')}
      </span>
      <span className={styles['preview-badge-text']}>{previewText}</span>
    </div>
  );
}

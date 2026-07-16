import styles from './StructurePreview.module.css';
import Inline from '@/ui/Inline';

export default function PreviewBadge({ previewText, t }) {
  if (!previewText) return null;
  return (
    <Inline gap="sm" align="center" className={styles['preview-badge-container']}>
      <span className={styles['preview-badge-label']}>
        {t('settingsPage.sections.organization.previewBadge')}
      </span>
      <span className={styles['preview-badge-text']}>{previewText}</span>
    </Inline>
  );
}

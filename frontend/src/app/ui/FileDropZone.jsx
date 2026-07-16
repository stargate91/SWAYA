import { useTranslation } from '../providers/LanguageContext';
import { useDropzone } from './useDropzone';
import styles from './FileDropZone.module.css';

export default function FileDropZone({
  children,
  onDropPaths,
  onDropFiles,
  disabled = false,
  label,
  description,
  fill = false,
  className = '',
}) {
  const { t } = useTranslation();
  const displayLabel = label ?? t('dropzone.label');
  const displayDescription = description ?? t('dropzone.description');

  const { dropzoneProps, isDropActive } = useDropzone({
    disabled,
    onDropPaths,
    onDropFiles,
  });

  const classes = [
    styles['drop-zone'],
    fill && styles.fill,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...dropzoneProps}>
      <div className={`${styles.overlay} ${isDropActive ? styles['is-active'] : ''}`}>
        <div className={styles.panel}>
          <span className={styles.label}>{displayLabel}</span>
          <span className={styles.description}>{displayDescription}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

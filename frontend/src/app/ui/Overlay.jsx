import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { X } from './icons';
import IconButton from './IconButton';
import { useTranslation } from '../providers/LanguageContext';
import styles from './Overlay.module.css';

export default function Overlay({
  children,
  onClose,
  centered = false,
  className = '',
  closeLabel,
  escHint,
}) {
  const { t } = useTranslation();

  // Listen for ESC key press to close overlay
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className={`${styles.root} ${centered ? styles['is-centered'] : ''} ${className}`.trim()}>
      {onClose && (
        <div className={styles['close-container']}>
          <IconButton
            variant="close-overlay"
            onClick={onClose}
            label={closeLabel || t('common.close')}
            title={null}
            size="md"
          >
            <X size={18} />
          </IconButton>
          <span className={styles['esc-hint']}>
            {escHint || t('settingsPage.closeShortcut') || 'ESC'}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

Overlay.propTypes = {
  children: PropTypes.node,
  onClose: PropTypes.func,
  centered: PropTypes.bool,
  className: PropTypes.string,
  closeLabel: PropTypes.string,
  escHint: PropTypes.string,
};

Overlay.ContentWrapper = function ContentWrapper({ children, className = '' }) {
  return <main className={`${styles['content-wrapper']} ${className}`.trim()}>{children}</main>;
};

Overlay.ContentWrapper.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

Overlay.Content = function Content({ children, className = '' }) {
  return <div className={`${styles.content} ${className}`.trim()}>{children}</div>;
};

Overlay.Content.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

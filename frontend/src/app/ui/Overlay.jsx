import { useEffect } from 'react';
import { X } from './icons';
import IconButton from './IconButton';
import { useTranslation } from '../providers/LanguageContext';
import './Overlay.css';

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
    <div className={`ui-overlay${centered ? ' ui-overlay--centered' : ''} ${className}`.trim()}>
      {onClose && (
        <div className="ui-close-container ui-overlay__close-container">
          <IconButton
            className="ui-close-btn"
            onClick={onClose}
            label={closeLabel || t('common.close')}
            title={null}
            size="md"
          >
            <X size={18} />
          </IconButton>
          <span className="ui-close-esc-hint">
            {escHint || t('settingsPage.closeShortcut') || 'ESC'}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

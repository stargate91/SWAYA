import { X } from '@/ui/icons';
import IconButton from '@/ui/IconButton';

export default function SettingsChrome({ t, onClose }) {
  return (
    <div className="ui-close-container ui-overlay__close-container">
      <IconButton
        className="ui-close-btn"
        onClick={onClose}
        label={t('settingsPage.closeSettings')}
        title={null}
        size="md"
      >
        <X size={18} />
      </IconButton>
      <span className="ui-close-esc-hint">{t('settingsPage.closeShortcut')}</span>
    </div>
  );
}

import Spinner from '@/ui/Spinner';

export default function SettingsLoadingState({ t }) {
  return (
    <div className="settings-overlay settings-overlay--centered">
      <Spinner label={t('settingsPage.loading')} />
    </div>
  );
}

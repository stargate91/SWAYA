import { useRef, useState } from 'react';
import { Upload, UserRound } from '@/ui/icons';
import api from '@/lib/api';
import { API_BASE } from '@/lib/backend';
import Button from '@/ui/Button';
import SettingsSectionRenderer from './SettingsSectionRenderer.jsx';
import { useSettingsFormContext } from '../SettingsFormContext.jsx';
import { createGeneralProfileSection } from '../settingsSectionConfigs.jsx';
import Inline from '@/ui/Inline';

export default function GeneralProfileSection({ t }) {
  const inputRef = useRef(null);
  const { form, actions } = useSettingsFormContext();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const avatarUrl = form.avatar_path
    ? (form.avatar_path.startsWith('http') ? form.avatar_path : `${API_BASE}${form.avatar_path}`)
    : '';

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setError('');
    try {
      const result = await api.settings.uploadAvatar(file);
      actions.handleChange('avatar_path')({ target: { value: result.avatar_path } });
    } catch (uploadError) {
      setError(uploadError.message || t('settingsPage.sections.profile.avatarUploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const section = createGeneralProfileSection(t);
  section.items.unshift({
    type: 'custom',
    key: 'avatar',
    render: () => (
      <Inline gap="md" align="center" className="settings-profile-avatar-field">
        <div className="settings-profile-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={t('settingsPage.sections.profile.avatarAlt')} />
          ) : (
            <UserRound size={30} />
          )}
        </div>
        <div className="settings-profile-avatar-copy">
          <strong>{t('settingsPage.sections.profile.avatar')}</strong>
          <span>{t('settingsPage.sections.profile.avatarHint')}</span>
          {error ? <span className="settings-profile-avatar-error">{error}</span> : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="settings-hidden-input"
          onChange={handleAvatarChange}
        />
        <Button
          type="button"
          variant="secondary-neutral"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} />
          {isUploading
            ? t('settingsPage.sections.profile.avatarUploading')
            : t('settingsPage.sections.profile.avatarUpload')}
        </Button>
      </Inline>
    ),
  });

  return <SettingsSectionRenderer section={section} />;
}

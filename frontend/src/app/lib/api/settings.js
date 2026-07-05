import { settingsApi } from './settings/index';
import { API_BASE } from '../backend';

export const settings = {
  ...settingsApi,
  uploadAvatar: (file, userId = 1) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/api/v1/settings/user/${userId}/avatar`, {
      method: 'POST',
      body: formData,
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || 'Failed to upload avatar');
      return data;
    });
  },
};

export * from './settings/index';

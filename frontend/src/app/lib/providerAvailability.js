export const hasProviderCredential = (settings, provider) => {
  if (!settings || typeof settings !== 'object') return false;

  if (provider === 'tmdb') {
    return Boolean(String(settings.tmdb_api_key || '').trim());
  }

  if (provider === 'porndb') {
    return Boolean(String(settings.porndb_api_key || settings.porndb_api_token || '').trim());
  }

  if (provider === 'stashdb') {
    return Boolean(String(settings.stashdb_api_key || '').trim());
  }

  if (provider === 'fansdb') {
    return Boolean(String(settings.fansdb_api_key || '').trim());
  }

  return false;
};

export const getOrganizerProviderOptions = (scanMode, settings) => {
  if (scanMode === 'offline') {
    return [];
  }

  if (scanMode === 'scenes') {
    return [
      { value: 'stashdb', label: 'StashDB', disabled: !hasProviderCredential(settings, 'stashdb') },
      { value: 'porndb', label: 'PornDB', disabled: !hasProviderCredential(settings, 'porndb') },
      { value: 'fansdb', label: 'FansDB', disabled: !hasProviderCredential(settings, 'fansdb') },
    ];
  }

  return [
    { value: 'tmdb', label: 'TMDb', disabled: !hasProviderCredential(settings, 'tmdb') },
    { value: 'porndb', label: 'PornDB', disabled: !hasProviderCredential(settings, 'porndb') },
  ];
};

export const getFirstEnabledProvider = (options, fallback = null) => {
  const fallbackOption = options.find((option) => option.value === fallback && !option.disabled);
  if (fallbackOption) return fallbackOption.value;
  return options.find((option) => !option.disabled)?.value || fallback || options[0]?.value || null;
};

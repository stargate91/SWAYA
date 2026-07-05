import { fetchJson } from '../../http';

export const normalizeFolderValidationResult = (response) => ({
  valid: Boolean(response?.valid),
  errors: response?.errors || null,
  code: response?.message || null,
});

export const getFolderValidationFieldErrors = (result) => {
  if (result?.errors) {
    return {
      scanFolder: result.errors.scanFolder || null,
      targetFolder: result.errors.targetFolder || null,
      general: result.errors.scanFolder || result.errors.targetFolder || null,
    };
  }

  const code = result?.code || '';
  const scanFolder = code.includes('scanDir') || code.includes('Scan Folder')
    ? code
    : null;
  const targetFolder = (
    code.includes('libraryDir') ||
    code.includes('Target Library Folder') ||
    code.includes('foldersCannotBeSame') ||
    code.includes('cannot be the same')
  )
    ? code
    : null;

  return {
    scanFolder,
    targetFolder,
    general: code || null,
  };
};

export const settingsValidationApi = {
  validateFolders: async (payload) => {
    const response = await fetchJson('/api/settings/validate-folders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return normalizeFolderValidationResult(response);
  },
  validateApiKeys: async (payload) => {
    return fetchJson('/api/settings/validate-api-keys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

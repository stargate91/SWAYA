/**
 * Validates that an imported JSON object matches the keys and value types of a reference object.
 * Useful for validating backups or imported configuration data.
 * 
 * @param {any} imported - The parsed JSON data to validate
 * @param {object} reference - The reference object to validate against (e.g. default settings)
 * @returns {boolean} True if the structure is valid, false otherwise
 */
export const validateJsonStructure = (imported, reference) => {
  if (typeof imported !== 'object' || imported === null) return false;
  if (typeof reference !== 'object' || reference === null) return false;
  
  const refKeys = Object.keys(reference);
  const importedKeys = Object.keys(imported);

  if (importedKeys.length === 0) return false;

  const keysToValidate = importedKeys.filter(key => refKeys.includes(key));
  if (keysToValidate.length === 0) return false;

  return keysToValidate.every(key => {
    // Allow null or undefined to pass, otherwise must match reference type
    if (imported[key] === null || imported[key] === undefined) return true;
    
    const importedType = typeof imported[key];
    const referenceType = typeof reference[key];
    
    if (importedType === referenceType) return true;
    if ((importedType === 'string' && referenceType === 'number') || (importedType === 'number' && referenceType === 'string')) {
      return true;
    }
    
    return false;
  });
};

export const extractImportedSettings = (payload) => {
  if (typeof payload !== 'object' || payload === null) return null;

  if (payload.app === 'SWAYA') {
    return typeof payload.settings === 'object' && payload.settings !== null && !Array.isArray(payload.settings)
      ? payload.settings
      : null;
  }

  return Array.isArray(payload) ? null : payload;
};

export const validateImportedSettings = (payload, reference) => {
  const settings = extractImportedSettings(payload);

  if (!settings) {
    return { valid: false, settings: null };
  }

  return {
    valid: validateJsonStructure(settings, reference),
    settings,
  };
};

import { settingsPersistenceApi } from './persistence';
import { settingsValidationApi } from './validation';

export * from './persistence';
export * from './validation';

export const settingsApi = {
  ...settingsPersistenceApi,
  ...settingsValidationApi,
};

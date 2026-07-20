import { Settings2, FolderTree, KeyRound, Wrench, Palette, Cpu, Flame } from '@/ui/icons';
import { ORGANIZATION_TAB_IDS, ADULT_TAB_IDS, SETTINGS_TAB_GROUP_IDS, SETTINGS_TAB_IDS } from './settingsConstants.js';

import {
  GeneralTab,
  ThemeTab,
  AdultGeneralTab,
  PresetsTab,
  OrganizationGeneralTab,
  MoviesTab,
  TvShowsTab,
  ExtrasTab,
  ApiKeysTab,
  AdvancedTab,
  MaintenanceTab,
  ScenesTab,
} from './components';

const alwaysVisible = () => true;
const whenCustomOrganization = ({ form }) => form.folder_organization_enabled && form.custom_organization_enabled;
const whenAdultScenes = ({ form }) => form.folder_organization_enabled && form.custom_organization_enabled && form.include_adult;
const whenMoveToLibraryAndCustomOrganization = ({ form }) => form.folder_organization_enabled && form.folder_move_to_library && form.custom_organization_enabled;
const whenCollectionsEnabled = ({ form }) => form.folder_organization_enabled && form.folder_move_to_library;

export const settingsTabGroups = [
  {
    id: SETTINGS_TAB_GROUP_IDS.GENERAL,
    labelKey: 'settingsPage.sidebar.general',
    icon: Settings2,
  },
  {
    id: SETTINGS_TAB_GROUP_IDS.THEME,
    labelKey: 'settingsPage.sidebar.theme',
    icon: Palette,
  },
  {
    id: SETTINGS_TAB_GROUP_IDS.ORGANIZATION,
    labelKey: 'settingsPage.sidebar.organization',
    icon: FolderTree,
    children: ORGANIZATION_TAB_IDS,
  },
  {
    id: SETTINGS_TAB_GROUP_IDS.ADULT,
    labelKey: 'settingsPage.sidebar.adult',
    icon: Flame,
    children: ADULT_TAB_IDS,
  },
  {
    id: SETTINGS_TAB_GROUP_IDS.API_KEYS,
    labelKey: 'settingsPage.sidebar.apiKeys',
    icon: KeyRound,
  },
  {
    id: SETTINGS_TAB_GROUP_IDS.ADVANCED,
    labelKey: 'settingsPage.sidebar.advanced',
    icon: Cpu,
  },
  {
    id: SETTINGS_TAB_GROUP_IDS.MAINTENANCE,
    labelKey: 'settingsPage.sidebar.maintenance',
    icon: Wrench,
  },
];

export const settingsTabDefinitions = [
  {
    id: SETTINGS_TAB_IDS.GENERAL,
    group: SETTINGS_TAB_GROUP_IDS.GENERAL,
    component: GeneralTab,
  },
  {
    id: SETTINGS_TAB_IDS.THEME,
    group: SETTINGS_TAB_GROUP_IDS.THEME,
    component: ThemeTab,
  },
  {
    id: SETTINGS_TAB_IDS.ADULT_GENERAL,
    group: SETTINGS_TAB_GROUP_IDS.ADULT,
    labelKey: 'settingsPage.sidebar.adultGeneral',
    component: AdultGeneralTab,
    isVisible: alwaysVisible,
  },
  {
    id: SETTINGS_TAB_IDS.ADULT_MOVIES,
    group: SETTINGS_TAB_GROUP_IDS.ADULT,
    labelKey: 'settingsPage.sidebar.movies',
    component: MoviesTab,
    isVisible: alwaysVisible,
    getProps: () => ({ isAdult: true }),
  },
  {
    id: SETTINGS_TAB_IDS.ADULT_TV_SHOWS,
    group: SETTINGS_TAB_GROUP_IDS.ADULT,
    labelKey: 'settingsPage.sidebar.tvShows',
    component: TvShowsTab,
    isVisible: alwaysVisible,
    getProps: () => ({ isAdult: true }),
  },
  {
    id: SETTINGS_TAB_IDS.PRESETS,
    group: SETTINGS_TAB_GROUP_IDS.ORGANIZATION,
    labelKey: 'settingsPage.sidebar.presets',
    component: PresetsTab,
    isVisible: alwaysVisible,
  },
  {
    id: SETTINGS_TAB_IDS.ORG_GENERAL,
    group: SETTINGS_TAB_GROUP_IDS.ORGANIZATION,
    labelKey: 'settingsPage.sidebar.general',
    component: OrganizationGeneralTab,
    isVisible: alwaysVisible,
  },
  {
    id: SETTINGS_TAB_IDS.MOVIES,
    group: SETTINGS_TAB_GROUP_IDS.ORGANIZATION,
    labelKey: 'settingsPage.sidebar.movies',
    component: MoviesTab,
    isVisible: alwaysVisible,
  },
  {
    id: SETTINGS_TAB_IDS.TV_SHOWS,
    group: SETTINGS_TAB_GROUP_IDS.ORGANIZATION,
    labelKey: 'settingsPage.sidebar.tvShows',
    component: TvShowsTab,
    isVisible: alwaysVisible,
  },
  {
    id: SETTINGS_TAB_IDS.EXTRAS,
    group: SETTINGS_TAB_GROUP_IDS.ORGANIZATION,
    labelKey: 'settingsPage.sidebar.extras',
    component: ExtrasTab,
    isVisible: alwaysVisible,
    className: 'custom-only',
  },
  {
    id: SETTINGS_TAB_IDS.SCENES,
    group: SETTINGS_TAB_GROUP_IDS.ADULT,
    labelKey: 'settingsPage.sidebar.scenes',
    component: ScenesTab,
    isVisible: alwaysVisible,
    className: 'custom-only',
    getProps: (ctx) => ({
      form: ctx.form,
      t: ctx.t,
      handleChange: ctx.handleChange,
      handleCheckboxChange: ctx.handleCheckboxChange,
      insertTag: ctx.insertTag,
      formInputs: ctx.formInputs,
    }),
  },
  {
    id: SETTINGS_TAB_IDS.API_KEYS,
    group: SETTINGS_TAB_GROUP_IDS.API_KEYS,
    component: ApiKeysTab,
  },
  {
    id: SETTINGS_TAB_IDS.ADVANCED,
    group: SETTINGS_TAB_GROUP_IDS.ADVANCED,
    component: AdvancedTab,
  },
  {
    id: SETTINGS_TAB_IDS.MAINTENANCE,
    group: SETTINGS_TAB_GROUP_IDS.MAINTENANCE,
    component: MaintenanceTab,
    getProps: (ctx) => ({
      t: ctx.t,
      isSaving: ctx.isSaving,
      isWiping: ctx.isWiping,
      isWipingCache: ctx.isWipingCache,
      isScanActive: ctx.realBackgroundActive,
      handleExportSettings: ctx.handleExportSettings,
      handleImportClick: ctx.handleImportClick,
      handleImportSettings: ctx.handleImportSettings,
      handleWipeDatabase: ctx.handleWipeDatabase,
      handleWipeCache: ctx.handleWipeCache,
      formInputs: ctx.formInputs,
    }),
  },
];

export function getVisibleOrganizationTabs(ctx) {
  return settingsTabDefinitions
    .filter((tab) => tab.group === SETTINGS_TAB_GROUP_IDS.ORGANIZATION)
    .map((tab) => ({
      ...tab,
      isCurrentlyVisible: tab.isVisible ? tab.isVisible(ctx) : true,
    }));
}

export function getVisibleAdultTabs(ctx) {
  return settingsTabDefinitions
    .filter((tab) => tab.group === SETTINGS_TAB_GROUP_IDS.ADULT)
    .map((tab) => ({
      ...tab,
      isCurrentlyVisible: tab.isVisible ? tab.isVisible(ctx) : true,
    }));
}

export function getTabDefinition(tabId) {
  return settingsTabDefinitions.find((tab) => tab.id === tabId) || null;
}



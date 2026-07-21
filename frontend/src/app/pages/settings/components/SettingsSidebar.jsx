import { useState } from 'react';
import Sidebar from '@/ui/Sidebar';
import { SETTINGS_TAB_IDS } from '../settingsConstants.js';
import {
  Settings2,
  Palette,
  FolderTree,
  Layers,
  Flame,
  KeyRound,
  Cpu,
  Wrench,
  Clapperboard,
} from '@/ui/icons';

export default function SettingsSidebar({
  t,
  visibleOrganizationTabs,
  visibleAdultTabs,
  activeTab,
  onTabSelect,
  includeAdult = false,
}) {
  const [manualTemplatesExpanded, setManualTemplatesExpanded] = useState(null);
  const [manualAdultTemplatesExpanded, setManualAdultTemplatesExpanded] = useState(null);

  const isTemplatesExpanded = manualTemplatesExpanded !== null
    ? manualTemplatesExpanded
    : (activeTab === SETTINGS_TAB_IDS.MOVIES || activeTab === SETTINGS_TAB_IDS.TV_SHOWS);

  const isAdultTemplatesExpanded = manualAdultTemplatesExpanded !== null
    ? manualAdultTemplatesExpanded
    : (activeTab === SETTINGS_TAB_IDS.ADULT_MOVIES ||
       activeTab === SETTINGS_TAB_IDS.ADULT_TV_SHOWS ||
       activeTab === SETTINGS_TAB_IDS.SCENES);

  const sidebarGroups = [];

  // Group 1: General Settings (Flat)
  sidebarGroups.push({
    id: SETTINGS_TAB_IDS.GENERAL,
    label: t('settingsPage.sidebar.general'),
    icon: Settings2,
    isActive: activeTab === SETTINGS_TAB_IDS.GENERAL,
  });

  sidebarGroups.push({
    id: SETTINGS_TAB_IDS.THEME,
    label: t('settingsPage.sidebar.theme'),
    icon: Palette,
    isActive: activeTab === SETTINGS_TAB_IDS.THEME,
  });

  sidebarGroups.push({
    id: SETTINGS_TAB_IDS.ADULT_GENERAL,
    label: t('settingsPage.sidebar.adult'),
    icon: Flame,
    isActive: activeTab === SETTINGS_TAB_IDS.ADULT_GENERAL,
  });

  sidebarGroups.push({
    id: SETTINGS_TAB_IDS.API_KEYS,
    label: t('settingsPage.sidebar.apiKeys'),
    icon: KeyRound,
    isActive: activeTab === SETTINGS_TAB_IDS.API_KEYS,
  });

  sidebarGroups.push({
    id: SETTINGS_TAB_IDS.ADVANCED,
    label: t('settingsPage.sidebar.advanced'),
    icon: Cpu,
    isActive: activeTab === SETTINGS_TAB_IDS.ADVANCED,
  });

  sidebarGroups.push({
    id: SETTINGS_TAB_IDS.MAINTENANCE,
    label: t('settingsPage.sidebar.maintenance'),
    icon: Wrench,
    isActive: activeTab === SETTINGS_TAB_IDS.MAINTENANCE,
  });

  // Group 2: Organization Section Header
  sidebarGroups.push({
    id: 'sec-org',
    type: 'section-header',
    label: t('settingsPage.sidebar.organization'),
  });

  const orgIcons = {
    [SETTINGS_TAB_IDS.PRESETS]: Settings2,
    [SETTINGS_TAB_IDS.ORG_GENERAL]: FolderTree,
    [SETTINGS_TAB_IDS.EXTRAS]: Layers,
  };

  const templateSubItems = [];

  visibleOrganizationTabs.forEach((tab) => {
    if (!tab.isCurrentlyVisible) return;

    if (tab.id === SETTINGS_TAB_IDS.MOVIES || tab.id === SETTINGS_TAB_IDS.TV_SHOWS) {
      templateSubItems.push({
        id: tab.id,
        label: t(tab.labelKey),
        isActive: activeTab === tab.id,
      });
      return;
    }

    sidebarGroups.push({
      id: tab.id,
      label: t(tab.labelKey),
      icon: orgIcons[tab.id] || FolderTree,
      isActive: activeTab === tab.id,
    });
  });

  if (templateSubItems.length > 0) {
    const extrasIndex = sidebarGroups.findIndex(g => g.id === SETTINGS_TAB_IDS.EXTRAS);
    const templatesGroup = {
      id: 'group-templates',
      label: t('settingsPage.sidebar.templates'),
      icon: Clapperboard,
      isActive: activeTab === SETTINGS_TAB_IDS.MOVIES || activeTab === SETTINGS_TAB_IDS.TV_SHOWS,
      isExpanded: isTemplatesExpanded,
      onToggle: () => {
        const nextExpanded = !isTemplatesExpanded;
        setManualTemplatesExpanded(nextExpanded);
        if (nextExpanded && activeTab !== SETTINGS_TAB_IDS.MOVIES && activeTab !== SETTINGS_TAB_IDS.TV_SHOWS) {
          onTabSelect(SETTINGS_TAB_IDS.MOVIES);
        }
      },
      subItems: templateSubItems,
    };

    if (extrasIndex !== -1) {
      sidebarGroups.splice(extrasIndex, 0, templatesGroup);
    } else {
      sidebarGroups.push(templatesGroup);
    }
  }

  const adultTemplateSubItems = [];
  if (includeAdult) {
    visibleAdultTabs.forEach((tab) => {
      if (tab.id !== SETTINGS_TAB_IDS.ADULT_GENERAL && tab.isCurrentlyVisible) {
        adultTemplateSubItems.push({
          id: tab.id,
          label: t(tab.labelKey),
          isActive: activeTab === tab.id,
        });
      }
    });
  }

  if (includeAdult && adultTemplateSubItems.length > 0) {
    const extrasIndex = sidebarGroups.findIndex(g => g.id === SETTINGS_TAB_IDS.EXTRAS);
    const adultTemplatesGroup = {
      id: 'group-adult-templates',
      label: t('settingsPage.sidebar.adultTemplates'),
      icon: Flame,
      isActive: activeTab === SETTINGS_TAB_IDS.ADULT_MOVIES ||
                activeTab === SETTINGS_TAB_IDS.ADULT_TV_SHOWS ||
                activeTab === SETTINGS_TAB_IDS.SCENES,
      isExpanded: isAdultTemplatesExpanded,
      onToggle: () => {
        const nextExpanded = !isAdultTemplatesExpanded;
        setManualAdultTemplatesExpanded(nextExpanded);
        if (nextExpanded &&
            activeTab !== SETTINGS_TAB_IDS.ADULT_MOVIES &&
            activeTab !== SETTINGS_TAB_IDS.ADULT_TV_SHOWS &&
            activeTab !== SETTINGS_TAB_IDS.SCENES) {
          onTabSelect(SETTINGS_TAB_IDS.ADULT_MOVIES);
        }
      },
      subItems: adultTemplateSubItems,
    };

    if (extrasIndex !== -1) {
      sidebarGroups.splice(extrasIndex, 0, adultTemplatesGroup);
    } else {
      sidebarGroups.push(adultTemplatesGroup);
    }
  }

  return (
    <Sidebar
      header={t('sidebar.settings')}
      groups={sidebarGroups}
      onTabSelect={onTabSelect}
    />
  );
}

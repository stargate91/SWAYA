import Sidebar from '@/ui/Sidebar';
import { SETTINGS_TAB_GROUP_IDS } from '../settingsConstants.js';

export default function SettingsSidebar({
  t,
  tabGroups,
  visibleOrganizationTabs,
  visibleAdultTabs,
  activeTab,
  isOrgExpanded,
  isOrganizationTabActive,
  isAdultExpanded,
  isAdultTabActive,
  onTabSelect,
  onOrganizationToggle,
  onAdultToggle,
}) {
  const isOrgSubMenuVisible = isOrgExpanded || isOrganizationTabActive;
  const isAdultSubMenuVisible = isAdultExpanded || isAdultTabActive;

  const sidebarGroups = tabGroups.map((group) => {
    if (group.id === SETTINGS_TAB_GROUP_IDS.ORGANIZATION) {
      return {
        id: group.id,
        label: t(group.labelKey),
        icon: group.icon,
        isActive: isOrganizationTabActive,
        isExpanded: isOrgSubMenuVisible,
        onToggle: onOrganizationToggle,
        subItems: visibleOrganizationTabs.map((tab) => ({
          id: tab.id,
          label: t(tab.labelKey),
          isActive: activeTab === tab.id,
        })),
      };
    }

    if (group.id === SETTINGS_TAB_GROUP_IDS.ADULT) {
      return {
        id: group.id,
        label: t(group.labelKey),
        icon: group.icon,
        isActive: isAdultTabActive,
        isExpanded: isAdultSubMenuVisible,
        onToggle: onAdultToggle,
        subItems: visibleAdultTabs.map((tab) => ({
          id: tab.id,
          label: t(tab.labelKey),
          isActive: activeTab === tab.id,
        })),
      };
    }

    return {
      id: group.id,
      label: t(group.labelKey),
      icon: group.icon,
      isActive: activeTab === group.id,
    };
  });

  return (
    <Sidebar
      header={t('sidebar.settings')}
      groups={sidebarGroups}
      onTabSelect={onTabSelect}
    />
  );
}

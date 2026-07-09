import Sidebar from '@/ui/Sidebar';
import { SETTINGS_TAB_GROUP_IDS } from '../settingsConstants.js';

export default function SettingsSidebar({
  t,
  tabGroups,
  visibleOrganizationTabs,
  activeOrganizationIndex,
  activeTab,
  isOrgExpanded,
  isOrganizationTabActive,
  onTabSelect,
  onOrganizationToggle,
}) {
  const isSubMenuVisible = isOrgExpanded || isOrganizationTabActive;

  const sidebarGroups = tabGroups.map((group) => {
    if (group.id === SETTINGS_TAB_GROUP_IDS.ORGANIZATION) {
      return {
        id: group.id,
        label: t(group.labelKey),
        icon: group.icon,
        isActive: isOrganizationTabActive,
        isExpanded: isSubMenuVisible,
        onToggle: onOrganizationToggle,
        subItems: visibleOrganizationTabs.map((tab) => ({
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

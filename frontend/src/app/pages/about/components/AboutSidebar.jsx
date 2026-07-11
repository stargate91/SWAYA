import Sidebar from '../../../ui/Sidebar';

export default function AboutSidebar({
  activeTab,
  isDocsExpanded,
  setIsDocsExpanded,
  handleSetActiveTab,
  tabs,
  t
}) {
  const isDocsTabActive = activeTab === 'docs' || activeTab.startsWith('docs_');

  const sidebarGroups = tabs.map((tab) => {
    if (tab.subItems) {
      return {
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        isActive: isDocsTabActive,
        isExpanded: isDocsExpanded || isDocsTabActive,
        onToggle: () => {
          setIsDocsExpanded(!isDocsExpanded);
          if (!activeTab.startsWith('docs_')) {
            handleSetActiveTab('docs_tmdb');
          }
        },
        subItems: tab.subItems.map((sub) => ({
          id: sub.id,
          label: sub.label,
          isActive: activeTab === sub.id,
        })),
      };
    }
    return {
      id: tab.id,
      label: tab.label,
      icon: tab.icon,
      isActive: activeTab === tab.id,
    };
  });

  return (
    <Sidebar
      header={t('about.title')}
      groups={sidebarGroups}
      onTabSelect={handleSetActiveTab}
    />
  );
}

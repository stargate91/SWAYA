import { SIDEBAR_ICONS } from '../ui/icons';
import { useTranslation } from '../providers/LanguageContext';
import { sendWindowEvent } from '../lib/ipc';

export const navItems = [
  { to: '/dashboard', translationKey: 'sidebar.dashboard', icon: SIDEBAR_ICONS.dashboard },
  { to: '/organizer', translationKey: 'sidebar.organizer', icon: SIDEBAR_ICONS.organizer },
  { to: '/library', translationKey: 'sidebar.library', icon: SIDEBAR_ICONS.library },
  { to: '/lists', translationKey: 'sidebar.lists', icon: SIDEBAR_ICONS.lists },
  { to: '/my-ratings', translationKey: 'sidebar.myRatings', icon: SIDEBAR_ICONS.myRatings },
  { to: '/history', translationKey: 'sidebar.history', icon: SIDEBAR_ICONS.history },
  { to: '/settings', translationKey: 'sidebar.settings', icon: SIDEBAR_ICONS.settings },
];

export function useSidebar(isCollapsed) {
  const { t } = useTranslation();
  const toggleAriaLabel = isCollapsed ? 'Expand navigation' : 'Collapse navigation';

  const quitApp = () => {
    sendWindowEvent('app-quit');
  };

  return {
    t,
    navItems,
    toggleAriaLabel,
    quitApp,
  };
}

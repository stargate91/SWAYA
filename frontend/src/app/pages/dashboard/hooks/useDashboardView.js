import { useState } from 'react';
import { useSettingsQuery, useStatsQuery } from '@/queries';
import { useTranslation } from '@/providers/LanguageContext';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';

const DEFAULT_WIDGETS = {
  continue_watching: true,
  spotlight: true,
  recently_added: true,
  recently_activated_people: true,
  movies_discovery: true,
  tv_discovery: true,
  top_20: true,
  adult: true,
  stashdb_discovery: true,
  fansdb_discovery: true,
};

const DEFAULT_ORDER = [
  'continue_watching',
  'spotlight',
  'recently_added',
  'recently_activated_people',
  'movies_discovery',
  'tv_discovery',
  'top_20',
  'adult',
  'stashdb_discovery',
  'fansdb_discovery',
];

export default function useDashboardView() {
  const { t } = useTranslation();
  const { data: settings = {} } = useSettingsQuery();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('swaya_dashboard_customization');
      return saved ? { ...DEFAULT_WIDGETS, ...JSON.parse(saved) } : DEFAULT_WIDGETS;
    } catch {
      return DEFAULT_WIDGETS;
    }
  });

  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('swaya_dashboard_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = [...parsed];
        DEFAULT_ORDER.forEach((key) => {
          if (!merged.includes(key)) {
            merged.push(key);
          }
        });
        return merged.filter((key) => DEFAULT_ORDER.includes(key));
      }
      return DEFAULT_ORDER;
    } catch {
      return DEFAULT_ORDER;
    }
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const toggleWidget = (key) => {
    setVisibleWidgets((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('swaya_dashboard_customization', JSON.stringify(updated));
      return updated;
    });
  };

  const handleOrderChange = (key, newIndex) => {
    setWidgetOrder((prev) => {
      const updated = prev.filter((k) => k !== key);
      updated.splice(newIndex, 0, key);
      localStorage.setItem('swaya_dashboard_order', JSON.stringify(updated));
      return updated;
    });
  };

  const showAdult = Boolean(settings?.include_adult);
  const isNsfw = showAdult && sessionMode === 'nsfw';

  const { data: stats = {}, isLoading: statsLoading } = useStatsQuery(sessionMode === 'nsfw');

  const getGreetingKey = () => {
    const isNsfwGreet = showAdult && sessionMode === 'nsfw';

    const hasItems = (
      (stats.genre_distribution && Object.keys(stats.genre_distribution).length > 0) ||
      (stats.decade_distribution && Object.keys(stats.decade_distribution).length > 0)
    );

    if (!statsLoading && !hasItems) {
      return isNsfwGreet ? 'onboarding_nsfw' : 'onboarding';
    }

    const hour = new Date().getHours();
    let timeKey;
    if (hour >= 5 && hour < 12) {
      timeKey = 'morning';
    } else if (hour >= 12 && hour < 18) {
      timeKey = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      timeKey = 'evening';
    } else {
      timeKey = 'night';
    }

    return isNsfwGreet ? `${timeKey}_nsfw` : timeKey;
  };

  const displayName = settings.user_name?.trim();
  const greetingKey = getGreetingKey();
  const welcomeTitle = displayName
    ? t(`dashboard.welcome.${greetingKey}`, { name: displayName })
    : t(`dashboard.welcome_no_name.${greetingKey}`) || 'Welcome back';

  return {
    t,
    settings,
    isNsfw,
    showAdult,
    visibleWidgets,
    toggleWidget,
    widgetOrder,
    handleOrderChange,
    isCustomizerOpen,
    setIsCustomizerOpen,
    welcomeTitle,
  };
}

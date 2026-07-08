import { useState } from 'react';
import { useSettingsQuery, useStatsQuery } from '../../queries';
import { useTranslation } from '../../providers/LanguageContext';
import { useLibraryModeStore } from '../../stores/useLibraryModeStore';
import { SlidersHorizontal } from '@/ui/icons';
import UtilityBarPortal from '../../../components/UtilityBarPortal';
import IconButton from '@/ui/IconButton';
import Tooltip from '@/ui/Tooltip';
import ContinueWatchingWidget from './widgets/ContinueWatchingWidget';
import RecommendationsWidget from './widgets/RecommendationsWidget';
import TMDBDiscoveryWidget from './widgets/TMDBDiscoveryWidget';
import DashboardCustomizerDrawer from './widgets/DashboardCustomizerDrawer';
import './DashboardPage.css';

const DEFAULT_WIDGETS = {
  continue_watching: true,
  spotlight: true,
  recently_added: true,
  recently_activated_people: true,
  movies_discovery: true,
  tv_discovery: true,
  top_20: true,
  adult: true,
};

const DEFAULT_ORDER = [
  'continue_watching',
  'spotlight',
  'recently_added',
  'recently_activated_people',
  'movies_discovery',
  'tv_discovery',
  'top_20',
  'adult'
];

const DashboardView = () => {
  const { data: settings = {} } = useSettingsQuery();
  const { t } = useTranslation();

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

  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const showAdult = Boolean(settings?.include_adult);

  const { data: stats = {}, isLoading: statsLoading } = useStatsQuery(sessionMode === 'nsfw');

  const getGreetingKey = () => {
    const isNsfw = showAdult && sessionMode === 'nsfw';

    const hasItems = (
      (stats.genre_distribution && Object.keys(stats.genre_distribution).length > 0) ||
      (stats.decade_distribution && Object.keys(stats.decade_distribution).length > 0)
    );

    if (!statsLoading && !hasItems) {
      return isNsfw ? 'onboarding_nsfw' : 'onboarding';
    }

    const hour = new Date().getHours();
    let timeKey = 'afternoon';
    if (hour >= 5 && hour < 12) {
      timeKey = 'morning';
    } else if (hour >= 12 && hour < 18) {
      timeKey = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      timeKey = 'evening';
    } else {
      timeKey = 'night';
    }

    return isNsfw ? `${timeKey}_nsfw` : timeKey;
  };

  const displayName = settings.user_name?.trim();
  const greetingKey = getGreetingKey();
  const welcomeTitle = displayName
    ? t(`dashboard.welcome.${greetingKey}`, { name: displayName })
    : t(`dashboard.welcome_no_name.${greetingKey}`) || 'Welcome back';

  return (
    <>
      <UtilityBarPortal>
        <div className="dashboard-utility-bar-wrapper">
          <Tooltip content={t('dashboard.customize') || 'Customize Dashboard'} side="bottom">
            <IconButton
              onClick={() => setIsCustomizerOpen(true)}
              variant="dashboard-customizer"
              title={null}
            >
              <SlidersHorizontal size={18} />
            </IconButton>
          </Tooltip>
        </div>
      </UtilityBarPortal>

      <div className="dashboard-header">
        <h1 className="dashboard-header__title">{welcomeTitle}</h1>
        <p className="dashboard-header__subtitle">{t('dashboard.subtitle') || 'Here is an overview of your media library.'}</p>
      </div>

      {widgetOrder.map((key) => {
        if (key === 'continue_watching') {
          return visibleWidgets.continue_watching && <ContinueWatchingWidget key={key} T={t} />;
        }
        if (key === 'top_20') {
          return visibleWidgets.top_20 && settings?.tmdb_api_key && <TMDBDiscoveryWidget key={key} T={t} />;
        }
        const isRecKey = ['spotlight', 'recently_added', 'recently_activated_people', 'movies_discovery', 'tv_discovery', 'adult'].includes(key);
        if (isRecKey) {
          return (
            <RecommendationsWidget
              key={key}
              widgetKey={key}
              language={settings?.ui_language || settings?.primary_metadata_language}
              T={t}
              visibleWidgets={visibleWidgets}
            />
          );
        }
        return null;
      })}

      <DashboardCustomizerDrawer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        visibleWidgets={visibleWidgets}
        toggleWidget={toggleWidget}
        widgetOrder={widgetOrder}
        handleOrderChange={handleOrderChange}
        showAdult={showAdult}
        t={t}
      />
    </>
  );
};

export default DashboardView;

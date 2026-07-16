import { useState } from 'react';
import { useSettingsQuery, useStatsQuery } from '../../queries';
import { useTranslation } from '../../providers/LanguageContext';
import { useLibraryModeStore } from '../../stores/useLibraryModeStore';
import { SlidersHorizontal } from '@/ui/icons';
import UtilityBarPortal from '../../../components/UtilityBarPortal';
import IconButton from '@/ui/IconButton';
import Tooltip from '@/ui/Tooltip';
import ContinueWatchingWidget from './widgets/ContinueWatchingWidget';
import SpotlightWidget from './widgets/SpotlightWidget';
import RecentlyAddedWidget from './widgets/RecentlyAddedWidget';
import RecentlyActivePeopleWidget from './widgets/RecentlyActivePeopleWidget';
import MoviesDiscoveryWidget from './widgets/MoviesDiscoveryWidget';
import TvDiscoveryWidget from './widgets/TvDiscoveryWidget';
import AdultRecommendationsWidget from './widgets/AdultRecommendationsWidget';
import TMDBDiscoveryWidget from './widgets/TMDBDiscoveryWidget';
import DashboardCustomizerDrawer from './widgets/DashboardCustomizerDrawer';
import WidgetErrorBoundary from '../../../components/WidgetErrorBoundary';
import styles from './DashboardView.module.css';

const WIDGET_REGISTRY = {
  continue_watching: {
    component: ContinueWatchingWidget,
    titleKey: 'dashboard.widget_continue_watching',
    fallbackTitle: 'Continue Watching',
  },
  spotlight: {
    component: SpotlightWidget,
    titleKey: 'dashboard.widget_spotlight',
    fallbackTitle: 'Spotlight (Trending)',
  },
  recently_added: {
    component: RecentlyAddedWidget,
    titleKey: 'dashboard.widget_recently_added',
    fallbackTitle: 'Recently Added',
    getProps: (settings, lang) => ({ language: lang }),
  },
  recently_activated_people: {
    component: RecentlyActivePeopleWidget,
    titleKey: (isNsfw) => isNsfw ? 'dashboard.widget_recently_activated_people_adult' : 'dashboard.widget_recently_activated_people',
    fallbackTitle: (isNsfw) => isNsfw ? 'Lately Tracked Adult Stars' : 'Lately Tracked Artists',
    getProps: (settings, lang) => ({ language: lang }),
  },
  movies_discovery: {
    component: MoviesDiscoveryWidget,
    titleKey: 'dashboard.widget_movies_discovery',
    fallbackTitle: 'Discover Movies',
  },
  tv_discovery: {
    component: TvDiscoveryWidget,
    titleKey: 'dashboard.widget_tv_discovery',
    fallbackTitle: 'Discover TV Shows',
  },
  top_20: {
    component: TMDBDiscoveryWidget,
    titleKey: 'dashboard.widget_top_20',
    fallbackTitle: 'Top 20 Discoveries',
    show: (settings) => Boolean(settings?.tmdb_api_key),
  },
  adult: {
    component: AdultRecommendationsWidget,
    titleKey: 'dashboard.widget_adult',
    fallbackTitle: 'Adult recommendations',
    show: (settings) => Boolean(settings?.include_adult),
  },
};

const DEFAULT_WIDGETS = Object.keys(WIDGET_REGISTRY).reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {});

const DEFAULT_ORDER = Object.keys(WIDGET_REGISTRY);

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

  return (
    <>
      <UtilityBarPortal>
        <div className={styles['dashboard-utility-bar-wrapper']}>
          <Tooltip
            content={t('dashboard.customize') || 'Customize Dashboard'}
            side="bottom"
            triggerClassName={styles['dashboard-utility-bar-tooltip']}
          >
            <IconButton
              onClick={() => setIsCustomizerOpen(true)}
              className={styles['dashboard-customizer-btn']}
              title={null}
            >
              <SlidersHorizontal size={18} />
            </IconButton>
          </Tooltip>
        </div>
      </UtilityBarPortal>

      <div className={styles['dashboard-header']}>
        <h1 className={styles['dashboard-header__title']}>{welcomeTitle}</h1>
        <p className={styles['dashboard-header__subtitle']}>{t('dashboard.subtitle') || 'Here is an overview of your media library.'}</p>
      </div>

      {widgetOrder.map((key) => {
        const widgetConfig = WIDGET_REGISTRY[key];
        if (!widgetConfig) return null;

        const lang = settings?.ui_language || settings?.primary_metadata_language;

        if (widgetConfig.show && !widgetConfig.show(settings, isNsfw)) {
          return null;
        }

        const titleKey = typeof widgetConfig.titleKey === 'function'
          ? widgetConfig.titleKey(isNsfw)
          : widgetConfig.titleKey;

        const fallbackTitle = typeof widgetConfig.fallbackTitle === 'function'
          ? widgetConfig.fallbackTitle(isNsfw)
          : widgetConfig.fallbackTitle;

        const title = t(titleKey) || fallbackTitle;
        const WidgetComponent = widgetConfig.component;
        const customProps = widgetConfig.getProps ? widgetConfig.getProps(settings, lang) : {};

        const widgetEl = visibleWidgets[key] && <WidgetComponent {...customProps} />;

        if (widgetEl) {
          return (
            <WidgetErrorBoundary key={key} name={key} title={title} t={t}>
              {widgetEl}
            </WidgetErrorBoundary>
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
        styles={styles}
        widgetRegistry={WIDGET_REGISTRY}
      />
    </>
  );
};

export default DashboardView;

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
        <div className={styles['dashboard-utility-bar-wrapper']}>
          <Tooltip content={t('dashboard.customize') || 'Customize Dashboard'} side="bottom">
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
        const lang = settings?.ui_language || settings?.primary_metadata_language;
        const isNsfw = showAdult && sessionMode === 'nsfw';
        let widgetEl = null;
        let title = '';

        if (key === 'continue_watching') {
          title = t('dashboard.widget_continue_watching') || 'Continue Watching';
          widgetEl = visibleWidgets.continue_watching && <ContinueWatchingWidget T={t} />;
        } else if (key === 'spotlight') {
          title = t('dashboard.widget_spotlight') || 'Spotlight (Trending)';
          widgetEl = visibleWidgets.spotlight && <SpotlightWidget T={t} />;
        } else if (key === 'recently_added') {
          title = t('dashboard.widget_recently_added') || 'Recently Added';
          widgetEl = visibleWidgets.recently_added && <RecentlyAddedWidget T={t} language={lang} />;
        } else if (key === 'recently_activated_people') {
          title = t(isNsfw ? 'dashboard.widget_recently_activated_people_adult' : 'dashboard.widget_recently_activated_people') || (isNsfw ? 'Lately Tracked Adult Stars' : 'Lately Tracked Artists');
          widgetEl = visibleWidgets.recently_activated_people && <RecentlyActivePeopleWidget T={t} language={lang} />;
        } else if (key === 'movies_discovery') {
          title = t('dashboard.widget_movies_discovery') || 'Discover Movies';
          widgetEl = visibleWidgets.movies_discovery && <MoviesDiscoveryWidget T={t} />;
        } else if (key === 'tv_discovery') {
          title = t('dashboard.widget_tv_discovery') || 'Discover TV Shows';
          widgetEl = visibleWidgets.tv_discovery && <TvDiscoveryWidget T={t} />;
        } else if (key === 'top_20') {
          title = t('dashboard.widget_top_20') || 'Top 20 Discoveries';
          widgetEl = visibleWidgets.top_20 && settings?.tmdb_api_key && <TMDBDiscoveryWidget T={t} />;
        } else if (key === 'adult') {
          title = t('dashboard.widget_adult') || 'Adult recommendations';
          widgetEl = visibleWidgets.adult && <AdultRecommendationsWidget T={t} />;
        }

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
        t={t}
        styles={styles}
      />
    </>
  );
};

export default DashboardView;

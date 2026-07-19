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
import PageHeader from '@/ui/PageHeader';
import Stack from '@/ui/Stack';
import WidgetErrorBoundary from '../../../components/WidgetErrorBoundary';
import useDashboardView from './hooks/useDashboardView';

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

const DashboardView = () => {
  const {
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
  } = useDashboardView();

  return (
    <>
      <UtilityBarPortal align="right">
        <Tooltip
          content={t('dashboard.customize') || 'Customize Dashboard'}
          side="bottom"
        >
          <IconButton
            onClick={() => setIsCustomizerOpen(true)}
            variant="glass"
            size="md-btn"
            title={null}
          >
            <SlidersHorizontal size={18} />
          </IconButton>
        </Tooltip>
      </UtilityBarPortal>

      <Stack gap="4xl">
        <PageHeader
          title={welcomeTitle}
          description={t('dashboard.subtitle') || 'Here is an overview of your media library.'}
        />

        <Stack gap="4xl">
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
        </Stack>
      </Stack>

      <DashboardCustomizerDrawer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        visibleWidgets={visibleWidgets}
        toggleWidget={toggleWidget}
        widgetOrder={widgetOrder}
        handleOrderChange={handleOrderChange}
        showAdult={showAdult}
        widgetRegistry={WIDGET_REGISTRY}
      />
    </>
  );
};

export default DashboardView;

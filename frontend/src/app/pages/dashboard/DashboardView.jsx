import { useState } from 'react';
import { useSettingsQuery } from '../../queries';
import { useTranslation } from '../../providers/LanguageContext';
import { SlidersHorizontal } from '@/ui/icons';
import Button from '../../ui/Button';
import UtilityBarPortal from '../../../components/UtilityBarPortal';
import ContinueWatchingWidget from './widgets/ContinueWatchingWidget';
import LibraryInsightsWidget from './widgets/LibraryInsightsWidget';
import StatisticsWidget from './widgets/StatisticsWidget';
import RecommendationsWidget from './widgets/RecommendationsWidget';
import DashboardCustomizerDrawer from './widgets/DashboardCustomizerDrawer';
import './DashboardPage.css';

const DEFAULT_WIDGETS = {
  continue_watching: true,
  spotlight: true,
  movies_discovery: true,
  tv_discovery: true,
  top_20: true,
  adult: true,
  library_dna: true,
  timeline: true,
  statistics: true,
};

const DEFAULT_ORDER = ['continue_watching', 'recommendations', 'insights', 'statistics'];

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
      return saved ? JSON.parse(saved) : DEFAULT_ORDER;
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

  const [isBtnHovered, setIsBtnHovered] = useState(false);

  const displayName = settings.user_name?.trim();
  const welcomeTitle = displayName
    ? t('dashboard.welcome', { name: displayName })
    : t('dashboard.welcome_no_name') || 'Welcome back';

  const showAdult = Boolean(settings?.include_adult);

  return (
    <>
      <UtilityBarPortal>
        <div style={{ position: 'absolute', right: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            onMouseEnter={() => setIsBtnHovered(true)}
            onMouseLeave={() => setIsBtnHovered(false)}
            style={{
              background: 'var(--media-detail-side-nav-bg, rgba(20, 20, 25, 0.6))',
              border: '1px solid var(--media-detail-side-nav-border, rgba(255, 255, 255, 0.08))',
              color: isBtnHovered ? 'var(--color-text-primary, #ffffff)' : 'var(--color-text-secondary, #888899)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              opacity: isBtnHovered ? 1 : 0.6,
              outline: 'none',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            title={t('dashboard.customize') || 'Customize Dashboard'}
            aria-label={t('dashboard.customize') || 'Customize Dashboard'}
          >
            <SlidersHorizontal size={18} />
          </button>
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
        if (key === 'recommendations') {
          return (
            <RecommendationsWidget
              key={key}
              language={settings?.ui_language || settings?.primary_metadata_language}
              T={t}
              visibleWidgets={visibleWidgets}
            />
          );
        }
        if (key === 'insights') {
          return (visibleWidgets.library_dna !== false || visibleWidgets.timeline !== false) && (
            <LibraryInsightsWidget
              key={key}
              T={t}
              showDna={visibleWidgets.library_dna !== false}
              showTimeline={visibleWidgets.timeline !== false}
            />
          );
        }
        if (key === 'statistics') {
          return visibleWidgets.statistics && <StatisticsWidget key={key} T={t} />;
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

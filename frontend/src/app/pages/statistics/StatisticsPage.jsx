import { useState, useMemo } from 'react';
import Page from '@/ui/Page';
import Badge from '@/ui/Badge';
import { useTranslation } from '@/providers/LanguageContext';
import { Clapperboard, Tv, Video, Users } from '@/ui/icons';
import StatisticsWidget from './StatisticsWidget';
import { LibraryDNA, TimeTravelTimeline } from './LibraryInsightsWidget';
import { RatingsSummary, RatingDistribution } from './components/RatingsAnalytics';
import { useRatingsPageState } from '../ratings/useRatingsPageState';
import { useStatsQuery } from '../../queries';
import { useLibraryModeStore } from '../../stores/useLibraryModeStore';
import styles from './StatisticsPage.module.css';

export default function StatisticsPage() {
  const { t } = useTranslation();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: stats = {} } = useStatsQuery(sessionMode === 'nsfw');
  const ratingsState = useRatingsPageState();
  const [distTab, setDistTab] = useState('movies');

  const isAdultMode = ratingsState.activeSessionMode === 'nsfw';
  const effectiveDistTab = !isAdultMode && distTab === 'scenes' ? 'movies' : distTab;

  const distTabs = [
    { value: 'movies', label: t('ratings.subtabs.movies', { defaultValue: 'Movies' }), icon: Clapperboard },
    { value: 'tv', label: t('ratings.subtabs.tvShows', { defaultValue: 'TV Shows' }), icon: Tv },
    ...(ratingsState.hasAdultSupport ? [{ value: 'scenes', label: t('ratings.subtabs.scenes', { defaultValue: 'Scenes' }), icon: Video }] : []),
    { value: 'videos', label: t('library.tabs.videos') || 'Videos', icon: Video },
    { value: 'people', label: t('ratings.subtabs.people', { defaultValue: 'People' }), icon: Users },
  ];

  const insightTitleCount = useMemo(
    () => Object.values(stats?.decade_distribution || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [stats?.decade_distribution]
  );

  const pageTitle = (
    <span className={styles['stats-title-inline']}>
      {t('sidebar.statistics') || 'Statistics'}
      {isAdultMode && (
        <sup className={styles['stats-title-sup']}>
          <Badge family="adult" tone="danger" className={styles['stats-title-adult-badge']}>
            {t('common.adult_badge', { defaultValue: '18+' })}
          </Badge>
        </sup>
      )}
    </span>
  );

  return (
    <Page
      title={pageTitle}
      description={t('statistics.description') || 'Visual overview and breakdown of your media library'}
      className={styles['statistics-page-container']}
    >
      <div className={styles['statistics-page-content']}>
        {/* Section 1: Overview */}
        <section className={styles['stats-section']}>
          <h2 className={styles['stats-section-title']}>{t('statistics.sections.overview') || 'Overview'}</h2>
          <StatisticsWidget T={t} />
        </section>

        {/* Section 2: Ratings & Reviews */}
        <section className={styles['stats-section']}>
          <h2 className={styles['stats-section-title']}>{t('statistics.sections.ratings') || 'Ratings & Reviews'}</h2>
          <div className={styles['statistics-bento-grid']}>
            {/* Box 1: Ratings Averages and Counts */}
            <div className={styles['bento-box']}>
              <RatingsSummary state={ratingsState} t={t} />
            </div>

            {/* Box 2: Rating Distribution Chart */}
            <div className={styles['bento-box']}>
              <RatingDistribution
                state={ratingsState}
                t={t}
                distTabs={distTabs}
                effectiveDistTab={effectiveDistTab}
                setDistTab={setDistTab}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Library DNA & Timeline */}
        <section className={styles['stats-section']}>
          <h2 className={styles['stats-section-title']}>{t('statistics.sections.insights') || 'Library DNA & Timeline'}</h2>
          <div className={styles['statistics-bento-grid']}>
            {/* Box 3: Library DNA Radar */}
            <div className={styles['bento-box']}>
              <LibraryDNA
                constellation={stats?.genre_constellation}
                genres={stats?.genre_distribution}
                insightTitleCount={insightTitleCount}
                T={t}
              />
            </div>

            {/* Box 4: Time Travel Timeline */}
            <div className={styles['bento-box']}>
              <TimeTravelTimeline
                decades={stats?.decade_distribution}
                insightTitleCount={insightTitleCount}
                T={t}
              />
            </div>
          </div>
        </section>
      </div>
    </Page>
  );
}

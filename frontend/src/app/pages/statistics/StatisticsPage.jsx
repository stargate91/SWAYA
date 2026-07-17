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
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Grid from '@/ui/Grid';
import SectionHeader from '@/ui/SectionHeader';

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
    <Inline gap="md" align="center">
      {t('sidebar.statistics') || 'Statistics'}
      {isAdultMode && (
        <sup style={{ fontSize: '0.45em', top: '-0.7em', position: 'relative' }}>
          <Badge
            family="adult"
            tone="danger"
            size="sm"
            className="u-stats-title-badge"
          >
            {t('common.adult_badge', { defaultValue: '18+' })}
          </Badge>
        </sup>
      )}
    </Inline>
  );

  return (
    <Page
      title={pageTitle}
      description={t('statistics.description') || 'Visual overview and breakdown of your media library'}
      className="u-fade-in"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xl)', marginTop: 'var(--space-lg)', padding: '0 var(--space-sm)' }}>
        {/* Section 1: Overview */}
        <Stack gap="lg">
          <SectionHeader title={t('statistics.sections.overview') || 'Overview'} />
          <StatisticsWidget T={t} />
        </Stack>

        {/* Section 2: Ratings & Reviews */}
        <Stack gap="lg">
          <SectionHeader title={t('statistics.sections.ratings') || 'Ratings & Reviews'} />
          <Grid variant="bento">
            {/* Box 1: Ratings Averages and Counts */}
            <RatingsSummary state={ratingsState} t={t} />

            {/* Box 2: Rating Distribution Chart */}
            <RatingDistribution
              state={ratingsState}
              t={t}
              distTabs={distTabs}
              effectiveDistTab={effectiveDistTab}
              setDistTab={setDistTab}
            />
          </Grid>
        </Stack>

        {/* Section 3: Library DNA & Timeline */}
        <Stack gap="lg">
          <SectionHeader title={t('statistics.sections.insights') || 'Library DNA & Timeline'} />
          <Grid variant="bento">
            {/* Box 3: Library DNA Radar */}
            <LibraryDNA
              constellation={stats?.genre_constellation}
              genres={stats?.genre_distribution}
              insightTitleCount={insightTitleCount}
              T={t}
            />

            {/* Box 4: Time Travel Timeline */}
            <TimeTravelTimeline
              decades={stats?.decade_distribution}
              insightTitleCount={insightTitleCount}
              T={t}
            />
          </Grid>
        </Stack>
      </div>
    </Page>
  );
}

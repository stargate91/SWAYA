import Page from '@/ui/Page';
import Badge from '@/ui/Badge';
import StatisticsWidget from './StatisticsWidget';
import { LibraryDNA, TimeTravelTimeline } from './LibraryInsightsWidget';
import { RatingsSummary, RatingDistribution } from './components/RatingsAnalytics';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Grid from '@/ui/Grid';
import SectionHeader from '@/ui/SectionHeader';
import { useStatisticsPageState } from './useStatisticsPageState';
import styles from './StatisticsPage.module.css';

export default function StatisticsPage() {
  const {
    t,
    isAdultMode,
  } = useStatisticsPageState();

  const pageTitle = (
    <Inline gap="md" align="center">
      {t('sidebar.statistics') || 'Statistics'}
      {isAdultMode && (
        <sup className={styles['adult-sup']}>
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
      <div className={styles['content-wrapper']}>
        {/* Section 1: Overview */}
        <Stack gap="lg">
          <SectionHeader title={t('statistics.sections.overview') || 'Overview'} />
          <StatisticsWidget />
        </Stack>

        {/* Section 2: Ratings & Reviews */}
        <Stack gap="lg">
          <SectionHeader title={t('statistics.sections.ratings') || 'Ratings & Reviews'} />
          <Grid variant="bento">
            {/* Box 1: Ratings Averages and Counts */}
            <RatingsSummary />

            {/* Box 2: Rating Distribution Chart */}
            <RatingDistribution />
          </Grid>
        </Stack>

        {/* Section 3: Library DNA & Timeline */}
        <Stack gap="lg">
          <SectionHeader title={t('statistics.sections.insights') || 'Library DNA & Timeline'} />
          <Grid variant="bento">
            {/* Box 3: Library DNA Radar */}
            <LibraryDNA />

            {/* Box 4: Time Travel Timeline */}
            <TimeTravelTimeline />
          </Grid>
        </Stack>
      </div>
    </Page>
  );
}

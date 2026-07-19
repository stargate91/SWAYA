import { useStatisticsPage } from '../useStatisticsPage';
import SegmentedControl from '@/ui/SegmentedControl';
import Skeleton from '@/ui/Skeleton';
import Stack from '@/ui/Stack';
import Card from '@/ui/Card';
import Text from '@/ui/Text';
import LinearProgress from '@/ui/LinearProgress';
import styles from './RatingDistribution.module.css';

export function RatingDistribution() {
  const {
    ratingsState,
    t,
    distTabs,
    effectiveDistTab,
    setDistTab,
    activeDistStats,
  } = useStatisticsPage();

  if (ratingsState.isStatsLoading) {
    return (
      <Card variant="interactive-glass" className="u-min-h-dist-card-loading">
        <Skeleton variant="dist-title" />
        {Array.from({ length: 10 }).map((_, idx) => (
          <Skeleton key={idx} variant="dist-bar" />
        ))}
      </Card>
    );
  }

  return (
    <Card
      variant="interactive-glass"
      divider
      eyebrow={t('statistics.ratings.distribution', { defaultValue: 'Rating Distribution' })}
      actions={
        <SegmentedControl
          options={distTabs}
          value={effectiveDistTab}
          onChange={setDistTab}
          variant="filter"
        />
      }
    >
      <Stack gap="sm" className="u-mt-sm">
        {activeDistStats?.distributionRows?.map((row, index) => (
          <div key={index} className={styles['distribution-row']}>
            <span className={styles['rating-label-wrapper']}>
              <Text variant="small" color="secondary" weight="bold">
                {row.ratingLabel}
              </Text>
            </span>
            <LinearProgress value={row.percentage} />
            <span className={styles['rating-count-wrapper']}>
              <Text variant="small" color="muted" weight="medium">
                {row.count}
              </Text>
            </span>
          </div>
        ))}
      </Stack>
    </Card>
  );
}

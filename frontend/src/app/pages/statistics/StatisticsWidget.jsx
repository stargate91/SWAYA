import { useStatisticsPageState } from './useStatisticsPageState';
import WidgetShell from '@/ui/WidgetShell';
import Card from '@/ui/Card';
import Text from '@/ui/Text';
import Inline from '@/ui/Inline';
import Grid from '@/ui/Grid';

const StatisticsWidget = () => {
  const { stats, isLoading, t, scenesStats } = useStatisticsPageState();

  return (
    <WidgetShell loading={isLoading} size="sm" transparent={true}>
      <Grid variant="stats">
        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {t('statistics.stats.total_movies') || 'Total Movies'}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {(stats.total_movies || 0).toLocaleString()}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {t('statistics.stats.movies_sub') || 'In Library'}
            </Text>
          </Inline>
        </Card>

        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {scenesStats.title}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {scenesStats.value}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {scenesStats.subText}
            </Text>
          </Inline>
        </Card>

        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {t('statistics.stats.total_tv') || 'TV Shows'}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {(stats.total_tv || 0).toLocaleString()}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {t('statistics.stats.tv_sub', { count: stats.total_episodes || 0 }) || `${stats.total_episodes || 0} Episodes`}
            </Text>
          </Inline>
        </Card>

        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {t('statistics.stats.storage_used') || 'Storage Used'}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {stats.storage || '0.0 GB'}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {t('statistics.stats.storage_sub', { count: stats.drive_count || 0 }) || `across ${stats.drive_count || 0} drives`}
            </Text>
          </Inline>
        </Card>

        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {t('statistics.stats.unmatched') || 'Review Needed'}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {(stats.unmatched || 0).toLocaleString()}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {t('statistics.stats.unmatched_sub') || 'Files in scanner queue'}
            </Text>
          </Inline>
        </Card>
      </Grid>
    </WidgetShell>
  );
};

export default StatisticsWidget;

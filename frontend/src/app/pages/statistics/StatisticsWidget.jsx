import PropTypes from 'prop-types';
import { useStatsQuery } from '../../queries';
import { useLibraryModeStore } from '../../stores/useLibraryModeStore';
import WidgetShell from '@/ui/WidgetShell';
import Card from '@/ui/Card';
import Text from '@/ui/Text';
import Inline from '@/ui/Inline';
import Grid from '@/ui/Grid';

const StatisticsWidget = ({ T }) => {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: stats = {}, isLoading } = useStatsQuery(sessionMode === 'nsfw');

  return (
    <WidgetShell loading={isLoading} size="sm" transparent={true}>
      <Grid variant="stats">
        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {T('statistics.stats.total_movies') || 'Total Movies'}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {(stats.total_movies || 0).toLocaleString()}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {T('statistics.stats.movies_sub') || 'In Library'}
            </Text>
          </Inline>
        </Card>

        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {sessionMode === 'nsfw' 
              ? (T('statistics.stats.total_scenes_videos') || 'Scenes & Videos')
              : (T('statistics.stats.total_scenes') || 'Total Scenes')
            }
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {sessionMode === 'nsfw'
              ? ((stats.total_scenes || 0) + (stats.total_videos || 0)).toLocaleString()
              : (stats.total_scenes || 0).toLocaleString()
            }
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {sessionMode === 'nsfw' && stats.total_videos > 0
                ? `${stats.total_scenes || 0} scenes, ${stats.total_videos} videos`
                : (T('statistics.stats.scenes_sub') || 'Scenes in library')
              }
            </Text>
          </Inline>
        </Card>

        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {T('statistics.stats.total_tv') || 'TV Shows'}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {(stats.total_tv || 0).toLocaleString()}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {T('statistics.stats.tv_sub', { count: stats.total_episodes || 0 }) || `${stats.total_episodes || 0} Episodes`}
            </Text>
          </Inline>
        </Card>

        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {T('statistics.stats.storage_used') || 'Storage Used'}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {stats.storage || '0.0 GB'}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {T('statistics.stats.storage_sub', { count: stats.drive_count || 0 }) || `across ${stats.drive_count || 0} drives`}
            </Text>
          </Inline>
        </Card>

        <Card variant="interactive-glass" padding="xl" glowBlob={true} flex={1}>
          <Text variant="caption" color="secondary" weight="extrabold" uppercase className="u-mb-xl" as="div">
            {T('statistics.stats.unmatched') || 'Review Needed'}
          </Text>
          <Text variant="hero" color="primary" weight="extrabold" className="u-mb-sm" as="div">
            {(stats.unmatched || 0).toLocaleString()}
          </Text>
          <Inline gap="sm" align="center">
            <Text variant="small" color="accent" weight="semibold">
              {T('statistics.stats.unmatched_sub') || 'Files in scanner queue'}
            </Text>
          </Inline>
        </Card>
      </Grid>
    </WidgetShell>
  );
};

StatisticsWidget.propTypes = {
  T: PropTypes.func.isRequired,
};

export default StatisticsWidget;

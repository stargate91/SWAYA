import { ChevronDown, ChevronRight } from '@/ui/icons';
import { formatTime } from '../../../../utils/detailUtils';
import { useMediaDetailContext } from '../../MediaDetailContext';
import SpecCard from '@/ui/SpecCard';
import Grid from '@/ui/Grid';
import Stack from '@/ui/Stack';
import Card from '@/ui/Card';
import Text from '@/ui/Text';
import Pill from '@/ui/Pill';
import Inline from '@/ui/Inline';
import LinearProgress from '@/ui/LinearProgress';

export default function MovieWatchedStats() {
  const { state, actions, t } = useMediaDetailContext();
  const { item, isWatchLogsExpanded } = state;
  const { setIsWatchLogsExpanded } = actions;

  const formatLogDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const movieDuration = item.technical?.duration || (item.runtime ? item.runtime * 60 : 0);
  const progressPercent = movieDuration > 0 && item.resume_position
    ? Math.round((item.resume_position / movieDuration) * 100)
    : 0;

  const movieStatus = item.is_watched
    ? (t('library.details.statusWatched') || 'Watched')
    : (item.resume_position > 0
      ? (t('library.details.statusInProgress') || 'In Progress')
      : (t('library.details.statusUnwatched') || 'Unwatched'));

  const movieProgressText = item.is_watched
    ? (t('library.details.statusWatched') || 'Watched')
    : (item.resume_position > 0
      ? `${formatTime(item.resume_position)} / ${formatTime(movieDuration)}`
      : '0:00');
  const progressPercentText = item.is_watched ? '100%' : `${progressPercent}%`;
  const watchActivityTitle = `${t('library.details.watchActivity') || 'Watch Activity'} (${item.playback_logs?.length || 0})`;

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Text as="h4" variant="caption" uppercase color="muted">
          {t('library.details.watchStats') || 'Watch Stats'}
        </Text>
        <Grid variant="specs" gap="sm">
          <SpecCard label={t('library.details.watchCount') || 'Watch Count'} value={item.watch_count || 0} />
          <SpecCard
            label={t('library.details.watchStatus') || 'Status'}
            value={movieStatus}
            status={item.is_watched ? 'success' : (item.resume_position > 0 ? 'success' : 'danger')}
          />
          <SpecCard label={t('library.details.movieProgress') || 'Progress'} span={2}>
            <Inline justify="between">
              <Text variant="small" weight="bold" color="secondary">{movieProgressText}</Text>
              <Text variant="small" weight="bold" color="secondary">{progressPercentText}</Text>
            </Inline>
            <LinearProgress value={item.is_watched ? 100 : progressPercent} variant="accent" />
          </SpecCard>
          <SpecCard
            span={2}
            label={t('library.details.lastWatched') || 'Last Watched'}
            value={item.last_watched_at ? formatLogDate(item.last_watched_at) : (t('library.details.never') || 'Never')}
          />
        </Grid>
      </Stack>

      {/* Collapsible Watch Activity */}
      <Stack gap="sm">
        <Card
          variant="interactive-glass"
          padding="md"
          onClick={() => setIsWatchLogsExpanded(prev => !prev)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <Inline justify="between" align="center">
            <Text as="h4" variant="caption" uppercase weight="bold" color="secondary">
              {watchActivityTitle}
            </Text>
            {isWatchLogsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Inline>
        </Card>

        {isWatchLogsExpanded && (
          <Card variant="soft" padding="md">
            {item.playback_logs && item.playback_logs.length > 0 ? (
              <Stack gap="none">
                {item.playback_logs.map((log, index) => (
                  <Inline
                    key={log.id || index}
                    gap="md"
                    align="center"
                    style={index > 0 ? { borderTop: '1px solid var(--color-surface-glass)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' } : undefined}
                  >
                    <Pill variant="success">
                      {t('library.details.watched') || 'Watched'}
                    </Pill>
                    <Text variant="small" color="muted">
                      {formatLogDate(log.watched_at)}
                    </Text>
                  </Inline>
                ))}
              </Stack>
            ) : (
              <Text variant="small" color="secondary" italic>
                {t('library.details.noActivity') || 'No recorded watch logs.'}
              </Text>
            )}
          </Card>
        )}
      </Stack>
    </Stack>
  );
}

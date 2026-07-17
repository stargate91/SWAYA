import { ChevronDown, ChevronRight } from '@/ui/icons';
import { formatTime, countEpisodesInNumber, formatEpisodeNumber } from '../../../../utils/detailUtils';
import { useMediaDetailContext } from '../../MediaDetailContext';
import SpecCard from '@/ui/SpecCard';
import Grid from '@/ui/Grid';
import Stack from '@/ui/Stack';
import Card from '@/ui/Card';
import Text from '@/ui/Text';
import Pill from '@/ui/Pill';
import Inline from '@/ui/Inline';
import LinearProgress from '@/ui/LinearProgress';

export default function TvWatchedStats() {
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

  const regularSeasons = (item.seasons || []).filter(s => s.season_number > 0);
  const allEpisodes = regularSeasons.flatMap(s => s.episodes || []);
  const watchStats = item.watch_stats;

  const totalEpisodesCount = allEpisodes.length > 0
    ? allEpisodes.reduce((sum, ep) => sum + countEpisodesInNumber(ep.episode_number), 0)
    : (watchStats ? watchStats.total_episodes_count : 0);

  const watchedEpisodesCount = allEpisodes.length > 0
    ? allEpisodes.reduce((sum, ep) => sum + (ep.is_watched ? countEpisodesInNumber(ep.episode_number) : 0), 0)
    : (watchStats ? watchStats.watched_episodes_count : 0);

  const completionPercentage = totalEpisodesCount > 0
    ? Math.round((watchedEpisodesCount / totalEpisodesCount) * 100)
    : 0;

  const inProgressEpisodes = allEpisodes.length > 0
    ? allEpisodes.filter(e => e.resume_position > 0)
    : (watchStats ? watchStats.in_progress_episodes || [] : []);

  const isInProgress = inProgressEpisodes.length > 0;

  const allPlaybackLogs = watchStats
    ? watchStats.playback_logs
    : (() => {
        const logs = [];
        regularSeasons.forEach(season => {
          (season.episodes || []).forEach(episode => {
            if (episode.playback_logs && episode.playback_logs.length > 0) {
              episode.playback_logs.forEach(log => {
                logs.push({
                  ...log,
                  seasonNumber: season.season_number,
                  episodeNumber: episode.episode_number,
                  episodeTitle: episode.title,
                  episodeId: episode.id
                });
              });
            }
          });
        });
        logs.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));
        return logs;
      })();

  const tvLastWatched = allPlaybackLogs.length > 0 ? allPlaybackLogs[0].watched_at : null;

  const tvStatus = watchedEpisodesCount === totalEpisodesCount && totalEpisodesCount > 0
    ? (t('library.details.statusWatched') || 'Watched')
    : (isInProgress || watchedEpisodesCount > 0
      ? (t('library.details.statusInProgress') || 'In Progress')
      : (t('library.details.statusUnwatched') || 'Unwatched'));

  const episodesCompletedText = `${watchedEpisodesCount} / ${totalEpisodesCount}`;
  const completionRateText = `${completionPercentage}%`;
  const watchActivityTitleText = `${t('library.details.watchActivity') || 'Watch Activity'} (${allPlaybackLogs.length})`;

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Text as="h4" variant="caption" uppercase color="muted">
          {t('library.details.watchStats') || 'Watch Stats'}
        </Text>
        <Grid variant="specs" gap="sm">
          <SpecCard label={t('library.details.episodesCompleted') || 'Completed'} value={episodesCompletedText} />
          <SpecCard label={t('library.details.completionRate') || 'Completion'} value={completionRateText} />
          <SpecCard
            span={2}
            label={t('library.details.watchStatus') || 'Status'}
            value={tvStatus}
            status={watchedEpisodesCount === totalEpisodesCount && totalEpisodesCount > 0 ? 'success' : (isInProgress || watchedEpisodesCount > 0 ? 'success' : 'danger')}
          />
          <SpecCard
            span={2}
            label={t('library.details.lastWatched') || 'Last Watched'}
            value={tvLastWatched ? formatLogDate(tvLastWatched) : (t('library.details.never') || 'Never')}
          />
          {isInProgress && (
            <SpecCard label={t('library.details.inProgressEpisodes') || 'Episodes in Progress'} span={2}>
              <Text variant="small" color="secondary" style={{ whiteSpace: 'normal', lineBreak: 'anywhere' }}>
                {inProgressEpisodes.map((ep, idx) => {
                  const epNumStr = ep.episode_number
                    ? (ep.episode_number.toString().includes('.') ? ep.episode_number : String(ep.episode_number).padStart(2, '0'))
                    : '';
                  const seasonPrefix = ep.season_number !== undefined
                    ? `S${String(ep.season_number).padStart(2, '0')}E${epNumStr}`
                    : `S${epNumStr}`;
                  const epProgressText = `${seasonPrefix} • ${ep.title} (${formatTime(ep.resume_position)})`;
                  return (
                    <div key={ep.id || idx}>
                      {epProgressText}
                    </div>
                  );
                })}
              </Text>
            </SpecCard>
          )}
        </Grid>
      </Stack>

      {/* Season Progress List */}
      <Stack gap="sm">
        <Text as="h4" variant="caption" uppercase color="muted">
          {t('library.details.seasonProgress') || 'Season Progress'}
        </Text>
        <Stack gap="sm">
          {regularSeasons.map(season => {
            const sEp = season.episodes || [];
            const totalEp = sEp.length;
            const watchedEp = sEp.filter(e => e.is_watched).length;
            const seasonProgPercent = totalEp > 0 ? Math.round((watchedEp / totalEp) * 100) : 0;
            const seasonTitleText = season.title || `Season ${season.season_number}`;
            const seasonMetaText = `${watchedEp} / ${totalEp} (${seasonProgPercent}%)`;

            return (
              <Card key={season.season_number} variant="default" padding="md">
                <Stack gap="sm">
                  <Inline justify="between" align="center">
                    <Text variant="body" weight="bold">{seasonTitleText}</Text>
                    <Text variant="small" weight="bold" color="secondary">{seasonMetaText}</Text>
                  </Inline>
                  <LinearProgress value={seasonProgPercent} variant="accent" />
                </Stack>
              </Card>
            );
          })}
        </Stack>
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
              {watchActivityTitleText}
            </Text>
            {isWatchLogsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Inline>
        </Card>

        {isWatchLogsExpanded && (
          <Card variant="soft" padding="md">
            {allPlaybackLogs.length > 0 ? (
              <Stack gap="none">
                {allPlaybackLogs.map((log, index) => {
                  const logCodeText = `S${log.seasonNumber}E${formatEpisodeNumber(log.episodeNumber)}`;
                  return (
                    <Stack
                      key={log.id || index}
                      gap="xs"
                      style={index > 0 ? { borderTop: '1px solid var(--color-surface-glass)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' } : undefined}
                    >
                      <Inline gap="md" align="center">
                        <Pill variant="meta">
                          {logCodeText}
                        </Pill>
                        <Text variant="small" weight="medium" truncate style={{ flex: 1 }} title={log.episodeTitle}>
                          {log.episodeTitle}
                        </Text>
                      </Inline>
                      <Text variant="small" color="muted">
                        {formatLogDate(log.watched_at)}
                      </Text>
                    </Stack>
                  );
                })}
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

import { useState } from 'react';
import { ChevronDown, ChevronRight } from '@/ui/icons';
import { countEpisodesInNumber } from '@/pages/library/utils/detailUtils';
import Card from '@/ui/Card';
import Grid from '@/ui/Grid';
import Inline from '@/ui/Inline';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import WatchStatsCard from '@/ui/data/WatchStatsCard';
import LinearProgress from '@/ui/LinearProgress';

export default function CompactWatchStatsSection({ item, isMovie, isScene, t }) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  if (!item) return null;

  const formatLogDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      let normalizedStr = dateStr;
      if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+') && !/-\d{2}:\d{2}$/.test(dateStr)) {
        normalizedStr = dateStr.replace(' ', 'T');
        if (!normalizedStr.endsWith('Z')) {
          normalizedStr += 'Z';
        }
      }
      return new Date(normalizedStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  let watchStatus;
  let watchCount;
  let progressPercent;
  let progressText;
  let lastWatchedText;

  const logs = isMovie || isScene
    ? (item.playback_logs || [])
    : (() => {
      const regularSeasons = (item.seasons || []).filter(s => s.season_number > 0);
      const watchStats = item.watch_stats;
      if (watchStats?.playback_logs) return watchStats.playback_logs;
      const list = [];
      regularSeasons.forEach(season => {
        (season.episodes || []).forEach(episode => {
          if (episode.playback_logs) {
            episode.playback_logs.forEach(log => {
              list.push({
                ...log,
                seasonNumber: season.season_number,
                episodeNumber: episode.episode_number,
              });
            });
          }
        });
      });
      list.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));
      return list;
    })();

  if (isMovie || isScene) {
    const duration = item.technical?.duration || (item.runtime ? item.runtime * 60 : 0);
    progressPercent = duration > 0 && item.resume_position
      ? Math.round((item.resume_position / duration) * 100)
      : 0;

    watchStatus = item.is_watched
      ? (t('library.details.statusWatched') || 'Watched')
      : (item.resume_position > 0
        ? (t('library.details.statusInProgress') || 'In Progress')
        : (t('library.details.statusUnwatched') || 'Unwatched'));

    progressText = item.is_watched
      ? (t('library.details.statusWatched') || 'Watched')
      : (item.resume_position > 0
        ? `${formatTime(item.resume_position)} / ${formatTime(duration)}`
        : '0:00');

    watchCount = item.watch_count || 0;
    lastWatchedText = item.last_watched_at ? formatLogDate(item.last_watched_at) : (t('library.details.never') || 'Never');
  } else {
    // TV show
    const regularSeasons = (item.seasons || []).filter(s => s.season_number > 0);
    const allEpisodes = regularSeasons.flatMap(s => s.episodes || []);
    const watchStats = item.watch_stats;

    const totalEpisodesCount = allEpisodes.length > 0
      ? allEpisodes.reduce((sum, ep) => sum + countEpisodesInNumber(ep.episode_number), 0)
      : (watchStats ? watchStats.total_episodes_count : 0);

    const watchedEpisodesCount = allEpisodes.length > 0
      ? allEpisodes.reduce((sum, ep) => sum + (ep.is_watched ? countEpisodesInNumber(ep.episode_number) : 0), 0)
      : (watchStats ? watchStats.watched_episodes_count : 0);

    progressPercent = totalEpisodesCount > 0
      ? Math.round((watchedEpisodesCount / totalEpisodesCount) * 100)
      : 0;

    const inProgressEpisodes = allEpisodes.length > 0
      ? allEpisodes.filter(e => e.resume_position > 0)
      : (watchStats ? watchStats.in_progress_episodes || [] : []);

    const isInProgress = inProgressEpisodes.length > 0;

    watchStatus = watchedEpisodesCount === totalEpisodesCount && totalEpisodesCount > 0
      ? (t('library.details.statusWatched') || 'Watched')
      : (isInProgress || watchedEpisodesCount > 0
        ? (t('library.details.statusInProgress') || 'In Progress')
        : (t('library.details.statusUnwatched') || 'Unwatched'));

    progressText = `${watchedEpisodesCount} / ${totalEpisodesCount} ep`;

    let tvLastWatched = null;
    if (watchStats?.playback_logs && watchStats.playback_logs.length > 0) {
      tvLastWatched = watchStats.playback_logs[0].watched_at;
    } else {
      if (logs.length > 0) {
        tvLastWatched = logs[0].watched_at;
      }
    }

    watchCount = logs.length;
    lastWatchedText = tvLastWatched ? formatLogDate(tvLastWatched) : (t('library.details.never') || 'Never');
  }

  const watchCountText = `(${watchCount}x)`;
  const statusClass = watchStatus === (t('library.details.statusWatched') || 'Watched')
    ? 'watched'
    : watchStatus === (t('library.details.statusInProgress') || 'In Progress')
      ? 'in-progress'
      : 'unwatched';

  const progressPercentText = `${progressPercent}%`;
  const watchActivityText = `${t('library.details.watchActivity') || 'Watch History'} (${logs.length})`;

  return (
    <Card
      variant="glass-shaded"
      headerVariant="shaded"
      padding="md"
      title={t('library.details.watchStats') || 'Watch Stats'}
    >
      <Stack gap="md" fullWidth>
        <Grid variant="three-cols">
          <WatchStatsCard
            label={t('library.details.watchStatus') || 'Status'}
            value={
              <span className={`status-${statusClass}`}>
                {watchStatus}
                {((isMovie || isScene) && watchCount > 0) && (
                  <span className="u-ml-xs u-opacity-60">
                    {watchCountText}
                  </span>
                )}
              </span>
            }
          />

          <WatchStatsCard
            label={t('library.details.movieProgress') || 'Progress'}
          >
            <Inline justify="between" fullWidth className="u-mb-2xs">
              <Text variant="small" weight="semibold">{progressText}</Text>
              <Text variant="small" color="muted">{progressPercentText}</Text>
            </Inline>
            <LinearProgress value={progressPercent} variant="accent" />
          </WatchStatsCard>

          <WatchStatsCard
            label={t('library.details.lastWatched') || 'Last Watched'}
            value={lastWatchedText}
          />
        </Grid>

        {logs.length > 0 && (
          <Stack gap="sm" fullWidth>
            <hr className="u-divider" />
            <button
              type="button"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="u-btn-reset u-w-full"
            >
              <Inline justify="between" align="center" fullWidth>
                <Text variant="small" color="secondary">{watchActivityText}</Text>
                {isHistoryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </Inline>
            </button>

            {isHistoryExpanded && (
              <Stack
                gap="xs"
                scrollable={logs.length > 3}
                className={logs.length > 3 ? 'u-max-h-7rem u-pr-xs custom-scrollbar' : ''}
              >
                {logs.map((log, idx) => {
                  const dateStr = formatLogDate(log.watched_at);
                  const epText = log.seasonNumber != null && log.episodeNumber != null
                    ? `S${log.seasonNumber.toString().padStart(2, '0')}E${log.episodeNumber.toString().padStart(2, '0')}`
                    : '';
                  return (
                    <Inline key={log.id || idx} justify="between" align="center" fullWidth className="u-panel-item">
                      <Text weight="bold">{epText || (t('library.details.playSession') || 'Session')}</Text>
                      <span className="u-opacity-60">{dateStr}</span>
                    </Inline>
                  );
                })}
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

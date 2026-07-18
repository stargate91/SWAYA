import { useState } from 'react';
import { ChevronDown, ChevronRight } from '@/ui/icons';
import { countEpisodesInNumber } from '@/pages/library/utils/detailUtils';
import Card from '@/ui/Card';
import './CompactWatchStatsSection.css';

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

  const statusClass = watchStatus === 'Watched' ? 'watched' : (watchStatus === 'In Progress' ? 'progress' : 'unwatched');
  const watchCountText = watchCount > 0 ? `(${watchCount}x)` : '';
  const progressPercentText = `${progressPercent}%`;
  const watchActivityText = `${t('library.details.watchActivity') || 'Watch History'} (${logs.length})`;

  return (
    <div className="bespoke-boxoffice-section compact-watch-stats-section">
      <Card
        variant="glass-shaded"
        headerVariant="shaded"
        padding="md"
        title={t('library.details.watchStats') || 'Watch Stats'}
      >
        <div className="bespoke-boxoffice-body">
          <div className="bespoke-boxoffice-stat">
            <div className="bespoke-boxoffice-info">
              <span className="bespoke-boxoffice-label">
                {t('library.details.watchStatus') || 'Status'}
              </span>
              <span className={`status-${statusClass} bespoke-boxoffice-value`}>
                {watchStatus}
                {((isMovie || isScene) && watchCount > 0) && (
                  <span className="compact-watch-stats__count">
                    {watchCountText}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="bespoke-boxoffice-stat">
            <div className="bespoke-boxoffice-info compact-watch-stats__info-full">
              <span className="bespoke-boxoffice-label">
                {t('library.details.movieProgress') || 'Progress'}
              </span>
              <div className="compact-watch-stats__progress-labels">
                <span>{progressText}</span>
                <span>{progressPercentText}</span>
              </div>
              <progress
                className="compact-watch-stats__progress-bar"
                value={progressPercent}
                max={100}
              />
            </div>
          </div>

          <div className="bespoke-boxoffice-stat">
            <div className="bespoke-boxoffice-info">
              <span className="bespoke-boxoffice-label">
                {t('library.details.lastWatched') || 'Last Watched'}
              </span>
              <span className="bespoke-boxoffice-value compact-watch-stats__last-watched">{lastWatchedText}</span>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="bespoke-boxoffice-stat compact-watch-stats__history-wrapper">
              <button
                type="button"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="compact-watch-stats__toggle-btn"
              >
                <span>{watchActivityText}</span>
                {isHistoryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isHistoryExpanded && (
                <div
                  className={`compact-watch-stats__history-list ${logs.length > 3 ? 'compact-watch-stats__history-list--scrollable custom-scrollbar' : ''}`}
                >
                  {logs.map((log, idx) => {
                    const dateStr = formatLogDate(log.watched_at);
                    const epText = log.seasonNumber != null && log.episodeNumber != null
                      ? `S${log.seasonNumber.toString().padStart(2, '0')}E${log.episodeNumber.toString().padStart(2, '0')}`
                      : '';
                    return (
                      <div key={log.id || idx} className="compact-watch-stats__history-item">
                        <span className="compact-watch-stats__history-label">{epText || (t('library.details.playSession') || 'Session')}</span>
                        <span className="compact-watch-stats__history-date">{dateStr}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        </Card>
      </div>
    );
  }

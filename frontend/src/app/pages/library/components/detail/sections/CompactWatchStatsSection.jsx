/* eslint-disable react/forbid-dom-props, react/jsx-no-literals, i18next/no-literal-string */
import { useState } from 'react';
import { ChevronDown, ChevronRight } from '@/ui/icons';

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

    const totalEpisodesCount = watchStats
      ? watchStats.total_episodes_count
      : allEpisodes.length;

    const watchedEpisodesCount = watchStats
      ? watchStats.watched_episodes_count
      : allEpisodes.filter(ep => ep.is_watched).length;

    progressPercent = totalEpisodesCount > 0
      ? Math.round((watchedEpisodesCount / totalEpisodesCount) * 100)
      : 0;

    const inProgressEpisodes = watchStats
      ? watchStats.in_progress_episodes
      : allEpisodes.filter(e => e.resume_position > 0);

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

  return (
    <div className="bespoke-boxoffice-section compact-watch-stats-section">
      <div className="bespoke-boxoffice-card">
        <div className="bespoke-browser-card__pills-header">
          <span className="bespoke-cast-title">
            {t('library.details.watchStats') || 'Watch Stats'}
          </span>
        </div>
        <div className="bespoke-boxoffice-body">
          <div className="bespoke-boxoffice-stat">
            <div className="bespoke-boxoffice-info">
              <span className="bespoke-boxoffice-label">
                {t('library.details.watchStatus') || 'Status'}
              </span>
              <span className={`specs-card__value status-${statusClass} bespoke-boxoffice-value`}>
                {watchStatus}
                {((isMovie || isScene) && watchCount > 0) && (
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '6px', fontWeight: 'normal' }}>
                    ({watchCount}x)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="bespoke-boxoffice-stat">
            <div className="bespoke-boxoffice-info" style={{ width: '100%' }}>
              <span className="bespoke-boxoffice-label">
                {t('library.details.movieProgress') || 'Progress'}
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                <span>{progressText}</span>
                <span>{progressPercent}%</span>
              </div>
              <progress
                className="specs-card__progress"
                value={progressPercent}
                max={100}
                style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          <div className="bespoke-boxoffice-stat">
            <div className="bespoke-boxoffice-info">
              <span className="bespoke-boxoffice-label">
                {t('library.details.lastWatched') || 'Last Watched'}
              </span>
              <span className="bespoke-boxoffice-value" style={{ fontSize: '0.8rem', whiteSpace: 'normal' }}>{lastWatchedText}</span>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="bespoke-boxoffice-stat" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', marginTop: '10px', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
              <button
                type="button"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <span>{t('library.details.watchActivity') || 'Watch History'} ({logs.length})</span>
                {isHistoryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isHistoryExpanded && (
                <div
                  style={{
                     marginTop: '8px',
                     maxHeight: logs.length > 3 ? '115px' : 'none',
                     overflowY: logs.length > 3 ? 'auto' : 'visible',
                     display: 'flex',
                     flexDirection: 'column',
                     gap: '6px',
                     width: '100%',
                     paddingRight: logs.length > 3 ? '4px' : '0'
                  }}
                  className={logs.length > 3 ? 'custom-scrollbar' : ''}
                >
                  {logs.map((log, idx) => {
                    const dateStr = formatLogDate(log.watched_at);
                    const epText = log.seasonNumber != null && log.episodeNumber != null
                      ? `S${log.seasonNumber.toString().padStart(2, '0')}E${log.episodeNumber.toString().padStart(2, '0')}`
                      : '';
                    return (
                      <div key={log.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', width: '100%' }}>
                        <span style={{ fontWeight: 'bold' }}>{epText || (t('library.details.playSession') || 'Session')}</span>
                        <span style={{ opacity: 0.6 }}>{dateStr}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

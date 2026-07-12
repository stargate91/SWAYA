import PropTypes from 'prop-types';
import { useStatsQuery } from '../../queries';
import { useLibraryModeStore } from '../../stores/useLibraryModeStore';
import WidgetShell from '@/ui/WidgetShell';
import './StatisticsWidget.css';

const StatisticsWidget = ({ T }) => {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: stats = {}, isLoading } = useStatsQuery(sessionMode === 'nsfw');

  return (
    <WidgetShell loading={isLoading} size="sm" transparent={true}>
      <div className="stats-grid stats-grid--5">
        <div className="stat-card">
          <div className="stat-label">{T('statistics.stats.total_movies') || 'Total Movies'}</div>
          <div className="stat-value">{(stats.total_movies || 0).toLocaleString()}</div>
          <div className="stat-sub">{T('statistics.stats.movies_sub') || 'In Library'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            {sessionMode === 'nsfw' 
              ? (T('statistics.stats.total_scenes_videos') || 'Scenes & Videos')
              : (T('statistics.stats.total_scenes') || 'Total Scenes')
            }
          </div>
          <div className="stat-value">
            {sessionMode === 'nsfw'
              ? ((stats.total_scenes || 0) + (stats.total_videos || 0)).toLocaleString()
              : (stats.total_scenes || 0).toLocaleString()
            }
          </div>
          <div className="stat-sub">
            {sessionMode === 'nsfw' && stats.total_videos > 0
              ? `${stats.total_scenes || 0} scenes, ${stats.total_videos} videos`
              : (T('statistics.stats.scenes_sub') || 'Scenes in library')
            }
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T('statistics.stats.total_tv') || 'TV Shows'}</div>
          <div className="stat-value">{(stats.total_tv || 0).toLocaleString()}</div>
          <div className="stat-sub">
            {T('statistics.stats.tv_sub', { count: stats.total_episodes || 0 }) || `${stats.total_episodes || 0} Episodes`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T('statistics.stats.storage_used') || 'Storage Used'}</div>
          <div className="stat-value">
            {stats.storage || '0.0 GB'}
          </div>
          <div className="stat-sub">
            {T('statistics.stats.storage_sub', { count: stats.drive_count || 0 }) || `across ${stats.drive_count || 0} drives`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T('statistics.stats.unmatched') || 'Review Needed'}</div>
          <div className="stat-value">{(stats.unmatched || 0).toLocaleString()}</div>
          <div className="stat-sub">{T('statistics.stats.unmatched_sub') || 'Files in scanner queue'}</div>
        </div>
      </div>
    </WidgetShell>
  );
};

StatisticsWidget.propTypes = {
  T: PropTypes.func.isRequired,
};

export default StatisticsWidget;

import PropTypes from 'prop-types';
import { useStatsQuery, useSettingsQuery } from '../../../queries';
import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';
import DashboardWidgetShell from './DashboardWidgetShell';
import './StatisticsWidget.css';

const StatisticsWidget = ({ T }) => {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: stats = {}, isLoading } = useStatsQuery(sessionMode === 'nsfw');
  const { data: settings = {} } = useSettingsQuery();

  const showScenes = settings?.include_adult;

  return (
    <DashboardWidgetShell loading={isLoading} size="sm" transparent={true}>
      <div className={`stats-grid stats-grid--${showScenes ? '5' : '4'}`}>
        <div className="stat-card">
          <div className="stat-label">{T('dashboard.stats.total_movies') || 'Total Movies'}</div>
          <div className="stat-value">{(stats.total_movies || 0).toLocaleString()}</div>
          <div className="stat-sub">{T('dashboard.stats.movies_sub') || 'In Library'}</div>
        </div>
        {showScenes && (
          <div className="stat-card">
            <div className="stat-label">{T('dashboard.stats.total_scenes') || 'Total Scenes'}</div>
            <div className="stat-value">{(stats.total_scenes || 0).toLocaleString()}</div>
            <div className="stat-sub">{T('dashboard.stats.scenes_sub') || 'In Library'}</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">{T('dashboard.stats.tv_series') || 'TV Shows'}</div>
          <div className="stat-value">{(stats.total_tv || 0).toLocaleString()}</div>
          <div className="stat-sub">
            {(stats.total_episodes || 0).toLocaleString()} {T('dashboard.stats.episodes_sub') || 'Episodes'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T('dashboard.stats.storage_used') || 'Storage Used'}</div>
          <div className="stat-value">{stats.storage || '0 MB'}</div>
          <div className="stat-sub">
            {T('dashboard.stats.storage_sub', { count: stats.drive_count || 0 }) || `${stats.drive_count || 0} drives connected`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T('dashboard.stats.unmatched') || 'Review Needed'}</div>
          <div className="stat-value">{(stats.unmatched || 0).toLocaleString()}</div>
          <div className="stat-sub">{T('dashboard.stats.unmatched_sub') || 'Files in scanner queue'}</div>
        </div>
      </div>
    </DashboardWidgetShell>
  );
};

StatisticsWidget.propTypes = {
  T: PropTypes.func.isRequired,
};

export default StatisticsWidget;

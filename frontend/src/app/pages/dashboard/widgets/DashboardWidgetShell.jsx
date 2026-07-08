import PropTypes from 'prop-types';
import Spinner from '@/ui/Spinner';

const DashboardWidgetShell = ({ children, loading, size, transparent }) => {
  return (
    <div className={`dashboard-widget dashboard-widget--${size || 'md'} ${transparent ? 'dashboard-widget--transparent' : ''}`}>
      {loading ? (
        <div className="dashboard-widget__loading">
          <Spinner />
        </div>
      ) : (
        <div className="dashboard-widget__content">{children}</div>
      )}
    </div>
  );
};

DashboardWidgetShell.propTypes = {
  children: PropTypes.node,
  loading: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  transparent: PropTypes.bool,
};

export default DashboardWidgetShell;

import PropTypes from 'prop-types';
import Skeleton from '@/ui/Skeleton';
import './WidgetShell.css';

const WidgetShell = ({ children, loading, size, transparent }) => {
  return (
    <div className={`widget-shell widget-shell--${size || 'md'} ${transparent ? 'widget-shell--transparent' : ''}`}>
      {loading ? (
        <div className="widget-shell__loading-skeleton">
          <div className="widget-shell__loading-title">
            <Skeleton.Title className="widget-shell__loading-title-skeleton" />
          </div>
          {size === 'sm' ? (
            <div className="widget-shell__loading-column">
              <Skeleton className="widget-shell__loading-skeleton-row-item-1" variant="rect" />
              <Skeleton className="widget-shell__loading-skeleton-row-item-2" variant="rect" />
            </div>
          ) : (
            <Skeleton.Row>
              {Array.from({ length: size === 'lg' ? 4 : 3 }).map((_, idx) => (
                <Skeleton.Card key={idx} className="widget-shell__loading-card" />
              ))}
            </Skeleton.Row>
          )}
        </div>
      ) : (
        <div className="widget-shell__content">{children}</div>
      )}
    </div>
  );
};

WidgetShell.propTypes = {
  children: PropTypes.node,
  loading: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  transparent: PropTypes.bool,
};

export default WidgetShell;

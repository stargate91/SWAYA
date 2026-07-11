/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import PropTypes from 'prop-types';
import Skeleton from '@/ui/Skeleton';
import './WidgetShell.css';

const WidgetShell = ({ children, loading, size, transparent }) => {
  return (
    <div className={`widget-shell widget-shell--${size || 'md'} ${transparent ? 'widget-shell--transparent' : ''}`}>
      {loading ? (
        <div className="widget-shell__loading-skeleton" style={{ padding: 'var(--space-xl) 0', width: '100%' }}>
          <div style={{ width: '150px', marginBottom: 'var(--space-xl)' }}>
            <Skeleton.Title style={{ marginBottom: 0 }} />
          </div>
          {size === 'sm' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Skeleton style={{ height: '32px' }} variant="rect" />
              <Skeleton style={{ height: '32px', width: '80%' }} variant="rect" />
            </div>
          ) : (
            <Skeleton.Row>
              {Array.from({ length: size === 'lg' ? 4 : 3 }).map((_, idx) => (
                <Skeleton.Card key={idx} style={{ flex: 1, minWidth: '100px', height: '180px' }} />
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

import PropTypes from 'prop-types';
import Skeleton from '@/ui/Skeleton';
import styles from './WidgetShell.module.css';

const WidgetShell = ({ children, loading, size, transparent }) => {
  const shellClass = `${styles.shell} ${styles[`shell--${size || 'md'}`] || ''} ${transparent ? styles['shell--transparent'] : ''}`.trim();

  return (
    <div className={shellClass}>
      {loading ? (
        <div className={styles['loading-skeleton']}>
          <div className={styles['loading-title']}>
            <Skeleton.Title className={styles['loading-title-skeleton']} />
          </div>
          {size === 'sm' ? (
            <div className={styles['loading-column']}>
              <Skeleton className={styles['loading-skeleton-row-item-1']} variant="rect" />
              <Skeleton className={styles['loading-skeleton-row-item-2']} variant="rect" />
            </div>
          ) : (
            <Skeleton.Row>
              {Array.from({ length: size === 'lg' ? 4 : 3 }).map((_, idx) => (
                <Skeleton.Card key={idx} className={styles['loading-card']} />
              ))}
            </Skeleton.Row>
          )}
        </div>
      ) : (
        <div className={styles.content}>{children}</div>
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

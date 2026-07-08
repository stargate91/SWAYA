import PropTypes from 'prop-types';
import './Skeleton.css';

function Skeleton({ className = '', variant = 'rect', shimmer = true }) {
  const classes = [
    'ui-skeleton',
    `ui-skeleton--${variant}`,
    shimmer ? 'ui-skeleton--shimmer' : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} />;
}

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['rect', 'circle', 'text']),
  shimmer: PropTypes.bool,
};

Skeleton.Row = function SkeletonRow({ children, className = '' }) {
  return <div className={`ui-skeleton-row ${className}`.trim()}>{children}</div>;
};
Skeleton.Row.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

Skeleton.Card = function SkeletonCard({ className = '' }) {
  return <div className={`ui-skeleton-card ui-skeleton--shimmer ${className}`.trim()} />;
};
Skeleton.Card.propTypes = {
  className: PropTypes.string,
};

Skeleton.Banner = function SkeletonBanner({ className = '' }) {
  return <div className={`ui-skeleton-banner ui-skeleton--shimmer ${className}`.trim()} />;
};
Skeleton.Banner.propTypes = {
  className: PropTypes.string,
};

Skeleton.Title = function SkeletonTitle({ className = '' }) {
  return <div className={`ui-skeleton-title ui-skeleton--shimmer ${className}`.trim()} />;
};
Skeleton.Title.propTypes = {
  className: PropTypes.string,
};

export default Skeleton;

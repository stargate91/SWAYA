import PropTypes from 'prop-types';
import './Skeleton.css';

function Skeleton({ className = '', variant = 'rect', shimmer = true, ...props }) {
  const classes = [
    'ui-skeleton',
    `ui-skeleton--${variant}`,
    shimmer ? 'ui-skeleton--shimmer' : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} {...props} />;
}

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['rect', 'circle', 'text']),
  shimmer: PropTypes.bool,
};

Skeleton.Row = function SkeletonRow({ children, className = '', ...props }) {
  return <div className={`ui-skeleton-row ${className}`.trim()} {...props}>{children}</div>;
};
Skeleton.Row.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

Skeleton.Card = function SkeletonCard({ className = '', ...props }) {
  return <div className={`ui-skeleton-card ui-skeleton--shimmer ${className}`.trim()} {...props} />;
};
Skeleton.Card.propTypes = {
  className: PropTypes.string,
};

Skeleton.Banner = function SkeletonBanner({ className = '', ...props }) {
  return <div className={`ui-skeleton-banner ui-skeleton--shimmer ${className}`.trim()} {...props} />;
};
Skeleton.Banner.propTypes = {
  className: PropTypes.string,
};

Skeleton.Title = function SkeletonTitle({ className = '', ...props }) {
  return <div className={`ui-skeleton-title ui-skeleton--shimmer ${className}`.trim()} {...props} />;
};
Skeleton.Title.propTypes = {
  className: PropTypes.string,
};

export default Skeleton;

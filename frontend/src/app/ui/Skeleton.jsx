import PropTypes from 'prop-types';
import styles from './Skeleton.module.css';

export default function Skeleton({ className = '', variant = 'rect', shimmer = true, ...props }) {
  const classes = [
    styles.skeleton,
    variant !== 'rect' ? styles[variant] : '',
    shimmer ? styles.shimmer : '',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes} {...props} />;
}

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['rect', 'circle', 'text', 'title-sm', 'dist-title', 'dist-bar']),
  shimmer: PropTypes.bool,
};


Skeleton.Row = function SkeletonRow({ children, className = '', ...props }) {
  return <div className={`${styles.row} ${className}`.trim()} {...props}>{children}</div>;
};
Skeleton.Row.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

Skeleton.Card = function SkeletonCard({ aspect, className = '', ...props }) {
  const classes = [
    styles.card,
    styles.shimmer,
    aspect && styles[`card--aspect-${aspect}`],
    className
  ].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
};
Skeleton.Card.propTypes = {
  aspect: PropTypes.oneOf(['scene', 'poster']),
  className: PropTypes.string,
};

Skeleton.Banner = function SkeletonBanner({ className = '', ...props }) {
  return <div className={`${styles.banner} ${styles.shimmer} ${className}`.trim()} {...props} />;
};
Skeleton.Banner.propTypes = {
  className: PropTypes.string,
};

Skeleton.Title = function SkeletonTitle({ className = '', ...props }) {
  return <div className={`${styles.title} ${styles.shimmer} ${className}`.trim()} {...props} />;
};
Skeleton.Title.propTypes = {
  className: PropTypes.string,
};

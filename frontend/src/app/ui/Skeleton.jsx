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
  variant: PropTypes.oneOf(['rect', 'circle', 'text']),
  shimmer: PropTypes.bool,
};

Skeleton.Row = function SkeletonRow({ children, className = '', ...props }) {
  return <div className={`${styles.row} ${className}`.trim()} {...props}>{children}</div>;
};
Skeleton.Row.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

Skeleton.Card = function SkeletonCard({ className = '', ...props }) {
  return <div className={`${styles.card} ${styles.shimmer} ${className}`.trim()} {...props} />;
};
Skeleton.Card.propTypes = {
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

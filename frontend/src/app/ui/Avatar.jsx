import PropTypes from 'prop-types';
import styles from './Avatar.module.css';
import { UserRound } from './icons';

export default function Avatar({ src, alt = 'Avatar', className = '', fallbackIcon = null, ...props }) {
  const classes = [
    styles.root,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        fallbackIcon || <UserRound size={30} />
      )}
    </div>
  );
}

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.string,
  fallbackIcon: PropTypes.node,
};

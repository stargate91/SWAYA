import PropTypes from 'prop-types';
import styles from './Alert.module.css';

export default function Alert({ variant = 'danger', className = '', children, ...props }) {
  const classes = [
    styles.root,
    styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

Alert.propTypes = {
  variant: PropTypes.oneOf(['danger', 'warning']),
  className: PropTypes.string,
  children: PropTypes.node,
};

import PropTypes from 'prop-types';
import styles from './Label.module.css';

export default function Label({ className = '', children, ...props }) {
  const classes = [
    styles.root,
    className
  ].filter(Boolean).join(' ');

  return (
    <label className={classes} {...props}>
      {children}
    </label>
  );
}

Label.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

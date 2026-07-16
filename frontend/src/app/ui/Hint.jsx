import PropTypes from 'prop-types';
import styles from './Hint.module.css';

export default function Hint({ className = '', children, ...props }) {
  const classes = [
    styles.root,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

Hint.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

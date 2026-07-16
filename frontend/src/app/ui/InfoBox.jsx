import PropTypes from 'prop-types';
import styles from './InfoBox.module.css';

export default function InfoBox({ className = '', children, ...props }) {
  const classes = [
    styles.root,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

InfoBox.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

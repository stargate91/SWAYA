import PropTypes from 'prop-types';
import styles from './Divider.module.css';

export default function Divider({ className = '', ...props }) {
  return <hr className={`${styles.root} ${className}`.trim()} {...props} />;
}

Divider.propTypes = {
  className: PropTypes.string
};

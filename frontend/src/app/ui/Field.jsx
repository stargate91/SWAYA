import PropTypes from 'prop-types';
import styles from './Field.module.css';

const REQUIRED_MARK = ' *';

export default function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className = '',
  children,
  ref,
}) {
  return (
    <div className={`${styles.field} ${className}`.trim()} ref={ref}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {required && <span className={styles.required} aria-hidden="true">{REQUIRED_MARK}</span>}
        </label>
      )}
      {hint && (
        <span className={styles.hint}>
          {hint}
        </span>
      )}
      {children}
      {error && (
        <span className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.node,
  hint: PropTypes.node,
  error: PropTypes.node,
  required: PropTypes.bool,
  htmlFor: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
  ref: PropTypes.any,
};

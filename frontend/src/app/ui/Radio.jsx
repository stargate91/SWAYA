import PropTypes from 'prop-types';
import styles from './Radio.module.css';

export default function Radio({ checked, onChange, disabled, className = '', children, ...props }) {
  return (
    <label className={`${styles.wrap} ${disabled ? styles['is-disabled'] : ''} ${className}`.trim()}>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={styles.input}
        {...props}
      />
      <span className={styles.radio} />
      {children ? <span className={styles.label}>{children}</span> : null}
    </label>
  );
}

Radio.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

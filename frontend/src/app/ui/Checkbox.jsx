import styles from './Checkbox.module.css';

/**
 * Custom styled checkbox control element.
 *
 * @param {object} props
 * @param {boolean} props.checked - Checkbox active value state
 * @param {function} props.onChange - Value state change handler
 * @param {boolean} [props.disabled] - Disabled interactive control state
 * @param {string} [props.className] - Additional wrapper class name
 * @param {React.ReactNode} [props.children] - Text label description
 */
export default function Checkbox({
  checked,
  onChange,
  disabled,
  className = '',
  children,
  ...props
}) {
  return (
    <label
      data-disabled={disabled}
      className={`${styles.wrap} ${className}`.trim()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={styles.input}
        {...props}
      />
      <span className={styles.checkbox} />
      {children ? <span className={styles.label}>{children}</span> : null}
    </label>
  );
}

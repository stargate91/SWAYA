import styles from './Switch.module.css';

export default function Switch({
  checked = false,
  onChange,
  disabled = false,
  children,
  className = '',
  id,
}) {
  const handleChange = (e) => {
    if (disabled) return;
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <label
      className={`${styles.container} ${className}`.trim()}
      data-disabled={disabled || undefined}
      htmlFor={id}
    >
      <div className={styles.switch}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className={styles.input}
        />
        <div className={styles.track}>
          <div className={styles.thumb} />
        </div>
      </div>
      {children ? <span className={styles.label}>{children}</span> : null}
    </label>
  );
}

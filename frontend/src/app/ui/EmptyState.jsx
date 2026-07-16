import styles from './EmptyState.module.css';

export default function EmptyState({
  title,
  description,
  icon: Icon = null,
  actions = null,
  className = '',
  variant = 'default',
  style = null,
  hasBorder = true,
  animateIcon = false,
}) {
  const borderClass = hasBorder ? '' : styles['no-border'];
  const animateClass = animateIcon ? styles['animated-icon'] : '';
  const variantClass = styles[variant] || '';
  return (
    <div
      className={`${styles.root} ${variantClass} ${borderClass} ${animateClass} ${className}`.trim()}
      // eslint-disable-next-line react/forbid-dom-props
      style={style}
    >
      {Icon ? (
        <div className={styles.icon} aria-hidden="true">
          <Icon size={22} />
        </div>
      ) : null}
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

import styles from './EmptyState.module.css';

export default function EmptyState({
  title,
  description,
  icon: Icon = null,
  animateIcon = false,
  iconColor = 'accent', // 'accent' | 'muted'
  actions = null,
  className = '',
  layout = 'centered', // 'centered' | 'left'
  size = 'lg', // 'sm' | 'md' | 'lg'
  border = 'solid', // 'solid' | 'dashed' | 'none'
  background = 'solid', // 'solid' | 'translucent' | 'none'
  fillHeight = false,
  style = null,
}) {
  const layoutClass = styles[`layout-${layout}`] || '';
  const sizeClass = styles[`size-${size}`] || '';
  const borderClass = styles[`border-${border}`] || '';
  const backgroundClass = styles[`background-${background}`] || '';
  const iconColorClass = styles[`icon-color-${iconColor}`] || '';
  const fillHeightClass = fillHeight ? styles['fill-height'] : '';
  const animateIconClass = animateIcon ? styles['animated-icon'] : '';

  const rootClassName = `
    ${styles.root}
    ${layoutClass}
    ${sizeClass}
    ${borderClass}
    ${backgroundClass}
    ${fillHeightClass}
    ${animateIconClass}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const iconClassName = `${styles.icon} ${iconColorClass}`.trim();

  return (
    <div
      className={rootClassName}
      // eslint-disable-next-line react/forbid-dom-props
      style={style}
    >
      {Icon ? (
        <div className={iconClassName} aria-hidden="true">
          <Icon size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
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

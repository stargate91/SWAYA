import styles from './Card.module.css';

/**
 * Standard content Card container.
 *
 * @param {object} props
 * @param {string} [props.title] - Card header title text
 * @param {React.ReactNode} [props.eyebrow] - Small text label above the title
 * @param {React.ReactNode} [props.actions] - Toolbar button items in the header
 * @param {'default' | 'danger' | 'flat-glass' | 'interactive-glass' | 'soft' | 'focus-panel' | 'transparent' | 'stat'} [props.variant] - Card color scheme style flavor
 * @param {'default' | 'shaded'} [props.headerVariant] - Card header design flavor
 * @param {boolean} [props.divider] - Whether to show a divider line below the header
 * @param {boolean} [props.glowBlob] - Whether to show a decorative glowing blur blob in background
 * @param {'default' | 'md' | 'xl' | 'none'} [props.padding] - Inner padding variant
 * @param {React.ReactNode} props.children - Inner card content body
 * @param {string} [props.className] - Additional custom class names
 */
export default function Card({
  title,
  eyebrow,
  actions,
  children,
  variant = 'default',
  headerVariant = 'default',
  divider = false,
  glowBlob = false,
  padding = 'default',
  flex,
  fullWidth,
  fullHeight,
  className = '',
  ...props
}) {
  const classes = [
    styles.card,
    flex === 1 && styles['flex-1'],
    fullWidth && styles['full-width'],
    fullHeight && styles['full-height'],
    className
  ].filter(Boolean).join(' ');

  return (
    <section
      data-variant={variant}
      data-padding={padding}
      className={classes}
      {...props}
    >
      {glowBlob ? <div className={styles['glow-blob']} /> : null}
      {(title || eyebrow || actions) ? (
        <header
          className={styles.header}
          data-header-variant={headerVariant}
          data-divider={divider || undefined}
        >
          <div>
            {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
            {title ? <h2 className={styles.title}>{title}</h2> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={styles.body}>{children}</div>
    </section>
  );
}




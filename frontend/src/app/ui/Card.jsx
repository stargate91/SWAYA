import styles from './Card.module.css';

/**
 * Standard content Card container.
 *
 * @param {object} props
 * @param {string} [props.title] - Card header title text
 * @param {React.ReactNode} [props.eyebrow] - Small text label above the title
 * @param {React.ReactNode} [props.actions] - Toolbar button items in the header
 * @param {'default' | 'danger'} [props.variant] - Card color scheme style flavor
 * @param {React.ReactNode} props.children - Inner card content body
 * @param {string} [props.className] - Additional custom class names
 */
export default function Card({
  title,
  eyebrow,
  actions,
  children,
  variant = 'default',
  className = '',
  ...props
}) {
  return (
    <section
      data-variant={variant}
      className={`${styles.card} ${className}`.trim()}
      {...props}
    >
      {(title || eyebrow || actions) ? (
        <header className={styles.header}>
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

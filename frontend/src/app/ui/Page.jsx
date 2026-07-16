import PageHeader from './PageHeader';
import styles from './Page.module.css';

export default function Page({
  eyebrow,
  title,
  description,
  actions,
  centered = false,
  viewport = false,
  contentBottom = false,
  className = '',
  children,
}) {
  const classes = [
    styles.root,
    centered && styles.centered,
    contentBottom && styles['content-bottom'],
    viewport && styles.viewport,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} data-viewport={viewport || undefined}>
      {(title || description || eyebrow || actions) ? (
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={actions}
        />
      ) : null}
      {children}
    </div>
  );
}

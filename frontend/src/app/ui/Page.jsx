import PageHeader from './PageHeader';
import styles from './Page.module.css';

export default function Page({
  variant = 'scroll',
  title,
  description,
  eyebrow,
  actions,
  className = '',
  backdrop,
  children,
  ...rest
}) {
  return (
    <div
      className={`${styles.root} ${className}`.trim()}
      data-variant={variant}
      {...rest}
    >
      {backdrop && <div className={styles.backdrop}>{backdrop}</div>}
      <div className={`${styles['bar-top']} ui-page-bar-top`}>
        <div className={styles['bar-top__left']} id="page-bar-top-left" />
        <div className={styles['bar-top__center']} id="page-bar-top-center" />
        <div className={styles['bar-top__right']} id="page-bar-top-right" />
      </div>

      <div className={styles.content}>
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

      <div className={`${styles['bar-bottom']} ui-page-bar-bottom`}>
        <div className={styles['bar-bottom__left']} id="page-bar-bottom-left" />
        <div className={styles['bar-bottom__center']} id="page-bar-bottom-center" />
        <div className={styles['bar-bottom__right']} id="page-bar-bottom-right" />
      </div>
    </div>
  );
}

import PropTypes from 'prop-types';
import styles from './PageHeader.module.css';

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className={styles.root}>
      <div className={styles['title-wrapper']}>
        {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

PageHeader.propTypes = {
  eyebrow: PropTypes.node,
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  actions: PropTypes.node,
};

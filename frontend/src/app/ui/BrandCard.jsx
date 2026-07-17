import PropTypes from 'prop-types';
import styles from './BrandCard.module.css';
import Inline from './Inline';
import Tooltip from './Tooltip';

export default function BrandCard({ name, logoUrl, className = '', ...props }) {
  return (
    <Inline
      gap="md"
      align="center"
      justify="center"
      className={`${styles.card} ${className}`.trim()}
      {...props}
    >
      <Tooltip content={name} side="top" triggerClassName={styles['tooltip-trigger']}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className={styles.logo}
          />
        ) : (
          <span className={styles.text}>
            {name}
          </span>
        )}
      </Tooltip>
    </Inline>
  );
}

BrandCard.propTypes = {
  name: PropTypes.string.isRequired,
  logoUrl: PropTypes.string,
  className: PropTypes.string
};

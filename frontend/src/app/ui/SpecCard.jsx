import PropTypes from 'prop-types';
import styles from './SpecCard.module.css';
import Tooltip from './Tooltip';

export default function SpecCard({ label, value, tall = false, span, status, className = '', ...props }) {
  if (value === undefined || value === null || value === '') return null;

  const classes = [
    styles.card,
    tall && styles['card--tall'],
    span && styles[`card--span-${span}`],
    className
  ].filter(Boolean).join(' ');

  const valueClasses = [
    styles.value,
    status && styles[`value--${status}`]
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      <Tooltip content={String(value)} side="top" triggerClassName={styles['tooltip-trigger']}>
        <span className={styles.label}>{label}</span>
        <span className={valueClasses}>{value}</span>
      </Tooltip>
    </div>
  );
}

SpecCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  tall: PropTypes.bool,
  span: PropTypes.oneOf([1, 2, 3, 4]),
  status: PropTypes.oneOf(['success', 'danger']),
  className: PropTypes.string
};

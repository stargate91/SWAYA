import PropTypes from 'prop-types';
import styles from './Tabs.module.css';

export function Tabs({ tabs, value, onChange, variant, className = '', tabClassName = '' }) {
  const isSub = variant === 'sub';
  const isGlassPill = variant === 'glass-pill';

  let containerClass = styles['tabs'];
  if (isSub) {
    containerClass = styles['tabs--sub'];
  } else if (isGlassPill) {
    containerClass = styles['tabs--glass-pill'];
  }
  containerClass = `${containerClass} ${className}`.trim();

  let tabClassBase = styles['tab'];
  if (isSub) {
    tabClassBase = styles['tab--sub'];
  } else if (isGlassPill) {
    tabClassBase = styles['tab--glass-pill'];
  }

  return (
    <div className={containerClass} role="tablist" aria-label="Sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const buttonClass = `${tabClassBase} ${tabClassName} ${value === tab.value ? styles['is-active'] : ''}`.trim();
        const countClass = `${styles['tab-count']} ${
          tab.count > 0 && tab.tone ? styles[`tab-count--${tab.tone}`] : ''
        }`.trim();

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={value === tab.value}
            className={buttonClass}
            onClick={() => onChange(tab.value)}
          >
            {Icon && <Icon size={isSub || isGlassPill ? 12 : 14} className={styles['tab-icon']} />}
            <span className={styles['tab-label']}>{tab.label}</span>
            {typeof tab.count === 'number' ? (
              <strong className={countClass}>
                {tab.count}
              </strong>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      count: PropTypes.number,
      tone: PropTypes.string,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['sub', 'glass-pill']),
  className: PropTypes.string,
  tabClassName: PropTypes.string,
};

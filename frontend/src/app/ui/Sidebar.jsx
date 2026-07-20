import PropTypes from 'prop-types';
import { ChevronDown, ChevronRight } from './icons';
import styles from './Sidebar.module.css';

export default function Sidebar({ header, groups, onTabSelect }) {
  return (
    <aside className={styles.sidebar}>
      {header && (
        typeof header === 'string' ? (
          <h1 className={styles.header}>{header}</h1>
        ) : (
          header
        )
      )}
      <nav className={styles.menu}>
        {groups.map((group) => {
          if (group.type === 'section-header') {
            return (
              <div key={group.id} className={styles['section-header']}>
                {group.label}
              </div>
            );
          }

          const Icon = group.icon;
          const hasSubItems = !!group.subItems;

          if (hasSubItems) {
            const isSubMenuVisible = !!group.isExpanded;
            const activeSubIndex = group.subItems.findIndex((sub) => sub.isActive);

            return (
              <div key={group.id}>
                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                <div
                  className={`${styles.item} ${group.isActive ? styles.active : ''}`.trim()}
                  onClick={group.onToggle}
                >
                  <Icon size={18} className={styles['item-icon']} />
                  <span className={styles.label}>{group.label}</span>
                  {isSubMenuVisible ? (
                    <ChevronDown size={16} className={styles['item-chevron']} />
                  ) : (
                    <ChevronRight size={16} className={styles['item-chevron']} />
                  )}
                </div>
                <div
                  className={`${styles['sub-menu']} ${isSubMenuVisible ? styles['is-open'] : styles['is-closed']}`.trim()}
                  aria-hidden={!isSubMenuVisible}
                >
                  <div
                    className={styles['sub-indicator']}
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{
                      top: `calc(${activeSubIndex === -1 ? 0 : activeSubIndex} * (2 * var(--space-lg) + var(--space-xs)))`,
                      opacity: activeSubIndex === -1 ? 0 : 1,
                    }}
                  />
                  {group.subItems.map((sub) => {
                    return (
                      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                      <div
                        key={sub.id}
                        className={`${styles['sub-item']} ${sub.isActive ? styles.active : ''}`.trim()}
                        onClick={() => {
                          if (sub.onSelect) sub.onSelect();
                          else onTabSelect(sub.id);
                        }}
                      >
                        <span>{sub.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions
            <div
              key={group.id}
              className={`${styles.item} ${group.isActive ? styles.active : ''}`.trim()}
              onClick={() => {
                if (group.onSelect) group.onSelect();
                else onTabSelect(group.id);
              }}
            >
              <Icon size={18} className={styles['item-icon']} />
              <span>{group.label}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

Sidebar.propTypes = {
  header: PropTypes.node,
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      isActive: PropTypes.bool,
      onSelect: PropTypes.func,
      onToggle: PropTypes.func,
      isExpanded: PropTypes.bool,
      subItems: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
          isActive: PropTypes.bool,
          onSelect: PropTypes.func,
        })
      ),
    })
  ).isRequired,
  onTabSelect: PropTypes.func,
};

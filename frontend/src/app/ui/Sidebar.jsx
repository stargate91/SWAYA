import { ChevronDown, ChevronRight } from './icons';
import './Sidebar.css';

export default function Sidebar({ header, groups, onTabSelect }) {
  return (
    <aside className="ui-sidebar">
      {header && (
        typeof header === 'string' ? (
          <h1 className="ui-sidebar-header">{header}</h1>
        ) : (
          header
        )
      )}
      <nav className="ui-sidebar-menu">
        {groups.map((group) => {
          const Icon = group.icon;
          const hasSubItems = !!group.subItems;

          if (hasSubItems) {
            const isSubMenuVisible = !!group.isExpanded;
            const activeSubIndex = group.subItems.findIndex((sub) => sub.isActive);

            return (
              <div key={group.id}>
                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                <div
                  className={`ui-sidebar-item${group.isActive ? ' active' : ''}`}
                  onClick={group.onToggle}
                >
                  <Icon size={18} className="ui-sidebar-item-icon" />
                  <span className="ui-sidebar-label">{group.label}</span>
                  {isSubMenuVisible ? (
                    <ChevronDown size={16} className="ui-sidebar-item-chevron" />
                  ) : (
                    <ChevronRight size={16} className="ui-sidebar-item-chevron" />
                  )}
                </div>
                <div
                  className={`ui-sidebar-sub-menu${isSubMenuVisible ? ' is-open' : ' is-closed'}`}
                  aria-hidden={!isSubMenuVisible}
                >
                  {activeSubIndex !== -1 && (
                    <div
                      className="ui-sidebar-sub-indicator"
                      // eslint-disable-next-line react/forbid-dom-props
                      style={{ top: `${activeSubIndex * 32}px` }}
                    />
                  )}
                  {group.subItems.map((sub) => {
                    return (
                      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                      <div
                        key={sub.id}
                        className={`ui-sidebar-sub-item${sub.isActive ? ' active' : ''}`}
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
              className={`ui-sidebar-item${group.isActive ? ' active' : ''}`}
              onClick={() => {
                if (group.onSelect) group.onSelect();
                else onTabSelect(group.id);
              }}
            >
              <Icon size={18} className="ui-sidebar-item-icon" />
              <span>{group.label}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

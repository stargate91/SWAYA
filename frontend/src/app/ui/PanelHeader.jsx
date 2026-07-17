import PropTypes from 'prop-types';
import { Tabs } from '@/ui/Tabs';
import Input from '@/ui/Input';
import Badge from '@/ui/Badge';
import { Search } from '@/ui/icons';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './PanelHeader.module.css';
import Inline from '@/ui/Inline';

/**
 * PanelHeader provides a unified, consistent header panel layout
 * with support for title, adult badge, action buttons, tabs, search, and custom extra rows.
 */
export function PanelHeaderRow({ children, variant, className = '' }) {
  const classes = [
    styles['panel-header__row'],
    variant === 'filters' && styles['panel-header__row--filters'],
    variant === 'advanced-filters' && styles['panel-header__row--advanced-filters'],
    className
  ].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
}

PanelHeaderRow.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['filters', 'advanced-filters']),
};

export default function PanelHeader({
  title,
  sessionMode,
  actions,
  tabs,
  activeTab,
  onTabChange,
  showSearch = false,
  searchPlaceholder,
  searchQuery = '',
  onSearchQueryChange,
  children,
}) {
  const { t } = useTranslation();
  const isAdultMode = sessionMode === 'nsfw';
  const panelClassName = styles['panel-header'];

  return (
    <div className={panelClassName}>
      {/* Row 1: Title and Actions */}
      <div className={styles['panel-header__row']}>
        <span className={styles['panel-header__title']}>
          {title}
          {isAdultMode && (
            <sup className={styles['panel-header__adult-sup']}>
              <Badge
                family="adult"
                tone="danger"
                size="sm"
                className={styles['panel-header__adult-badge-override']}
              >
                {t('common.adult_badge', { defaultValue: '18+' })}
              </Badge>
            </sup>
          )}
        </span>
        {actions && (
          <Inline gap="sm" align="center" className={styles['panel-header__actions']}>
            {actions}
          </Inline>
        )}
      </div>

      {/* Row 2: Tabs and Search */}
      {(tabs || showSearch) && (
        <div className={styles['panel-header__row']}>
          {tabs && (
            <Tabs
              tabs={tabs}
              value={activeTab}
              onChange={onTabChange}
              tabClassName={styles['panel-tab']}
              className={styles['panel-tabs']}
            />
          )}
          {showSearch && (
            <Input
              type="search"
              placeholder={searchPlaceholder || t('common.search') || 'Search...'}
              value={searchQuery}
              onChange={onSearchQueryChange}
              leftElement={<Search size={14} />}
              className={styles['panel-header-search']}
              size="sm"
              expandOnFocus={true}
            />
          )}
        </div>
      )}

      {/* Row 3+: Children (Sub-tabs, filters, custom rows) */}
      {children}
    </div>
  );
}

PanelHeader.Row = PanelHeaderRow;


PanelHeader.propTypes = {
  title: PropTypes.string.isRequired,
  sessionMode: PropTypes.string,
  actions: PropTypes.node,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      count: PropTypes.number,
      icon: PropTypes.elementType,
    })
  ),
  activeTab: PropTypes.string,
  onTabChange: PropTypes.func,
  showSearch: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  searchQuery: PropTypes.string,
  onSearchQueryChange: PropTypes.func,
  children: PropTypes.node,
};

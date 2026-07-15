import { Tabs } from '../../ui/Tabs';
import SearchInputCombo from '../../ui/SearchInputCombo';
import Badge from '../../ui/Badge';
import { useTranslation } from '@/providers/LanguageContext';
import styles from './OrganizerHeaderPanel.module.css';

export default function OrganizerHeaderPanel({
  activeExtrasTab,
  activeManualTab,
  activeMainTab,
  actions,
  computedExtrasTabs,
  computedManualTabs,
  computedMainTabs,
  onChangeExtrasTab,
  onChangeManualTab,
  onChangeMainTab,
  searchPlaceholder,
  searchQuery,
  setSearchQuery,
  title,
  sessionMode,
}) {
  const { t } = useTranslation();
  const panelClassName = `${styles['organizer-panel']} ${sessionMode === 'nsfw' ? styles['organizer-panel--nsfw'] || '' : ''}`;

  return (
    <div className={panelClassName}>
      <div className={styles['organizer-panel__row']}>
        <span className={`${styles['organizer-panel__title']} ${styles['organizer-panel__title--nsfw-container']}`}>
          {title}
          {sessionMode === 'nsfw' && (
            <sup className={styles['organizer-panel__adult-sup']}>
              <Badge family="adult" tone="danger" size="sm" className={styles['organizer-panel__adult-badge-override']}>
                {t('common.adult_badge', { defaultValue: '18+' })}
              </Badge>
            </sup>
          )}
        </span>
        <div className={styles['organizer-panel__actions']}>
          {actions}
        </div>
      </div>

      <div className={styles['organizer-panel__row']}>
        <Tabs
          tabs={computedMainTabs}
          value={activeMainTab}
          onChange={onChangeMainTab}
        />
        <SearchInputCombo
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className={styles['organizer-search']}
          size="sm"
        />
      </div>

      {activeMainTab === 'manual' && computedManualTabs.length > 1 ? (
        <div className={styles['organizer-panel__row']}>
          <Tabs
            tabs={computedManualTabs}
            value={activeManualTab}
            onChange={onChangeManualTab}
            variant="sub"
          />
        </div>
      ) : null}

      {activeMainTab === 'extras' ? (
        <div className={styles['organizer-panel__row']}>
          <Tabs
            tabs={computedExtrasTabs}
            value={activeExtrasTab}
            onChange={onChangeExtrasTab}
            variant="sub"
          />
        </div>
      ) : null}
    </div>
  );
}

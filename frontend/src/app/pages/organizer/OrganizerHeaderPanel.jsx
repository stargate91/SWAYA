import { Search } from '@/ui/icons';
import { Tabs } from '../../ui/Tabs';
import Input from '../../ui/Input';
import { useTranslation } from '@/providers/LanguageContext';

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
  const panelClassName = `organizer-panel${sessionMode === 'nsfw' ? ' organizer-panel--nsfw' : ''}`;

  return (
    <div className={panelClassName}>
      <div className="organizer-panel__row">
        <span className="organizer-panel__title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {title}
          {sessionMode === 'nsfw' && (
            <sup style={{ fontSize: '0.55em', top: '-0.8em', position: 'relative', userSelect: 'none' }}>
              <span className="settings-badge settings-badge--danger" style={{ fontSize: 'inherit', letterSpacing: 'normal', borderRadius: '4px', padding: '2px 6px', height: 'auto', minHeight: '0', lineRight: '1' }}>
                {t('common.adult_badge', { defaultValue: '18+' })}
              </span>
            </sup>
          )}
        </span>
        <div className="organizer-panel__actions">
          {actions}
        </div>
      </div>

      <div className="organizer-panel__row">
        <Tabs
          tabs={computedMainTabs}
          value={activeMainTab}
          onChange={onChangeMainTab}
        />
        <div className="organizer-search">
          <Search size={14} className="organizer-search__icon" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {activeMainTab === 'manual' && computedManualTabs.length > 1 ? (
        <div className="organizer-panel__row">
          <Tabs
            tabs={computedManualTabs}
            value={activeManualTab}
            onChange={onChangeManualTab}
            variant="sub"
          />
        </div>
      ) : null}

      {activeMainTab === 'extras' ? (
        <div className="organizer-panel__row">
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

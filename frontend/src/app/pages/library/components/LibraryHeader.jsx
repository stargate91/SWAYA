import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Plus } from '@/ui/icons';
import { Tabs } from '@/ui/Tabs';
import SearchInputCombo from '@/ui/SearchInputCombo';
import Button from '@/ui/Button';
import FilterDropdown from '@/ui/FilterDropdown';
import Badge from '@/ui/Badge';
import { isLibraryPeopleTab, isLibraryTagsTab } from '@/lib/libraryTabs';
import { useDebounce } from '@/hooks/useDebounce';

const SearchInput = React.memo(({ placeholder, onSearchChange, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, 300);
  const onSearchChangeRef = useRef(onSearchChange);

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (debouncedValue === initialValue) {
        return;
      }
    }
    onSearchChangeRef.current?.(debouncedValue);
  }, [debouncedValue, initialValue]);

  return (
    <SearchInputCombo
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="organizer-search"
      size="sm"
    />
  );
});


SearchInput.displayName = 'SearchInput';

export default function LibraryHeader({
  t,
  pageTitle = null,
  tabs,
  resolvedTab,
  setActiveTab,
  searchPlaceholder,
  setSearchQuery,
  searchQuery = '',
  onAddPeople,
  onCreateTag,
  showTabs = true,
  sortKey,
  setSortKey,
  sortDirection,
  setSortDirection,
  setCurrentPage,
  activeSessionMode,
  showSearch = true,
}) {
  const currentTabObj = tabs.find(tab => tab.value === resolvedTab);
  const hasItems = currentTabObj ? (currentTabObj.count > 0) : false;
  const showInlineSorter = !showTabs && isLibraryTagsTab(resolvedTab) && setSortKey && setSortDirection && setCurrentPage;
  const btnVariant = 'primary';

  return (
    <>
      {/* Row 1: Title */}
      <div className="organizer-panel__row library-header-row">
        <span className="organizer-panel__title library-title-group">
          {pageTitle || t('library.title')}
          {!pageTitle && activeSessionMode === 'nsfw' && (
            <sup className="library-nsfw-badge-sup">
              <Badge family="adult" tone="danger" className="library-nsfw-badge-span">
                {t('common.adult_badge', { defaultValue: '18+' })}
              </Badge>
            </sup>
          )}
        </span>
        {isLibraryPeopleTab(resolvedTab) && hasItems && onAddPeople && (
          <Button variant={btnVariant} size="sm" onClick={onAddPeople} className="library-header-btn">
            <UserPlus size={14} />
            {t('library.people.addPeopleBtn') || 'Add People'}
          </Button>
        )}
        {isLibraryTagsTab(resolvedTab) && hasItems && onCreateTag && (
          <Button variant={btnVariant} size="sm" onClick={onCreateTag} className="library-header-btn">
            <Plus size={14} />
            {t('library.tags.createBtn') || 'Create Tag'}
          </Button>
        )}
      </div>

      {/* Row 2: Tabs and Search */}
      <div className="organizer-panel__row">
        {showTabs ? (
          <Tabs
            tabs={tabs}
            value={resolvedTab}
            onChange={setActiveTab}
          />
        ) : (
          <div className="library-header__inline-tools">
            {showInlineSorter ? (
              <FilterDropdown
                label={t('library.sort.label') || 'Sort:'}
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value);
                  setCurrentPage(1);
                }}
                sortDirection={sortDirection}
                onSortDirectionToggle={() => {
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'total_count', label: t('library.sort.itemCount') || 'Item Count' },
                  { value: 'name', label: t('library.sort.name') || 'Name' },
                ]}
              />
            ) : null}
          </div>
        )}
        {showSearch && (
          <SearchInput
            key={resolvedTab}
            placeholder={searchPlaceholder}
            onSearchChange={setSearchQuery}
            initialValue={searchQuery}
          />
        )}
      </div>
    </>
  );
}

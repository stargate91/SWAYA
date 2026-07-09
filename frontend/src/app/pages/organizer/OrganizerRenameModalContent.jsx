import { useState, useMemo } from 'react';
import { Search } from '@/ui/icons';
import { compareOrganizerValues } from './organizerMappers';
import Input from '../../ui/Input';
import Tooltip from '../../ui/Tooltip';
import Checkbox from '../../ui/Checkbox';
import Table from '../../ui/Table';
import { useOrganizerSort } from './useOrganizerSort';
import { useLocalListSearch } from '../../hooks/useLocalListSearch';
import './RenameModal.css';

const RENAME_SEARCH_KEYS = ['source', 'target', 'type'];

export default function OrganizerRenameModalContent({ items = [], t, organizeInPlace, setOrganizeInPlace }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { sortConfig, handleSortToggle } = useOrganizerSort('target', 'asc');

  const filteredItems = useLocalListSearch(items, searchQuery, RENAME_SEARCH_KEYS);

  const sortedItems = useMemo(() => {
    const result = [...filteredItems];
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        const comp = compareOrganizerValues(valA, valB);
        return sortConfig.direction === 'asc' ? comp : -comp;
      });
    }
    return result;
  }, [filteredItems, sortConfig]);

  const columns = useMemo(() => [
    {
      key: 'source',
      label: t('organizer.renameModal.currentFilename') || 'Current Filename',
      sortable: true,
      width: '45%',
      render: (value, row) => (
        <Tooltip content={row.sourcePath} side="top" align="start">
          <span className="organizer-rename-modal__cell-text">
            {row.source}
          </span>
        </Tooltip>
      )
    },
    {
      key: 'target',
      label: t('organizer.renameModal.newFilename') || 'New Filename',
      sortable: true,
      width: '45%',
      render: (value, row) => (
        <Tooltip content={organizeInPlace ? row.sourcePath : row.targetPath} side="top" align="start">
          <span className={`organizer-rename-modal__cell-text ${organizeInPlace ? 'is-organize-in-place' : ''}`}>
            {organizeInPlace ? row.source : row.target}
          </span>
        </Tooltip>
      )
    },
    {
      key: 'type',
      label: t('organizer.table.type') || 'Type',
      sortable: true,
      width: '10%',
      align: 'center'
    }
  ], [t, organizeInPlace]);

  return (
    <div className="organizer-rename-modal">
      <div className="organizer-rename-modal__search">
        <Input
          type="text"
          placeholder={t('organizer.searchPlaceholder') || 'Search files...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftElement={<Search size={18} />}
        />
      </div>

      <div className="organizer-rename-modal__summary">
        <span>
          {t('organizer.renameModal.showing')
            .replace('{count}', sortedItems.length)
            .replace('{total}', items.length)}
        </span>
        <Checkbox
          checked={organizeInPlace}
          onChange={(e) => setOrganizeInPlace(e.target.checked)}
        >
          {t('organizer.renameModal.organizeInPlaceCheckbox') || 'Keep original filenames (Organize in Place)'}
        </Checkbox>
      </div>

      <div className="organizer-rename-modal__list-container">
        <Table
          variant="minimal"
          columns={columns}
          rows={sortedItems}
          sortKey={sortConfig.key}
          sortDirection={sortConfig.direction}
          onSort={handleSortToggle}
          emptyText={t('organizer.renameModal.noMatching')}
        />
      </div>
    </div>
  );
}

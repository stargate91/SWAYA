import { useState, useMemo } from 'react';
import { Search } from '@/ui/icons';
import { compareOrganizerValues } from './organizerMappers';
import Input from '../../ui/Input';
import Tooltip from '../../ui/Tooltip';
import Checkbox from '../../ui/Checkbox';
import Table from '../../ui/Table';
import Inline from '../../ui/Inline';
import Stack from '../../ui/Stack';
import Card from '../../ui/Card';
import Text from '../../ui/Text';
import { useOrganizerSort } from './useOrganizerSort';
import { useLocalListSearch } from '../../hooks/useLocalListSearch';
import styles from './OrganizerRenameModalContent.module.css';

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
          <Text color="secondary" truncate>
            {row.source}
          </Text>
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
          <Text
            color={organizeInPlace ? 'muted' : 'accent'}
            weight={organizeInPlace ? undefined : 'medium'}
            truncate
            className={organizeInPlace ? styles['in-place-disabled'] : undefined}
          >
            {organizeInPlace ? row.source : row.target}
          </Text>
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
    <Stack gap="lg" fullWidth className="u-max-h-70vh">
      <Input
        type="text"
        placeholder={t('organizer.searchPlaceholder') || 'Search files...'}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftElement={<Search size={18} />}
        className="u-flex-shrink-0"
      />

      <Inline align="center" justify="between" className="u-flex-shrink-0">
        <Text variant="small" color="muted">
          {t('organizer.renameModal.showing')
            .replace('{count}', sortedItems.length)
            .replace('{total}', items.length)}
        </Text>
        <Checkbox
          checked={organizeInPlace}
          onChange={(e) => setOrganizeInPlace(e.target.checked)}
        >
          {t('organizer.renameModal.organizeInPlaceCheckbox') || 'Keep original filenames (Organize in Place)'}
        </Checkbox>
      </Inline>

      <div className="u-overflow-y-auto u-max-h-45vh u-flex-grow-1">
        <Card variant="soft" padding="none">
          <Table
            variant="grid"
            columns={columns}
            rows={sortedItems}
            sortKey={sortConfig.key}
            sortDirection={sortConfig.direction}
            onSort={handleSortToggle}
            emptyText={t('organizer.renameModal.noMatching')}
          />
        </Card>
      </div>
    </Stack>
  );
}

import { useMemo } from 'react';
import { ChevronUp, ChevronDown } from '../../ui/icons';
import { buildOrganizerColumns } from './organizerTableConfig';
import { useOrganizerModals } from './useOrganizerModals';
import tableStyles from '../../ui/Table.module.css';

export function useOrganizerColumns({
  activeExtrasTab,
  activeMainTab,
  collisionStrategy,
  handleSortToggle,
  handleToggleAll,
  handleToggleRow,
  normalizeStatusTone,
  paginatedRows,
  selectedRowIds,
  sortConfig,
  t,
}) {
  const { openMatchModal, openOverrideModal } = useOrganizerModals();

  const columns = useMemo(() => {
    const renderSortableLabel = (label, key) => {
      const isActive = sortConfig.key === key;
      return (
        <button
          type="button"
          className={tableStyles['sort-btn']}
          data-sort-active={isActive}
          onClick={(e) => {
            e.stopPropagation();
            handleSortToggle(key);
          }}
        >
          <span>{label}</span>
          {isActive ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
        </button>
      );
    };

    return buildOrganizerColumns({
      activeExtrasTab,
      activeMainTab,
      collisionStrategy,
      handleToggleAll,
      handleToggleRow,
      normalizeStatusTone,
      paginatedRows,
      renderSortableLabel,
      selectedRowIds,
      t,
      onOpenMatch: (row) => openMatchModal(row),
      onOpenOverride: (row) => openOverrideModal(row),
    });
  }, [
    activeExtrasTab,
    activeMainTab,
    collisionStrategy,
    handleToggleAll,
    handleToggleRow,
    normalizeStatusTone,
    paginatedRows,
    selectedRowIds,
    t,
    openMatchModal,
    openOverrideModal,
    sortConfig.key,
    sortConfig.direction,
    handleSortToggle,
  ]);

  return { columns };
}

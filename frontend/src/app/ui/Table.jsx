import { memo, useMemo } from 'react';
import { EyeOff, Trash2, Search, Sliders, X, ChevronUp, ChevronDown } from '@/ui/icons';
import { useTranslation } from '../providers/LanguageContext';
import EmptyState from './EmptyState';
import Tooltip from './Tooltip';
import IconButton from './IconButton';
import ContextMenu from './ContextMenu';
import { useContextMenu } from './useContextMenu';
import styles from './Table.module.css';

function TableHeader({ columns, sortKey, sortDirection, onSort }) {
  return (
    <thead>
      <tr>
        {columns.map((col) => {
          const isSortable = col.sortable;
          const isCurrentSort = sortKey === col.key;
          const alignClass = col.align === 'center' ? styles['align-center'] : col.align === 'right' ? styles['align-right'] : '';
          const thClass = `${alignClass} ${col.className || ''}`.trim();
          return (
            <th
              key={col.key}
              width={col.width || undefined}
              // eslint-disable-next-line react/forbid-dom-props
              style={col.width ? { width: col.width, minWidth: col.width } : undefined}
              className={thClass}
            >
              {isSortable && onSort ? (
                <button
                  type="button"
                  className={styles['sort-btn']}
                  data-sort-active={isCurrentSort}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSort(col.key);
                  }}
                >
                  <span>{col.label}</span>
                  {isCurrentSort ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
                </button>
              ) : (
                col.label
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

const TableRow = memo(function TableRow({
  row,
  columns,
  onRowClick,
  onContextMenu,
  activeRowId,
  rowActions = [],
}) {
  const lastColumnKey = columns[columns.length - 1]?.key;
  const hasRowActions = rowActions.length > 0;
  const visibleRowActions = hasRowActions
    ? rowActions.filter((action) => (action.isVisible ? action.isVisible(row) : true))
    : [];

  return (
    <tr
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, row) : undefined}
      className={`${onRowClick ? styles.isClickable : ''} ${activeRowId === row.id ? styles.isActive : ''}`.trim()}
    >
      {columns.map((col) => {
        const rawValue = row[col.key];
        const renderedValue = col.render ? col.render(rawValue, row) : rawValue;
        const hasActionsInCell = visibleRowActions.length > 0 && col.key === lastColumnKey;
        const hideOnHoverClass = (hasActionsInCell || col.hideOnHover) ? styles.hideOnHover : '';
        const isEmpty = renderedValue === undefined || renderedValue === null || renderedValue === '';
        const alignClass = col.align === 'center' ? styles['align-center'] : col.align === 'right' ? styles['align-right'] : '';
        const tdClass = `${alignClass} ${col.className || ''}`.trim();

        return (
          <td
            key={col.key}
            width={col.width || undefined}
            // eslint-disable-next-line react/forbid-dom-props
            style={col.width ? { width: col.width, minWidth: col.width } : undefined}
            className={tdClass}
          >
            <div className={styles['cell-content']}>
              {col.render ? (
                <div className={`${styles['cell-value-custom']} ${hideOnHoverClass}`.trim()}>
                  {isEmpty ? '-' : renderedValue}
                </div>
              ) : (
                <span className={`${styles['cell-value']} ${hideOnHoverClass}`.trim()}>
                  {isEmpty ? '-' : renderedValue}
                </span>
              )}
              {hasActionsInCell ? (
                /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
                <div className={styles['row-actions']} onClick={(event) => event.stopPropagation()}>
                  {visibleRowActions.map((action) => {
                    const actionClass = `${styles['row-action']} ${action.className === 'is-danger' ? styles.isDanger : (action.className || '')
                      }`.trim();
                    return (
                      <Tooltip key={action.key} content={action.tooltip || action.label} side="top">
                        <IconButton
                          type="button"
                          className={actionClass}
                          onClick={() => action.onClick(row)}
                          label={action.tooltip || action.label}
                          title={null}
                          size="sm"
                        >
                          <action.icon size={15} />
                        </IconButton>
                      </Tooltip>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </td>
        );
      })}
    </tr>
  );
}, (prevProps, nextProps) => {
  if (prevProps.row !== nextProps.row) return false;
  if (prevProps.columns !== nextProps.columns) return false;
  if (prevProps.rowActions !== nextProps.rowActions) return false;
  
  const wasActive = prevProps.activeRowId === prevProps.row.id;
  const isActive = nextProps.activeRowId === nextProps.row.id;
  if (wasActive !== isActive) return false;
  
  return true;
});

export default function Table({
  columns,
  rows = [],
  onRowClick,
  activeRowId = null,
  emptyText,
  emptyContent = null,
  rowActions = [],
  selectedRows = [],
  openBulkDeleteModal,
  openMatchModal,
  openBulkOverrideModal,
  dismissRows,
  clearSelectedRows,
  variant = 'default',
  sortKey = null,
  sortDirection = null,
  onSort = null,
  className = '',
}) {
  const {
    contextMenu,
    handleRowContextMenu,
    closeContextMenu,
    activeRow,
    useBulkActions,
  } = useContextMenu(selectedRows);

  const { t } = useTranslation();
  const displayEmptyText = emptyText ?? t('common.noData');

  const contextMenuItems = useMemo(() => {
    const items = [];
    if (!activeRow) return items;

    if (useBulkActions) {
      const hasExtras = selectedRows.some((r) => r.rawType === 'extra');
      const allSameType = selectedRows.every((r) => r.rawType === selectedRows[0].rawType);

      if (!hasExtras && dismissRows && clearSelectedRows) {
        items.push({
          key: 'bulk-dismiss',
          label: t('common.remove') || 'Remove',
          icon: EyeOff,
          onClick: () => {
            dismissRows(selectedRows.map((r) => r.id));
            clearSelectedRows();
          },
        });
      }

      if (openBulkDeleteModal) {
        items.push({
          key: 'bulk-delete',
          label: t('common.delete') || 'Delete',
          icon: Trash2,
          className: 'is-danger',
          onClick: () => openBulkDeleteModal(selectedRows),
        });
      }

      if (!hasExtras && openMatchModal) {
        items.push({
          key: 'bulk-match',
          label: t('organizer.actions.match') || 'Match',
          icon: Search,
          onClick: () => openMatchModal(null, selectedRows),
        });
      }

      if (allSameType && openBulkOverrideModal) {
        items.push({
          key: 'bulk-override',
          label: t('organizer.actions.override') || 'Override',
          icon: Sliders,
          onClick: () => openBulkOverrideModal(selectedRows),
        });
      }

      if (clearSelectedRows) {
        items.push({ divider: true });
        items.push({
          key: 'bulk-clear',
          label: t('organizer.bulkBar.clear') || 'Clear selection',
          icon: X,
          onClick: clearSelectedRows,
        });
      }
    } else if (rowActions.length > 0) {
      const visibleActions = rowActions.filter((action) => (action.isVisible ? action.isVisible(activeRow) : true));

      visibleActions.forEach((action) => {
        if ((action.key === 'dismiss' || action.key === 'delete') && items.length > 0 && !items[items.length - 1].divider) {
          items.push({ divider: true });
        }

        items.push({
          key: action.key,
          label: action.tooltip || action.label,
          icon: action.icon,
          className: action.className || '',
          onClick: () => action.onClick(activeRow),
        });
      });
    }

    return items;
  }, [activeRow, useBulkActions, selectedRows, dismissRows, clearSelectedRows, openBulkDeleteModal, openMatchModal, openBulkOverrideModal, rowActions, t]);

  const wrapClass = `${styles.wrap} ${variant === 'minimal' ? styles['wrap-minimal'] : ''} ${className}`.trim();
  const tableClass = `${styles.table} ${variant === 'minimal' ? styles['table-minimal'] : ''}`.trim();

  return (
    <div className={wrapClass}>
      <table className={tableClass}>
        <TableHeader
          columns={columns}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <tbody>
          {rows.length === 0 ? (
            <tr className={styles.isEmpty}>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyContent || <EmptyState size="sm" border="none" background="none" title={displayEmptyText} />}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                row={row}
                columns={columns}
                onRowClick={onRowClick}
                onContextMenu={variant === 'minimal' ? undefined : handleRowContextMenu}
                activeRowId={activeRowId}
                rowActions={variant === 'minimal' ? [] : rowActions}
              />
            ))
          )}
        </tbody>
      </table>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

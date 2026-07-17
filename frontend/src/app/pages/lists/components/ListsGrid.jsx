import { Loader2, Search, List as ListIcon } from '@/ui/icons';
import EmptyState from '@/ui/EmptyState';
import Grid from '@/ui/Grid';
import ListsCard from './ListsCard';
import styles from './ListsGrid.module.css';

export default function ListsGrid({
  isDetailsLoading,
  activeList,
  activeListDetails,
  filteredListItems,
  sessionMode,
  settings,
  t,
  handleCardClick,
  handleRemoveListItem,
}) {
  if (isDetailsLoading) {
    return (
      <div className={styles['lists-content__loading']}>
        <Loader2 className="spinner" size={24} />
      </div>
    );
  }

  if (!activeListDetails || !activeListDetails.items || activeListDetails.items.length === 0) {
    return (
      <EmptyState
        title={t('lists.empty_list_title') || 'List is Empty'}
        description={t('lists.empty_list_desc') || 'This list has no items yet.'}
        icon={ListIcon}
        size="lg"
        border="dashed"
        background="solid"
        style={activeList?.color ? {
          '--ui-empty-icon-color': activeList.color,
          '--ui-empty-icon-bg': `color-mix(in srgb, ${activeList.color} 14%, transparent)`,
          '--ui-empty-icon-border': `color-mix(in srgb, ${activeList.color} 20%, transparent)`,
        } : null}
      />
    );
  }

  if (filteredListItems.length === 0) {
    return (
      <EmptyState
        title={t('lists.no_search_results_title') || 'No Matches Found'}
        description={t('lists.no_search_results_desc') || 'Try refining your search query.'}
        icon={Search}
        size="lg"
        border="dashed"
        background="solid"
        style={activeList?.color ? {
          '--ui-empty-icon-color': activeList.color,
          '--ui-empty-icon-bg': `color-mix(in srgb, ${activeList.color} 14%, transparent)`,
          '--ui-empty-icon-border': `color-mix(in srgb, ${activeList.color} 20%, transparent)`,
        } : null}
      />
    );
  }

  return (
    <Grid variant="mixed">
      {filteredListItems.map((item) => (
        <ListsCard
          key={item.id}
          item={item}
          sessionMode={sessionMode}
          settings={settings}
          t={t}
          handleCardClick={handleCardClick}
          handleRemoveListItem={handleRemoveListItem}
        />
      ))}
    </Grid>
  );
}

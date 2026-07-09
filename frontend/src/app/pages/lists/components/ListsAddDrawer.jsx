import useListsAddDrawer from '../hooks/useListsAddDrawer';
import Pill from '@/ui/Pill';
import DrawerSearchHeader from './DrawerSearchHeader';
import DrawerResultsList from './DrawerResultsList';
import Drawer from '@/ui/Drawer';

export default function ListsAddDrawer({
  isOpen,
  onClose,
  activeList,
  addListItemMutation,
  activeListDetails,
  settings,
  t,
}) {
  const state = useListsAddDrawer({
    isOpen,
    activeList,
    addListItemMutation,
    activeListDetails,
    t,
  });

  if (!isOpen || !activeList) return null;
  const listType = activeList.list_type;

  const headerTitle = (
    <div className="lists-add-drawer-header-title">
      <span>{listType === 'person' ? (t('lists.add_people_title') || 'Add People') : (t('lists.add_titles_title') || 'Add Titles')}</span>
      {settings?.include_adult && (
        <Pill
          as="button"
          variant={state.isAdultActive ? 'favorite-active' : 'favorite'}
          onClick={state.toggleAdultMode}
          className="lists-add-drawer-nsfw-toggle"
        >
          {state.isAdultActive ? 'NSFW' : 'SFW'}
        </Pill>
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={headerTitle}
      size="lg"
      className="lists-drawer"
    >
      <DrawerSearchHeader
        listType={listType}
        isAdultActive={state.isAdultActive}
        source={state.source}
        setSource={state.setSource}
        mediaType={state.mediaType}
        setMediaType={state.setMediaType}
        provider={state.provider}
        setProvider={state.setProvider}
        statusFilter={state.statusFilter}
        setStatusFilter={state.setStatusFilter}
        query={state.query}
        setQuery={state.setQuery}
        setResults={state.setResults}
      />

      <DrawerResultsList
        searching={state.searching}
        loadingMore={state.loadingMore}
        results={state.results}
        query={state.query}
        source={state.source}
        statusFilter={state.statusFilter}
        isAdded={state.isAdded}
        listType={listType}
        mediaType={state.mediaType}
        t={t}
        handleScroll={state.handleScroll}
        handleAdd={state.handleAdd}
        handleRemove={state.handleRemove}
      />
    </Drawer>
  );
}

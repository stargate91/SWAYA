import useListsAddDrawer from '../hooks/useListsAddDrawer';
import { X } from '@/ui/icons';
import Pill from '@/ui/Pill';
import DrawerSearchHeader from './DrawerSearchHeader';
import DrawerResultsList from './DrawerResultsList';

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

  return (
    <>
      <div className="ui-drawer-backdrop" onClick={onClose} role="presentation" />
      <div className="ui-drawer ui-drawer--lg lists-drawer">
        <div className="lists-drawer__header">
          <h3>{listType === 'person' ? (t('lists.add_people_title') || 'Add People') : (t('lists.add_titles_title') || 'Add Titles')}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {settings?.include_adult && (
              <Pill
                as="button"
                variant={state.isAdultActive ? 'favorite-active' : 'favorite'}
                onClick={state.toggleAdultMode}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '4px 10px',
                }}
              >
                {state.isAdultActive ? 'NSFW' : 'SFW'}
              </Pill>
            )}
            <button className="lists-drawer__close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

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
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/providers/LanguageContext';
import Page from '@/ui/Page';
import Button from '@/ui/Button';
import { useUi } from '@/providers/UiProvider';
import {
  useListsQuery,
  useListDetailsQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useAddListItemMutation
} from '@/queries';
import { Plus, Edit2, Trash2, List as ListIcon, Loader2, Film, Users, Download, Search } from 'lucide-react';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import api from '@/lib/api';
import EmptyState from '@/ui/EmptyState';
import CreateListModalContent from './CreateListModalContent';
import './ListsPage.css';



export default function ListsPage() {
  const { t } = useTranslation();
  const { openModal, closeModal } = useUi();
  const { data: lists = [], isLoading } = useListsQuery();

  const createMutation = useCreateListMutation();
  const updateMutation = useUpdateListMutation();
  const deleteMutation = useDeleteListMutation();
  const addListItemMutation = useAddListItemMutation();

  const fileInputRef = useRef(null);

  const [activeListId, setActiveListId] = useState(null);
  const activeList = lists.find((l) => l.id === activeListId);
  const { data: activeListDetails, isLoading: isDetailsLoading } = useListDetailsQuery(activeListId, {
    enabled: !!activeListId
  });

  // Set default active list on load
  useEffect(() => {
    if (lists.length > 0 && activeListId === null) {
      const watchlist = lists.find((l) => l.is_watchlist) || lists[0];
      setActiveListId(watchlist.id);
    }
  }, [lists, activeListId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.name) {
          alert(t('lists.import_invalid_format') || 'Invalid list format: "name" is required.');
          return;
        }

        // Create the list
        const newList = await createMutation.mutateAsync({
          name: data.name,
          description: data.description || '',
          color: data.color || 'var(--color-accent-blue)',
          list_type: data.list_type || 'media'
        });

        // Add all items
        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            await addListItemMutation.mutateAsync({
              listId: newList.id,
              payload: {
                media_item_id: item.media_item_id,
                tmdb_id: item.tmdb_id,
                media_type: item.media_type || 'movie'
              }
            });
          }
        }

        if (newList && newList.id) {
          setActiveListId(newList.id);
        }
      } catch (err) {
        alert((t('lists.import_failed') || 'Failed to import list: ') + (err.message || err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleStartCreate = () => {
    openModal({
      title: t('lists.create_title') || 'Create Custom List',
      icon: ListIcon,
      content: (
        <CreateListModalContent
          onClose={closeModal}
          t={t}
          mode="create"
          existingNames={lists.map((l) => l.name)}
          onSave={(payload) => {
            createMutation.mutate(payload, {
              onSuccess: (newList) => {
                closeModal();
                if (newList && newList.id) {
                  setActiveListId(newList.id);
                }
              },
            });
          }}
        />
      ),
      footer: (
        <div className="lists-modal-footer">
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" type="submit" form="create-list-form">
            {t('common.create') || 'Create'}
          </Button>
        </div>
      ),
    });
  };

  const handleStartEdit = (list, e) => {
    e.stopPropagation();
    openModal({
      title: t('lists.edit_title') || 'Edit List Details',
      icon: Edit2,
      content: (
        <CreateListModalContent
          onClose={closeModal}
          t={t}
          initialList={list}
          mode="edit"
          existingNames={lists.map((l) => l.name)}
          onSave={(payload) => {
            updateMutation.mutate(
              {
                listId: list.id,
                payload,
              },
              {
                onSuccess: () => {
                  closeModal();
                },
              }
            );
          }}
        />
      ),
      footer: (
        <div className="lists-modal-footer">
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button variant="primary" type="submit" form="create-list-form">
            {t('common.save') || 'Save'}
          </Button>
        </div>
      ),
    });
  };

  const handleDelete = (listId, e) => {
    e.stopPropagation();
    if (window.confirm(t('lists.delete_confirm') || 'Are you sure you want to delete this list?')) {
      deleteMutation.mutate(listId, {
        onSuccess: () => {
          if (activeListId === listId) {
            const nextList = lists.find((l) => l.id !== listId);
            setActiveListId(nextList ? nextList.id : null);
          }
        },
      });
    }
  };

  const handleExportList = async (listId) => {
    try {
      const details = await api.lists.getListDetails(listId);
      const dataStr = JSON.stringify(details, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `${details.name.toLowerCase().replace(/\s+/g, '_')}_export.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error('Failed to export list:', e);
    }
  };

  const { toast } = useUi();

  const handleStartAddItems = () => {
    if (!activeList) return;
    openModal({
      title: activeList.list_type === 'person' ? (t('lists.add_people_title') || 'Add People to List') : (t('lists.add_titles_title') || 'Add Titles to List'),
      icon: Plus,
      content: (
        <AddItemsModalContent
          listId={activeList.id}
          listType={activeList.list_type}
          onAdd={async (item) => {
            try {
              if (activeList.list_type === 'person') {
                await addListItemMutation.mutateAsync({
                  listId: activeList.id,
                  payload: {
                    person_id: item.id
                  }
                });
              } else {
                await addListItemMutation.mutateAsync({
                  listId: activeList.id,
                  payload: {
                    media_item_id: item.id,
                    media_type: item.media_type || 'movie'
                  }
                });
              }
              toast(t('lists.item_added_success') || 'Item added successfully!', 'success');
            } catch (err) {
              toast(err.message || 'Failed to add item', 'danger');
            }
          }}
          t={t}
        />
      ),
      footer: (
        <div className="lists-modal-footer">
          <Button variant="secondary-neutral" onClick={closeModal}>
            {t('common.close') || 'Close'}
          </Button>
        </div>
      ),
    });
  };

  return (
    <Page className="lists-page">
      <div className="lists-layout">
        <aside className="lists-sidebar">
          <div className="lists-sidebar__header">
            <span className="lists-sidebar__title">
              {t('lists.sidebar_title') || 'My Lists'}
            </span>
            <div className="lists-sidebar__actions">
              <button
                type="button"
                className="lists-sidebar__import-btn"
                onClick={handleTriggerImport}
                title={t('lists.import_title') || 'Import List'}
              >
                <Download size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="lists-sidebar__create-btn"
                onClick={handleStartCreate}
                title={t('lists.create_title') || 'Create New List'}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="lists-sidebar__content">
            {isLoading ? (
              <div className="lists-sidebar__loading">
                <Loader2 className="spinner" size={20} />
              </div>
            ) : (
              <div className="lists-sidebar__list">
                {lists.map((list) => {
                  const isActive = activeListId === list.id;

                  return (
                    <div
                      key={list.id}
                      className={`lists-sidebar__item ${isActive ? 'is-active' : ''}`}
                      onClick={() => setActiveListId(list.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setActiveListId(list.id)}
                      style={{ '--list-theme-color': list.color || 'var(--color-accent-blue)' }}
                    >
                      <div className="lists-sidebar__item-left">
                         <div
                          className="lists-sidebar__item-icon-wrap"
                          style={{
                            '--list-theme-color': list.color || 'var(--color-accent-blue)',
                            backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${list.color || 'var(--color-accent-blue)'} 18%, #121216), color-mix(in srgb, ${list.color || 'var(--color-accent-blue)'} 6%, #09090b))`,
                            boxShadow: `0 4px 10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -2px 6px rgba(0, 0, 0, 0.5)`
                          }}
                        >
                          {list.sample_posters && list.sample_posters.length > 0 ? (
                            <div className={`lists-sidebar__collage lists-sidebar__collage--${Math.min(4, list.sample_posters.length)}`}>
                              {list.sample_posters.slice(0, 4).map((path, idx) => (
                                <img
                                  key={idx}
                                  src={resolveMediaImageUrl(path, 'posterThumb')}
                                  className={`lists-sidebar__collage-img lists-sidebar__collage-img--${idx}`}
                                  alt=""
                                />
                              ))}
                            </div>
                          ) : list.list_type === 'person' ? (
                            <Users size={28} style={{ color: list.color || 'var(--color-accent-blue)' }} />
                          ) : (
                            <Film size={28} style={{ color: list.color || 'var(--color-accent-blue)' }} />
                          )}
                        </div>
                        <div className="lists-sidebar__item-info">
                          <span className="lists-sidebar__item-name">
                            {list.name}
                          </span>
                          <span className="lists-sidebar__item-desc">
                            {list.description || t('lists.no_description') || 'No description'}
                          </span>
                          <span className="lists-sidebar__item-meta">
                            {list.item_count} {t('lists.items_suffix') || 'ITEMS'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="lists-sidebar__item-right">
                        {!list.is_watchlist && (
                          <div className="lists-sidebar__item-actions">
                            <button
                              type="button"
                              className="lists-sidebar__action-btn lists-sidebar__action-btn--edit"
                              onClick={(e) => handleStartEdit(list, e)}
                              title={t('common.edit') || 'Edit'}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              className="lists-sidebar__action-btn lists-sidebar__action-btn--delete"
                              onClick={(e) => handleDelete(list.id, e)}
                              title={t('common.delete') || 'Delete'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="lists-main">
          {activeList ? (
            <>
              <div className="lists-header" style={{ '--list-theme-color': activeList.color || 'var(--color-accent-blue)' }}>
                <div className="lists-header__left">
                  <div className="lists-header__title-row">
                    <h1 className="lists-header__title">{activeList.name}</h1>
                  </div>
                  {activeList.description && (
                    <p className="lists-header__description">{activeList.description}</p>
                  )}
                  {activeList.created_at && (
                    <span className="lists-header__date">
                      {t('lists.created_prefix') || 'CREATED'}: {new Date(activeList.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="lists-header__right" style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary-neutral"
                    size="sm"
                    onClick={() => handleExportList(activeList.id)}
                    title={t('lists.export') || 'Export JSON'}
                  >
                    <Download size={14} />
                    <span>{t('lists.export') || 'Export JSON'}</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartAddItems}
                  >
                    <Plus size={14} />
                    <span>{activeList.list_type === 'person' ? (t('lists.add_people') || 'Add People') : (t('lists.add_titles') || 'Add Titles')}</span>
                  </Button>
                </div>
              </div>

              <div className="lists-content">
                {isDetailsLoading ? (
                  <div className="lists-sidebar__loading" style={{ padding: 'var(--space-8) 0', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Loader2 className="spinner" size={24} />
                  </div>
                ) : !activeListDetails || !activeListDetails.items || activeListDetails.items.length === 0 ? (
                  <EmptyState
                    title={t('lists.empty_list_title') || 'List is Empty'}
                    description={t('lists.empty_list_desc') || 'This list has no items yet.'}
                    icon={ListIcon}
                    variant="page-filter"
                  />
                ) : (
                  <div className="lists-grid">
                    {activeListDetails.items.map((item) => {
                      const isScene = item.media_type === 'scene';
                      return (
                        <div
                          key={item.id}
                          className={`lists-card ${isScene ? 'lists-card--scene' : 'lists-card--poster'}`}
                        >
                          <div className="lists-card__media">
                            {item.poster_path ? (
                              <img
                                src={resolveMediaImageUrl(item.poster_path, isScene ? 'backdrop' : 'poster')}
                                alt={item.title}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                  borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.05))'
                                }}
                              />
                            ) : (
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }} />
                            )}
                          </div>
                          <div className="lists-card__info">
                            <span className="lists-card__title">{item.title}</span>
                            <span className="lists-card__subtitle">{isScene ? 'Scene' : item.year}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="lists-main__placeholder">
              <ListIcon size={32} className="lists-main__placeholder-icon" />
              <span className="lists-main__placeholder-text">
                {t('lists.no_list_selected_desc') || 'Select a list from the sidebar to view its items.'}
              </span>
            </div>
          )}
        </main>
      </div>
    </Page>
  );
}

function AddItemsModalContent({ listId, listType, onAdd, t }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      if (listType === 'person') {
        const res = await api.people.getAll({ search: query });
        setResults(res.results || res || []);
      } else {
        const res = await api.library.getItems({ search: query, tab: 'movies' });
        setResults(res.results || res.movies || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="add-items-modal" style={{ minWidth: '400px' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={listType === 'person' ? 'Search performers...' : 'Search movies & shows...'}
          style={{
            flex: 1,
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--color-text-primary)'
          }}
        />
        <Button type="submit" variant="primary" style={{ padding: '8px 12px' }}>
          <Search size={16} />
        </Button>
      </form>

      <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {searching && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            <Loader2 className="spinner" />
          </div>
        )}
        {!searching && results.length === 0 && query && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '16px' }}>
            No results found.
          </div>
        )}
        {!searching && results.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'var(--color-panel-soft)',
              borderRadius: '6px',
              border: '1px solid var(--color-border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <div style={{ width: '32px', height: '48px', overflow: 'hidden', borderRadius: '4px', background: 'rgba(255,255,255,0.02)' }}>
                {item.poster_path ? (
                  <img
                    src={resolveMediaImageUrl(item.poster_path, listType === 'person' ? 'person' : 'poster')}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))' }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title || item.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {listType === 'person' ? (item.role || 'Performer') : (item.year || item.media_type || '')}
                </span>
              </div>
            </div>
            <Button
              variant="secondary-neutral"
              onClick={() => onAdd(item)}
              style={{ padding: '6px 10px', height: 'auto' }}
            >
              <Plus size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

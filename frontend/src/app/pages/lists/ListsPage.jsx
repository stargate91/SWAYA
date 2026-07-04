import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/providers/LanguageContext';
import Page from '@/ui/Page';
import Button from '@/ui/Button';
import IconButton from '@/ui/IconButton';
import { useUi } from '@/providers/UiProvider';
import {
  useListsQuery,
  useListDetailsQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useAddListItemMutation,
  useRemoveListItemMutation,
  useSettingsQuery
} from '@/queries';
import { Plus, Edit2, Trash2, List as ListIcon, Loader2, Film, Users, Tv, Download, Search, X, Check, Minus } from 'lucide-react';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import api from '@/lib/api';
import EmptyState from '@/ui/EmptyState';
import SegmentedControl from '@/ui/SegmentedControl';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { API_BASE } from '@/lib/backend';
import CreateListModalContent from './CreateListModalContent';
import './ListsPage.css';



export default function ListsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openModal, closeModal } = useUi();
  const { data: lists = [], isLoading } = useListsQuery();
  const { data: settings } = useSettingsQuery();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  const createMutation = useCreateListMutation();
  const updateMutation = useUpdateListMutation();
  const deleteMutation = useDeleteListMutation();
  const addListItemMutation = useAddListItemMutation();

  const fileInputRef = useRef(null);

  const [activeListId, setActiveListId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const activeList = lists.find((l) => l.id === activeListId);
  const { data: activeListDetails, isLoading: isDetailsLoading } = useListDetailsQuery(activeListId, {
    enabled: !!activeListId
  });

  const [prevActiveListId, setPrevActiveListId] = useState(null);
  const [prevLists, setPrevLists] = useState([]);

  useEffect(() => {
    if (activeListId === prevActiveListId) return;
    setPrevActiveListId(activeListId);
    setIsDrawerOpen(false);
  }, [activeListId, prevActiveListId]);

  useEffect(() => {
    if (lists === prevLists) return;
    setPrevLists(lists);
    if (lists.length > 0 && activeListId === null) {
      const watchlist = lists.find((l) => l.is_watchlist) || lists[0];
      setActiveListId(watchlist.id);
    }
  }, [activeListId, lists, prevLists]);

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


  const handleStartAddItems = () => {
    setIsDrawerOpen(true);
  };

  const handleCardClick = (item) => {
    const rawType = item.media_type || 'movie';
    let mediaType = rawType === 'show' ? 'tv' : rawType;
    if (mediaType === 'episode' || mediaType === 'season') {
      mediaType = 'tv';
    }

    let itemId;
    if (mediaType === 'tv') {
      itemId = item.tmdb_id || item.external_id || item.match_id || item.media_item_id;
    } else {
      itemId = item.media_item_id;
    }

    if (!itemId) {
      if (mediaType === 'movie') {
        const prefix = item.provider === 'porndb' ? 'porndb_' : 'tmdb_';
        itemId = item.external_id ? `${prefix}${item.external_id}` : (item.tmdb_id ? `tmdb_${item.tmdb_id}` : item.match_id);
      } else if (mediaType === 'tv') {
        itemId = item.external_id || item.tmdb_id || item.match_id;
      } else if (mediaType === 'scene') {
        const prefix = item.provider === 'porndb' ? 'porndb' : item.provider === 'fansdb' ? 'fansdb' : 'stash';
        itemId = item.external_id ? `${prefix}_${item.external_id}` : item.match_id;
      } else {
        itemId = item.match_id;
      }
    }

    const targetPath = mediaType === 'person'
      ? `/library/people/${item.person_id || itemId}`
      : `/library/${mediaType}/${itemId}`;

    navigate(targetPath, { state: { allowAdult: true } });
  };

  const createdLabel = activeList?.created_at ? ((t('lists.created_prefix') || 'CREATED') + ': ' + new Date(activeList.created_at).toLocaleDateString()) : '';

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
                hidden
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
                      // eslint-disable-next-line react/forbid-dom-props
                      style={{ '--list-theme-color': list.color || 'var(--color-accent-blue)' }}
                    >
                      <div className="lists-sidebar__item-left">
                        <div className="lists-sidebar__item-icon-wrap">
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
                            <Users size={28} color={list.color || 'var(--color-accent-blue)'} />
                          ) : (
                            <Film size={28} color={list.color || 'var(--color-accent-blue)'} />
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
              {/* eslint-disable-next-line react/forbid-dom-props */}
              <div className="lists-header" style={{ '--list-theme-color': activeList.color || 'var(--color-accent-blue)' }}>
                <div className="lists-header__left">
                  <div className="lists-header__title-row">
                    <h1 className="lists-header__title">{activeList.name}</h1>
                  </div>
                  {activeList.description && (
                    <p className="lists-header__description">{activeList.description}</p>
                  )}
                  {activeList.created_at && (
                    <span className="lists-header__date">{createdLabel}</span>
                  )}
                </div>
                <div className="lists-header__right">
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
                  <div className="lists-content__loading">
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
                      const isAdult = item.is_adult || isScene;
                      const shouldBlur = isAdult && sessionMode !== 'nsfw';
                      const rawPosterUrl = item.poster_path ? resolveMediaImageUrl(item.poster_path, isScene ? 'backdrop' : 'poster') : null;
                      const posterUrl = (shouldBlur && rawPosterUrl)
                        ? `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(rawPosterUrl)}&blur=true`
                        : rawPosterUrl;

                      const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
                      const genderPref = settings?.adult_gender_preference;
                      const allPeople = item.people || [];
                      const filteredPeople = genderPref && genderPref !== 'all'
                        ? allPeople.filter(p => {
                          if (genderPref === 'female') return p.gender === 1;
                          if (genderPref === 'male') return p.gender === 2;
                          return true;
                        })
                        : allPeople;
                      const performers = filteredPeople.slice(0, 4);

                       return (
                        <div
                          key={item.id}
                          className={`lists-card ${isScene ? 'lists-card--scene' : 'lists-card--poster'}`}
                          onClick={() => handleCardClick(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCardClick(item);
                            }
                          }}
                        >
                          <div className={`lists-card__media ${shouldBlur ? 'is-blurred' : ''}`}>
                            {posterUrl ? (
                              <img
                                src={posterUrl}
                                alt={item.title}
                                className="lists-card__img"
                              />
                            ) : (
                              <div className="lists-card__placeholder" />
                            )}
                            {shouldBlur && (
                              <div className="recommend-card-blur-overlay">
                                <span className="settings-badge settings-badge--danger">
                                  {t('common.adult_badge', { defaultValue: '18+' })}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="lists-card__info">
                            <span className="lists-card__title">{item.title}</span>
                            <span className="lists-card__subtitle">
                              {isScene ? (
                                <div className="library-scene-card__subtitle-inner">
                                  <span className="library-scene-card__performers">
                                    {performers.map((p, idx) => (
                                      <span key={p.id}>
                                        {idx > 0 && ', '}
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          className="library-scene-card__performer-link"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/library/people/${p.id}`, { state: { allowAdult: true } });
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.stopPropagation();
                                              navigate(`/library/people/${p.id}`, { state: { allowAdult: true } });
                                            }
                                          }}
                                        >
                                          {p.name}
                                        </span>
                                      </span>
                                    ))}
                                  </span>
                                  {displayDate && <span className="library-scene-card__date">{displayDate}</span>}
                                </div>
                              ) : item.year}
                            </span>
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

      <ListsAddDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeList={activeList}
        addListItemMutation={addListItemMutation}
        activeListDetails={activeListDetails}
        t={t}
      />
    </Page>
  );
}

function ResultAddButton({ added, onAdd, onRemove }) {
  const [isHovered, setIsHovered] = useState(false);

  if (added) {
    return (
      <IconButton
        variant={isHovered ? 'danger' : 'ghost'}
        size="sm"
        onClick={onRemove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={!isHovered ? 'add-people-modal__activation-btn--active' : ''}
      >
        {isHovered ? <Minus size={16} /> : <Check size={16} />}
      </IconButton>
    );
  }

  return (
    <IconButton
      variant="secondary"
      size="sm"
      onClick={onAdd}
    >
      <Plus size={16} />
    </IconButton>
  );
}

function DrawerItemImage({ src, listType, isSceneItem, mediaType, itemMediaType }) {
  const [hasError, setHasError] = useState(!src);

  if (!src || hasError) {
    return (
      <div className="lists-drawer__item-media-placeholder">
        {listType === 'person' ? (
          <Users size={14} />
        ) : isSceneItem ? (
          <Film size={14} />
        ) : (mediaType === 'tv' || itemMediaType === 'tv') ? (
          <Tv size={14} />
        ) : (
          <Film size={14} />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setHasError(true)}
    />
  );
}

function ListsAddDrawer({ isOpen, onClose, activeList, addListItemMutation, activeListDetails, t }) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const isAdultActive = sessionMode === 'nsfw';
  const removeListItemMutation = useRemoveListItemMutation();

  const [query, setQuery] = useState('');
  const [source, setSource] = useState('library'); // 'library' or 'discover'
  const [mediaType, setMediaType] = useState('movie'); // 'movie', 'tv', 'scene'
  const [provider, setProvider] = useState('tmdb'); // 'tmdb', 'porndb', 'stashdb'
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('not_added'); // 'added', 'not_added'
  const { toast } = useUi();

  const [prevResetDeps, setPrevResetDeps] = useState(null);
  const resetDepsStr = `${isOpen}_${activeList?.id || ''}_${source}_${mediaType}_${isAdultActive}`;

  useEffect(() => {
    if (resetDepsStr === prevResetDeps) return;
    setPrevResetDeps(resetDepsStr);
    setQuery('');
    setResults([]);
    setPage(1);
    setHasMore(false);
    setStatusFilter('not_added');
    setProvider(mediaType === 'scene' ? 'porndb' : 'tmdb');
  }, [mediaType, prevResetDeps, resetDepsStr]);

  const handleSearch = useCallback(async (isNew = true) => {
    if (source === 'discover' && !query.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }

    const currentPage = isNew ? 1 : page + 1;
    if (isNew) {
      setSearching(true);
    } else {
      setLoadingMore(true);
    }

    try {
      if (activeList?.list_type === 'person') {
        if (source === 'library') {
          const limit = 20;
          const currentOffset = isNew ? 0 : (currentPage - 1) * limit;
          const res = await api.people.getAll({
            search: query.trim() || undefined,
            offset: currentOffset,
            limit,
            adult_only: isAdultActive,
            include_inactive: false
          });
          const newItems = res.items || res.results || res || [];
          setResults((prev) => isNew ? newItems : [...prev, ...newItems]);
          setHasMore(res.has_more || (newItems.length === limit));
          if (!isNew) setPage(currentPage);
        } else {
          const res = await api.metadata.globalSearch({
            query: query.trim(),
            source: isAdultActive ? provider : 'tmdb',
            searchType: 'person',
            includeAdult: isAdultActive
          });
          setResults(res.results || res || []);
          setHasMore(false);
        }
      } else {
        if (source === 'library') {
          const pageSize = 20;
          const res = await api.library.getItems({
            search: query.trim() || undefined,
            tab: mediaType === 'movie' ? 'movies' : mediaType === 'tv' ? 'tv' : 'scenes',
            page: currentPage,
            pageSize,
            include_adult: isAdultActive,
            filter_ownership: 'all'
          });
          const newItems = res.items || res.results || [];
          setResults((prev) => isNew ? newItems : [...prev, ...newItems]);
          setHasMore(res.page < res.total_pages);
          if (!isNew) setPage(currentPage);
        } else {
          const res = await api.metadata.globalSearch({
            query: query.trim(),
            source: isAdultActive ? provider : 'tmdb',
            searchType: mediaType === 'movie' ? 'movie' : mediaType === 'tv' ? 'tv' : 'scene',
            includeAdult: isAdultActive
          });
          setResults(res.results || res || []);
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  }, [query, source, mediaType, provider, isAdultActive, page, activeList]);

  useEffect(() => {
    if (!isOpen) return;

    const delayDebounceFn = setTimeout(() => {
      if (source === 'library' || query.trim()) {
        handleSearch(true);
      } else {
        setResults([]);
        setHasMore(false);
      }
    }, source === 'library' && !query.trim() ? 0 : 350);

    return () => clearTimeout(delayDebounceFn);
  }, [query, source, mediaType, provider, isOpen, isAdultActive, handleSearch]);

  if (!activeList) return null;
  const listType = activeList.list_type;

  const handleAdd = async (item) => {
    try {
      if (listType === 'person') {
        await addListItemMutation.mutateAsync({
          listId: activeList.id,
          payload: {
            person_id: item.id
          }
        });
      } else {
        const isTvItem = item.media_type === 'tv' || mediaType === 'tv';
        const isSceneItem = item.media_type === 'scene' || mediaType === 'scene';
        const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.profile_path);

        await addListItemMutation.mutateAsync({
          listId: activeList.id,
          payload: {
            media_item_id: (source === 'library' && !isTvItem) ? item.id : undefined,
            tmdb_id: (source === 'discover' || isTvItem) ? item.id : undefined,
            media_type: item.media_type || mediaType,
            provider: source === 'discover' ? (item.provider || provider) : undefined,
            title: item.title || item.name,
            poster_path: poster,
            year: item.year ? parseInt(item.year, 10) : undefined
          }
        });
      }
      toast(t('lists.item_added_success') || 'Item added successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to add item', 'danger');
    }
  };

  const getListItem = (item) => {
    if (!activeListDetails || !activeListDetails.items) return null;
    return activeListDetails.items.find((i) => {
      if (listType === 'person') {
        return i.person_id === item.id;
      } else {
        if (item.id && i.media_item_id === item.id) return true;
        
        const cleanTmdbId = typeof item.id === 'string' && item.id.startsWith('tmdb_')
          ? parseInt(item.id.replace('tmdb_', ''), 10)
          : item.tmdb_id || (typeof item.id === 'number' ? item.id : null);
        
        if (cleanTmdbId && i.tmdb_id === cleanTmdbId) return true;
        
        const cleanExternalId = typeof item.id === 'string' && item.id.startsWith('stash_')
          ? item.id.replace('stash_', '')
          : item.id;
          
        if (cleanExternalId && i.external_id === cleanExternalId) return true;
        
        return false;
      }
    });
  };

  const isAdded = (item) => !!getListItem(item);

  const handleRemove = async (item) => {
    const listItem = getListItem(item);
    if (!listItem) return;
    try {
      await removeListItemMutation.mutateAsync({
        listId: activeList.id,
        itemId: listItem.id
      });
      toast('Item removed from list', 'success');
    } catch (err) {
      toast(err.message || 'Failed to remove item', 'danger');
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40 && hasMore && !loadingMore && !searching) {
      handleSearch(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="ui-drawer-backdrop" onClick={onClose} role="presentation" />
      <div className="ui-drawer ui-drawer--lg lists-drawer">
        <div className="lists-drawer__header">
          <h3>{listType === 'person' ? (t('lists.add_people_title') || 'Add People') : (t('lists.add_titles_title') || 'Add Titles')}</h3>
          <button className="lists-drawer__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="lists-drawer__search-area">
          <SegmentedControl
            options={[
              { label: 'My Library', value: 'library' },
              { label: isAdultActive ? 'Discover (Online)' : 'Discover (TMDB)', value: 'discover' }
            ]}
            value={source}
            onChange={(val) => {
              setSource(val);
              if (val === 'discover') {
                if (mediaType === 'scene') {
                  if (isAdultActive) {
                    setProvider('porndb');
                  } else {
                    setMediaType('movie');
                    setProvider('tmdb');
                  }
                } else {
                  setProvider('tmdb');
                }
              }
              setResults([]);
            }}
          />

          {listType === 'media' && (
            <SegmentedControl
              options={[
                { label: 'Movies', value: 'movie' },
                { label: 'TV Shows', value: 'tv' },
                ...(isAdultActive ? [{ label: 'Scenes', value: 'scene' }] : [])
              ]}
              value={mediaType}
              onChange={(val) => {
                setMediaType(val);
                if (val === 'scene') {
                  setProvider('porndb');
                } else {
                  setProvider('tmdb');
                }
                setResults([]);
              }}
            />
          )}

          {isAdultActive && source === 'discover' && (mediaType === 'movie' || mediaType === 'scene' || listType === 'person') && (
            <SegmentedControl
              options={
                listType === 'person' ? [
                  { label: 'TMDB', value: 'tmdb' },
                  { label: 'ThePornDB', value: 'porndb' },
                  { label: 'StashDB', value: 'stashdb' },
                  { label: 'FansDB', value: 'fansdb' }
                ] : mediaType === 'scene' ? [
                  { label: 'ThePornDB', value: 'porndb' },
                  { label: 'StashDB', value: 'stashdb' },
                  { label: 'FansDB', value: 'fansdb' }
                ] : [
                  { label: 'TMDB', value: 'tmdb' },
                  { label: 'ThePornDB', value: 'porndb' }
                ]
              }
              value={provider}
              onChange={(val) => {
                setProvider(val);
                setResults([]);
              }}
            />
          )}

          {source === 'library' && (
            <SegmentedControl
              options={[
                { label: 'Not in List', value: 'not_added' },
                { label: 'In List', value: 'added' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          )}

          <div className="lists-drawer__search-input-wrap">
            <Search size={16} className="lists-drawer__search-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={listType === 'person' ? 'Search performers...' : 'Search movies, series...'}
            />
          </div>
        </div>

        <div className="lists-drawer__results" onScroll={handleScroll}>
          {searching && (
            <div className="lists-drawer__loader">
              <Loader2 className="spinner" size={24} />
            </div>
          )}

          {!searching && results.length === 0 && query && (
            <div className="lists-drawer__empty">
              {t('lists.no_results', { defaultValue: 'No results found.' })}
            </div>
          )}

          {!searching && results.length > 0 && results.filter((item) => {
            if (source === 'discover') return true;
            const added = isAdded(item);
            if (statusFilter === 'added') return added;
            if (statusFilter === 'not_added') return !added;
            return true;
          }).length === 0 && (
              <div className="lists-drawer__empty">
                {t('lists.no_status_match', { defaultValue: 'No items match the selected status filter.' })}
              </div>
            )}

          {!searching && results.filter((item) => {
            if (source === 'discover') return true;
            const added = isAdded(item);
            if (statusFilter === 'added') return added;
            if (statusFilter === 'not_added') return !added;
            return true;
          }).map((item) => {
            const added = isAdded(item);
            const title = item.title || item.name;
            const subtitle = listType === 'person' ? (item.role || 'Actor') : (item.year || item.media_type || mediaType);
            const isSceneItem = item.media_type === 'scene' || mediaType === 'scene';
            const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.profile_path);
            const imageSize = listType === 'person' ? 'person' : (isSceneItem ? 'backdrop' : 'poster');

            return (
              <div key={item.id} className={`lists-drawer__item ${isSceneItem ? 'lists-drawer__item--scene' : ''}`}>
                <div className="lists-drawer__item-media">
                  <DrawerItemImage
                    src={poster ? resolveMediaImageUrl(poster, imageSize) : ''}
                    listType={listType}
                    isSceneItem={isSceneItem}
                    mediaType={mediaType}
                    itemMediaType={item.media_type}
                  />
                </div>
                <div className="lists-drawer__item-info">
                  <span className="lists-drawer__item-title">{title}</span>
                  <span className="lists-drawer__item-subtitle">{subtitle}</span>
                </div>
                <ResultAddButton
                  added={added}
                  onAdd={() => handleAdd(item)}
                  onRemove={() => handleRemove(item)}
                />
              </div>
            );
          })}

          {loadingMore && (
            <div className="lists-drawer__loader lists-drawer__loader--small">
              <Loader2 className="spinner" size={20} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

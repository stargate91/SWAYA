import { useState, useEffect, useCallback } from 'react';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { useRemoveListItemMutation } from '@/queries';
import { useUi } from '@/providers/UiProvider';
import api from '@/lib/api';

export default function useListsAddDrawer({
  isOpen,
  activeList,
  addListItemMutation,
  activeListDetails,
  t,
}) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const [isAdultActive, setIsAdultActive] = useState(sessionMode === 'nsfw');

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevSessionMode, setPrevSessionMode] = useState(sessionMode);
  const [prevActiveListId, setPrevActiveListId] = useState(null);

  if (isOpen !== prevIsOpen || sessionMode !== prevSessionMode || (activeList && activeList.id !== prevActiveListId)) {
    setPrevIsOpen(isOpen);
    setPrevSessionMode(sessionMode);
    if (activeList) {
      setPrevActiveListId(activeList.id);
    }
    if (isOpen) {
      setIsAdultActive(sessionMode === 'nsfw');
      if (activeList) {
        setMediaType(activeList.list_type === 'video_scene' ? 'scene' : 'movie');
      }
    }
  }

  const toggleAdultMode = () => {
    setIsAdultActive((prev) => !prev);
  };

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

  if (resetDepsStr !== prevResetDeps) {
    setPrevResetDeps(resetDepsStr);
    setQuery('');
    setResults([]);
    setPage(1);
    setHasMore(false);
    setStatusFilter('not_added');
    setProvider(mediaType === 'scene' ? 'porndb' : 'tmdb');
  }

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
            tab: mediaType === 'movie' ? 'movies' : mediaType === 'tv' ? 'tv' : mediaType === 'videos' ? 'videos' : 'scenes',
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

  const listType = activeList?.list_type;

  const handleAdd = async (item) => {
    try {
      let result;
      if (listType === 'person') {
        result = await addListItemMutation.mutateAsync({
          listId: activeList.id,
          payload: {
            person_id: item.id
          }
        });
      } else {
        const isTvItem = item.media_type === 'tv' || mediaType === 'tv';
        const isSceneItem = item.media_type === 'scene' || mediaType === 'scene' || item.media_type === 'video' || mediaType === 'video' || item.media_type === 'videos' || mediaType === 'videos';
        const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.profile_path);

        result = await addListItemMutation.mutateAsync({
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
      if (result?.already_exists) {
        toast(t('lists.item_already_exists') || 'Item is already on this list', 'warning');
      } else {
        toast(t('lists.item_added_success') || 'Item added successfully!', 'success');
      }
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
      toast(t('lists.item_removed_success') || 'Item removed from list', 'success');
    } catch (err) {
      toast(err.message || t('lists.remove_item_failed') || 'Failed to remove item', 'danger');
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40 && hasMore && !loadingMore && !searching) {
      handleSearch(false);
    }
  };

  return {
    query,
    setQuery,
    source,
    setSource,
    mediaType,
    setMediaType,
    provider,
    setProvider,
    results,
    setResults,
    searching,
    loadingMore,
    statusFilter,
    setStatusFilter,
    isAdultActive,
    toggleAdultMode,
    handleAdd,
    handleRemove,
    isAdded,
    handleScroll,
  };
}

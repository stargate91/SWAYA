import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export function useListsPage() {
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [activeListDetails, setActiveListDetails] = useState(null);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLists = useCallback(async (selectId = null) => {
    setLoadingLists(true);
    try {
      const data = await api.lists.getLists();
      setLists(data || []);
      if (data && data.length > 0) {
        if (selectId) {
          setActiveListId(selectId);
        } else {
          setActiveListId((prev) => {
            if (prev && data.some((l) => l.id === prev)) return prev;
            const watchlist = data.find((l) => l.is_watchlist);
            return watchlist ? watchlist.id : data[0].id;
          });
        }
      } else {
        setActiveListId(null);
        setActiveListDetails(null);
      }
    } catch (e) {
      console.error('Failed to fetch lists:', e);
    } finally {
      setLoadingLists(false);
    }
  }, []);

  const fetchListDetails = useCallback(async (listId) => {
    if (!listId) return;
    setLoadingDetails(true);
    try {
      const details = await api.lists.getListDetails(listId);
      if (details && details.id === listId) {
        setActiveListDetails(details);
      }
    } catch (e) {
      console.error('Failed to fetch list details:', e);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLists();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLists]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeListId) {
        fetchListDetails(activeListId);
      } else {
        setActiveListDetails(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeListId, fetchListDetails]);

  const handleCreateList = async ({ name, description, color, list_type }) => {
    try {
      const newList = await api.lists.createList({ name, description, color, list_type });
      await fetchLists(newList.id);
      return newList;
    } catch (e) {
      console.error('Failed to create list:', e);
      throw e;
    }
  };

  const handleUpdateList = async (listId, { name, description, color }) => {
    try {
      const updated = await api.lists.updateList(listId, { name, description, color });
      await fetchLists(listId);
      return updated;
    } catch (e) {
      console.error('Failed to update list:', e);
      throw e;
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      await api.lists.deleteList(listId);
      await fetchLists();
    } catch (e) {
      console.error('Failed to delete list:', e);
      throw e;
    }
  };

  const handleRemoveItem = async (listId, itemId) => {
    try {
      await api.lists.removeFromList(listId, itemId);
      setActiveListDetails((prev) => {
        if (!prev || prev.id !== listId) return prev;
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        };
      });
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, item_count: Math.max(0, l.item_count - 1) } : l))
      );
    } catch (e) {
      console.error('Failed to remove item:', e);
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

  const handleImportList = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !data.name) return;

      const created = await api.lists.createList({
        name: `${data.name} (Imported)`,
        description: data.description || 'Imported list',
        color: data.color || '#3b82f6',
      });

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.tmdb_id) {
            await api.lists.addToList(created.id, {
              tmdb_id: item.tmdb_id,
              media_type: item.media_type || 'movie',
            });
          }
        }
      }

      await fetchLists(created.id);
    } catch (e) {
      console.error('Failed to import list:', e);
    }
  };

  return {
    lists,
    activeListId,
    setActiveListId,
    activeListDetails,
    loadingLists,
    loadingDetails,
    searchQuery,
    setSearchQuery,
    handleCreateList,
    handleUpdateList,
    handleDeleteList,
    handleRemoveItem,
    handleExportList,
    handleImportList,
  };
}

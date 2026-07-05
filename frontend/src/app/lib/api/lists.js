import { fetchJson } from '../http';
import { API_BASE } from '../backend';

export const lists = {
  getLists: () => fetchJson('/api/lists'),
  createList: (payload) => fetchJson('/api/lists', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateList: (listId, payload) => fetchJson(`/api/lists/${listId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteList: (listId) => fetchJson(`/api/lists/${listId}`, {
    method: 'DELETE',
  }),
  getListDetails: (listId) => fetchJson(`/api/lists/${listId}`),
  addToList: (listId, payload) => fetchJson(`/api/lists/${listId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  removeFromList: (listId, itemId) => fetchJson(`/api/lists/${listId}/items/${itemId}`, {
    method: 'DELETE',
  }),
  uploadListImage: (listId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/api/v1/lists/${listId}/upload-image`, {
      method: 'POST',
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to upload list image');
      return data;
    });
  },
  overrideListImage: (listId, path) => fetchJson(`/api/lists/${listId}/image`, {
    method: 'POST',
    body: JSON.stringify({ path }),
  }),
  getItemMembership: (itemId) => fetchJson(`/api/lists/item-membership/${itemId}`),
};


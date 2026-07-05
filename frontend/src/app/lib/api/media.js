import { fetchJson } from '../http';
import { normalizeMediaType } from '../mediaTypes';
import { API_BASE } from '../backend';

export const media = {
  preview: (filePath) => fetchJson('/api/media/preview', {
    method: 'POST',
    body: JSON.stringify({ file_path: filePath }),
  }),
  update: (payload) => fetchJson('/api/media/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  bulkUpdate: (payload) => fetchJson('/api/media/bulk-update', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateStatus: (itemId, payload) => {
    const normalizedPayload = { ...payload };
    if (normalizedPayload.media_type) {
      normalizedPayload.media_type = normalizeMediaType(
        normalizedPayload.media_type,
        normalizedPayload.media_type,
      );
    }
    return fetchJson(`/api/item/${itemId}/status`, {
      method: 'POST',
      body: JSON.stringify(normalizedPayload),
    });
  },
  play: (itemId) => fetchJson('/api/media/play', {
    method: 'POST',
    body: JSON.stringify({ item_id: String(itemId) }),
  }),
  activeSessions: () => fetchJson('/api/media/active-sessions'),
  resetProgress: (itemId) => fetchJson(`/api/library/item/${itemId}/reset-progress`, {

    method: 'POST',
  }),
  bulkWatched: (itemIds, isWatched) => fetchJson('/api/media/bulk-watched', {
    method: 'POST',
    body: JSON.stringify({ item_ids: itemIds, is_watched: isWatched }),
  }),
  addPeak: (itemId) => fetchJson(`/api/library/item/${itemId}/peaks`, {
    method: 'POST',
  }),
  deletePeak: (itemId, logId) => fetchJson(`/api/library/item/${itemId}/peaks/${logId}`, {
    method: 'DELETE',
  }),
  overrideBackdrop: (itemId, backdropPath, mediaType) => fetchJson(`/api/item/${itemId}/backdrop`, {
    method: 'POST',
    body: JSON.stringify({ backdrop_path: backdropPath, media_type: mediaType }),
  }),
  overridePoster: (itemId, posterPath, mediaType) => fetchJson(`/api/item/${itemId}/poster`, {
    method: 'POST',
    body: JSON.stringify({ poster_path: posterPath, media_type: mediaType }),
  }),
  uploadPoster: (itemId, file, mediaType) => {
    const formData = new FormData();
    formData.append('file', file);
    if (mediaType) {
      formData.append('media_type', mediaType);
    }
    return fetch(`${API_BASE}/api/v1/item/${itemId}/upload-poster`, {
      method: 'POST',
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to upload poster');
      return data;
    });
  },
  uploadBackdrop: (itemId, file, mediaType) => {
    const formData = new FormData();
    formData.append('file', file);
    if (mediaType) {
      formData.append('media_type', mediaType);
    }
    return fetch(`${API_BASE}/api/v1/item/${itemId}/upload-backdrop`, {
      method: 'POST',
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to upload backdrop');
      return data;
    });
  },
  overrideLogo: (itemId, logoPath, mediaType) => fetchJson(`/api/item/${itemId}/logo`, {
    method: 'POST',
    body: JSON.stringify({ logo_path: logoPath, media_type: mediaType }),
  }),
  uploadLogo: (itemId, file, mediaType) => {
    const formData = new FormData();
    formData.append('file', file);
    if (mediaType) {
      formData.append('media_type', mediaType);
    }
    return fetch(`${API_BASE}/api/v1/item/${itemId}/upload-logo`, {
      method: 'POST',
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to upload logo');
      return data;
    });
  },
  trackItem: (tmdbId, mediaType) => {
    let itemId = String(tmdbId);
    if (!itemId.startsWith('tmdb_') && !itemId.startsWith('stash_') && !itemId.startsWith('porndb_') && !itemId.startsWith('fansdb_')) {
      const prefix = (mediaType === 'scene' || mediaType === 'stash') ? 'stash_' : 'tmdb_';
      itemId = `${prefix}${itemId}`;
    }
    const url = mediaType ? `/api/library/item/${itemId}/track?media_type=${mediaType}` : `/api/library/item/${itemId}/track`;
    return fetchJson(url, {
      method: 'POST',
    });
  },
  untrackItem: (tmdbId, mediaType) => {
    let itemId = String(tmdbId);
    if (!itemId.startsWith('tmdb_') && !itemId.startsWith('stash_') && !itemId.startsWith('porndb_') && !itemId.startsWith('fansdb_')) {
      const prefix = (mediaType === 'scene' || mediaType === 'stash') ? 'stash_' : 'tmdb_';
      itemId = `${prefix}${itemId}`;
    }
    const url = mediaType ? `/api/library/item/${itemId}/untrack?media_type=${mediaType}` : `/api/library/item/${itemId}/untrack`;
    return fetchJson(url, {
      method: 'POST',
    });
  },
};

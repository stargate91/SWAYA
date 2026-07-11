import { fetchJson } from '../http';

export const scan = {
  getStatus: () => fetchJson('/api/scan-status'),
  start: (payload) => fetchJson('/api/scan', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  retry: (payload) => fetchJson('/api/scan/retry', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

export const image = {
  getStatus: () => fetchJson('/api/image-status'),
};

export const hydrate = {
  getStatus: () => fetchJson('/api/hydrate-status'),
};

export const organizer = {
  get: ({ scanMode, sessionMode } = {}) => {
    const params = new URLSearchParams();
    if (scanMode) params.append('scan_mode', scanMode);
    if (sessionMode) params.append('session_mode', sessionMode);
    return fetchJson(`/api/organizer${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getCount: ({ scanMode, sessionMode } = {}) => {
    const params = new URLSearchParams();
    if (scanMode) params.append('scan_mode', scanMode);
    if (sessionMode) params.append('session_mode', sessionMode);
    return fetchJson(`/api/organizer/count${params.toString() ? `?${params.toString()}` : ''}`);
  },
  delete: (payload) => fetchJson('/api/organizer/delete', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

export const task = {
  stop: () => fetchJson('/api/task/stop', { method: 'POST' }),
};

export const history = {
  get: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetchJson(`/api/history?${searchParams.toString()}`);
  },
  getWatched: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetchJson(`/api/library/watched-history?${searchParams.toString()}`);
  },
  getPeaks: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetchJson(`/api/history/peaks-decorated?${searchParams.toString()}`);
  },
};

export const tv = {
  getSeasons: (tvId, { language = 'en-US' } = {}) => fetchJson(`/api/metadata/tv/${tvId}/seasons?language=${language}`),
  getEpisodes: (tvId, seasonNumber, { language = 'en-US' } = {}) => fetchJson(`/api/metadata/tv/${tvId}/season/${seasonNumber}/episodes?language=${language}`),
};

export const tags = {
  getAll: (targetType, isAdult) => {
    let tType = targetType;
    let adult = isAdult;
    if (typeof targetType === 'boolean') {
      adult = targetType;
      tType = undefined;
    }
    const params = new URLSearchParams();
    if (tType) params.append('target_type', tType);
    if (adult !== undefined) params.append('is_adult', String(adult));
    return fetchJson(`/api/tags?${params.toString()}`);
  },
  create: (payload) => fetchJson('/api/tags', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (tagId, payload) => fetchJson(`/api/tags/${tagId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  delete: (tagId) => fetchJson(`/api/tags/${tagId}`, {
    method: 'DELETE',
  }),
};

export const rename = {
  start: (payload) => fetchJson('/api/rename/start', {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : undefined,
  }),
  undo: (batchId) => fetchJson(`/api/rename/undo/${batchId}`, {
    method: 'POST',
  }),
};

export const recommendations = {
  get: (language, includeAdult) => {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    if (includeAdult !== undefined) params.append('include_adult', includeAdult);
    return fetchJson(`/api/recommendations?${params.toString()}`);
  },
  getRecentlyAdded: (page, limit, includeAdult, language) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (includeAdult !== undefined) params.append('include_adult', includeAdult);
    if (language) params.append('language', language);
    return fetchJson(`/api/recommendations/recently-added?${params.toString()}`);
  },
  getRecentlyActivatedPeople: (page, limit, includeAdult) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (includeAdult !== undefined) params.append('include_adult', includeAdult);
    return fetchJson(`/api/recommendations/recently-activated-people?${params.toString()}`);
  },
  addToWatchlist: ({ tmdbId, mediaItemId, type }) => fetchJson('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify({ tmdb_id: tmdbId, media_item_id: mediaItemId, type }),
  }),
  removeFromWatchlist: (tmdbId) => fetchJson(`/api/watchlist/${tmdbId}`, {
    method: 'DELETE',
  }),
};

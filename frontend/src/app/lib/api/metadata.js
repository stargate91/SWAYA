import { fetchJson } from '../http';

export const metadata = {
  globalSearch: ({ query, source, searchType, includeAdult, page }) => {
    const params = new URLSearchParams({
      query: query.trim(),
      source: source || 'tmdb',
      search_type: searchType || 'all',
    });
    if (includeAdult !== undefined && includeAdult !== null) {
      params.set('include_adult', includeAdult ? 'true' : 'false');
    }
    if (page !== undefined && page !== null) {
      params.set('page', String(page));
    }
    return fetchJson(`/api/metadata/search/global?${params.toString()}`);
  },
  search: ({ query, itemType, year, season, episode, includeAdult, provider }) => {
    const params = new URLSearchParams({
      query: query.trim(),
      item_type: itemType,
    });
    if (year?.trim()) {
      params.set('year', year.trim());
    }
    if (season?.trim()) {
      params.set('season', season.trim());
    }
    if (episode?.trim()) {
      params.set('episode', episode.trim());
    }
    if (includeAdult !== undefined && includeAdult !== null) {
      params.set('include_adult', includeAdult ? 'true' : 'false');
    }
    if (provider) {
      params.set('provider', provider);
    }
    return fetchJson(`/api/metadata/search?${params.toString()}`);
  },
  resolve: (payload) => fetchJson('/api/metadata/resolve', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  bulkResolve: (payload) => fetchJson('/api/metadata/bulk-resolve', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getItemFullMetadata: (itemId, mediaType, { language } = {}) => {
    const params = new URLSearchParams();
    if (mediaType) params.append('media_type', mediaType);
    if (language) params.append('language', language);
    const query = params.toString();
    return fetchJson(`/api/metadata/item/${itemId}/full-metadata${query ? `?${query}` : ''}`);
  },
  syncLanguage: () => fetchJson('/api/metadata/sync-language', {
    method: 'POST',
  }),
  refresh: (payload) => fetchJson('/api/metadata/refresh', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getRefreshStatus: ({ targetType, targetId, language } = {}) => {
    const params = new URLSearchParams();
    if (targetType) params.append('target_type', targetType);
    if (targetId !== undefined && targetId !== null) params.append('target_id', String(targetId));
    if (language) params.append('language', language);
    return fetchJson(`/api/metadata/refresh-status?${params.toString()}`);
  },
};

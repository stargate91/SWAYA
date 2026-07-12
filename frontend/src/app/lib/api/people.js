import { fetchJson } from '../http';
import { API_BASE } from '../backend';

export const people = {
  getDetail: (personId) => fetchJson(`/api/people/${personId}`),
  getCredits: (personId, mediaType, { page, pageSize, excludeKnownFor, source, local_only } = {}) => {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (pageSize) params.append('page_size', String(pageSize));
    if (excludeKnownFor !== undefined) params.append('exclude_known_for', String(excludeKnownFor));
    if (source) params.append('source', String(source));
    if (local_only !== undefined) params.append('local_only', String(local_only));
    return fetchJson(`/api/people/${personId}/${mediaType}?${params.toString()}`);
  },
  getCreditBackdrops: (personId, tmdbId, mediaType) => {
    const params = new URLSearchParams({
      tmdb_id: String(tmdbId),
      media_type: String(mediaType || 'movie'),
    });
    return fetchJson(`/api/people/${personId}/credit-backdrops?${params.toString()}`);
  },
  getAll: ({ search, role, sortBy, sort_by, gender, include_inactive, adult_only, offset, limit } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    
    const activeSort = sort_by || sortBy;
    if (activeSort) params.append('sort_by', activeSort);
    if (gender) params.append('gender', gender);
    
    if (include_inactive !== undefined) params.append('include_inactive', String(include_inactive));
    if (adult_only !== undefined) params.append('adult_only', String(adult_only));
    if (offset !== undefined) params.append('offset', String(offset));
    if (limit !== undefined) params.append('limit', String(limit));
    return fetchJson(`/api/people?${params.toString()}`);
  },
  getList: ({ search, role, sortBy, sort_by, gender, include_inactive, adult_only, page = 1, pageSize = 20 } = {}) => {
    const limit = pageSize;
    const offset = (page - 1) * limit;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    
    const activeSort = sort_by || sortBy;
    if (activeSort) params.append('sort_by', activeSort);
    if (gender) params.append('gender', gender);
    
    if (include_inactive !== undefined) params.append('include_inactive', String(include_inactive));
    if (adult_only !== undefined) params.append('adult_only', String(adult_only));
    params.append('offset', String(offset));
    params.append('limit', String(limit));

    return fetchJson(`/api/people?${params.toString()}`).then((data) => {
      const totalPages = Math.ceil((data.total || 0) / limit);
      return {
        ...data,
        page,
        total_pages: totalPages,
      };
    });
  },
  updateStatus: (personId, payload) => fetchJson(`/api/people/${personId}/status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  overrideProfile: (personId, profilePath) => fetchJson(`/api/people/${personId}/profile`, {
    method: 'POST',
    body: JSON.stringify({ profile_path: profilePath }),
  }),
  overrideBackdrop: (personId, backdropPath) => fetchJson(`/api/people/${personId}/backdrop`, {
    method: 'POST',
    body: JSON.stringify({ backdrop_path: backdropPath }),
  }),
  uploadProfile: (personId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/api/v1/people/${personId}/upload-profile`, {
      method: 'POST',
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to upload image');
      return data;
    });
  },
  uploadBackdrop: (personId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/api/v1/people/${personId}/upload-backdrop`, {
      method: 'POST',
      body: formData,
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to upload image');
      return data;
    });
  },
  linkSource: (personId, source, externalId, overrides, profileUrl) => fetchJson(`/api/people/${personId}/link`, {
    method: 'POST',
    body: JSON.stringify({
      source: source === 'theporndb' ? 'porndb' : source,
      external_id: externalId,
      overrides,
      profile_url: profileUrl
    }),
  }),
  linkSourcePreview: (personId, source, externalId) => fetchJson(`/api/people/${personId}/link/preview?source=${source === 'theporndb' ? 'porndb' : source}&external_id=${externalId}`),
  unlinkSource: (personId, source, action) => fetchJson(`/api/people/${personId}/unlink`, {
    method: 'POST',
    body: JSON.stringify({ source: source === 'theporndb' ? 'porndb' : source, action }),
  }),
  setPrimarySource: (personId, source) => fetchJson(`/api/people/${personId}/primary`, {
    method: 'POST',
    body: JSON.stringify({ source: source === 'theporndb' ? 'porndb' : source }),
  }),
  setFieldRouting: (personId, routing) => fetchJson(`/api/people/${personId}/field-routing`, {
    method: 'POST',
    body: JSON.stringify({ routing }),
  }),
  saveCustomFields: (personId, fields) => fetchJson(`/api/people/${personId}/custom-fields`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  }),
  scrapeHealthyCeleb: (personId, url) => {
    const params = new URLSearchParams();
    if (url) params.append('url', url);
    return fetchJson(`/api/people/${personId}/scrape-healthyceleb?${params.toString()}`, {
      method: 'POST',
    });
  },
  delete: (personId) => fetchJson(`/api/people/${personId}`, {
    method: 'DELETE',
  }),
  searchTmdb: (query, { language, adultOnly, page, source } = {}) => {
    const params = new URLSearchParams({ query });
    if (language) params.append('language', language);
    if (adultOnly !== undefined) params.append('adult_only', String(adultOnly));
    if (page) params.append('page', String(page));
    if (source) params.append('source', source);
    return fetchJson(`/api/people/search-tmdb?${params.toString()}`);
  },
  addFromTmdb: (payload) => {
    const body = typeof payload === 'object' ? payload : { tmdb_id: payload };
    return fetchJson('/api/people/add-tmdb', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  getEnrichmentStatus: () => fetchJson('/api/people/enrichment-status'),
};

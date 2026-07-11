import { fetchJson } from '../http';

export const library = {
  getStats: ({ include_adult } = {}) => {
    const params = new URLSearchParams();
    if (include_adult !== undefined) params.append('include_adult', String(include_adult));
    return fetchJson(`/api/library/stats?${params.toString()}`);
  },
  getContinueWatching: ({ limit, include_adult } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    if (include_adult !== undefined) params.append('include_adult', String(include_adult));
    return fetchJson(`/api/library/continue-watching?${params.toString()}`);
  },
  getItems: ({ tab, page, pageSize, search, sortBy, filter_ownership, filter_watched, selected_genre, people_role, filter_gender, filter_favorite, selected_decade, selected_year, include_adult, selected_performer_id, selected_studio_id, filter_hair_color, filter_ethnicity, filter_eye_color, filter_tattoos, filter_piercings, filter_breast_type, filter_butt_shape, filter_butt_size, selected_tags }, options = {}) => {
    const params = new URLSearchParams();
    if (tab) params.append('tab', tab);
    if (include_adult !== undefined) params.append('include_adult', String(include_adult));
    if (page) params.append('page', page);
    if (pageSize) params.append('page_size', pageSize);
    if (search) params.append('search', search);
    if (sortBy) params.append('sort_by', sortBy);
    if (filter_ownership) params.append('filter_ownership', filter_ownership);
    if (filter_watched) params.append('filter_watched', filter_watched);
    if (selected_genre) params.append('selected_genre', selected_genre);
    if (people_role) params.append('people_role', people_role);
    if (filter_gender) params.append('filter_gender', filter_gender);
    if (filter_favorite) params.append('filter_favorite', filter_favorite);
    if (selected_decade) params.append('selected_decade', selected_decade);
    if (selected_year) params.append('selected_year', selected_year);
    if (selected_performer_id) params.append('selected_performer_id', selected_performer_id);
    if (selected_studio_id) params.append('selected_studio_id', selected_studio_id);
    if (filter_hair_color) params.append('filter_hair_color', filter_hair_color);
    if (filter_ethnicity) params.append('filter_ethnicity', filter_ethnicity);
    if (filter_eye_color) params.append('filter_eye_color', filter_eye_color);
    if (filter_tattoos) params.append('filter_tattoos', filter_tattoos);
    if (filter_piercings) params.append('filter_piercings', filter_piercings);
    if (filter_breast_type) params.append('filter_breast_type', filter_breast_type);
    if (filter_butt_shape) params.append('filter_butt_shape', filter_butt_shape);
    if (filter_butt_size) params.append('filter_butt_size', filter_butt_size);
    if (selected_tags) params.append('selected_tags', selected_tags);
    return fetchJson(`/api/library?${params.toString()}`, options);
  },
  getFilters: (filterParams, options = {}) => {
    const params = new URLSearchParams();
    if (filterParams) {
      for (const key in filterParams) {
        if (filterParams[key] !== undefined && filterParams[key] !== null) {
          params.append(key, String(filterParams[key]));
        }
      }
    }
    return fetchJson(`/api/library/filters?${params.toString()}`, options);
  },
  getCollections: ({ page, pageSize, search, tab, include_adult }, options = {}) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (pageSize) params.append('page_size', pageSize);
    if (search) params.append('search', search);
    if (tab) params.append('tab', tab);
    if (include_adult !== undefined) params.append('include_adult', String(include_adult));
    return fetchJson(`/api/library/collections?${params.toString()}`, options);
  },
  getTags: (isAdult) => {
    const params = new URLSearchParams();
    if (isAdult !== undefined) params.append('is_adult', String(isAdult));
    return fetchJson(`/api/library/tags?${params.toString()}`);
  },
  getItemDetail: (itemId, { fullPeople = false, mediaType = null } = {}) => {
    const params = new URLSearchParams();
    if (fullPeople) params.append('full_people', 'true');
    if (mediaType) params.append('media_type', mediaType);
    const query = params.toString();
    return fetchJson(`/api/library/item/${itemId}${query ? `?${query}` : ''}`);
  },
  getTvDetail: (tvId, { seasonsLimit = 5, initialEpisodesLimit = 4, language } = {}) => {
    const params = new URLSearchParams();
    if (seasonsLimit) params.append('seasons_limit', String(seasonsLimit));
    if (initialEpisodesLimit !== undefined && initialEpisodesLimit !== null) params.append('initial_episodes_limit', String(initialEpisodesLimit));
    if (language) params.append('language', language);
    return fetchJson(`/api/library/tv/${tvId}${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getTvSeasonDetail: (tvId, seasonNumber) => fetchJson(`/api/library/tv/${tvId}/season/${seasonNumber}`),
  getCollectionDetail: (collectionId, { language } = {}) => {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    return fetchJson(`/api/library/collection/${collectionId}${params.toString() ? `?${params.toString()}` : ''}`);
  },
};

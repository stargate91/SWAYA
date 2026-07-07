export const LIBRARY_TABS = Object.freeze({
  MOVIES: 'movies',
  TV: 'tv',
  COLLECTIONS: 'collections',
  PEOPLE: 'people',
  TAGS: 'tags',
  SCENES: 'scenes',
  VIDEOS: 'videos',
});

const LIBRARY_TAB_ALIASES = Object.freeze({
  movies: LIBRARY_TABS.MOVIES,
  adult: LIBRARY_TABS.MOVIES,
  tv: LIBRARY_TABS.TV,
  adult_tv: LIBRARY_TABS.TV,
  collections: LIBRARY_TABS.COLLECTIONS,
  adult_collections: LIBRARY_TABS.COLLECTIONS,
  people: LIBRARY_TABS.PEOPLE,
  adult_people: LIBRARY_TABS.PEOPLE,
  tags: LIBRARY_TABS.TAGS,
  scenes: LIBRARY_TABS.SCENES,
  adult_scenes: LIBRARY_TABS.SCENES,
  videos: LIBRARY_TABS.VIDEOS,
  adult_videos: LIBRARY_TABS.VIDEOS,
});

export const normalizeLibraryTab = (value, fallback = null) => {
  const normalized = LIBRARY_TAB_ALIASES[String(value || '').trim().toLowerCase()];
  if (normalized) {
    return normalized;
  }
  if (fallback == null) {
    return null;
  }
  return normalizeLibraryTab(fallback, null);
};

export const isLibraryMovieTab = (value) => normalizeLibraryTab(value) === LIBRARY_TABS.MOVIES;

export const isLibraryTvTab = (value) => normalizeLibraryTab(value) === LIBRARY_TABS.TV;

export const isLibraryCollectionTab = (value) => normalizeLibraryTab(value) === LIBRARY_TABS.COLLECTIONS;

export const isLibraryPeopleTab = (value) => normalizeLibraryTab(value) === LIBRARY_TABS.PEOPLE;

export const isLibraryTagsTab = (value) => normalizeLibraryTab(value) === LIBRARY_TABS.TAGS;

export const isLibraryScenesTab = (value) => {
  const normalized = normalizeLibraryTab(value);
  return normalized === LIBRARY_TABS.SCENES || normalized === LIBRARY_TABS.VIDEOS;
};

export const isLibraryVideosTab = (value) => normalizeLibraryTab(value) === LIBRARY_TABS.VIDEOS;

export const isLibraryVideoTab = (value) => (
  isLibraryMovieTab(value) || isLibraryTvTab(value) || isLibraryScenesTab(value) || isLibraryVideosTab(value)
);

export const resolveLibraryBackendTab = (value, sessionMode) => {
  const normalized = normalizeLibraryTab(value, value);
  if (sessionMode !== 'nsfw') {
    return normalized;
  }
  if (normalized === LIBRARY_TABS.MOVIES) {
    return 'adult';
  }
  if (normalized === LIBRARY_TABS.TV) {
    return 'adult_tv';
  }
  if (normalized === LIBRARY_TABS.COLLECTIONS) {
    return 'adult_collections';
  }
  if (normalized === LIBRARY_TABS.PEOPLE) {
    return 'adult_people';
  }
  if (normalized === LIBRARY_TABS.SCENES) {
    return 'adult_scenes';
  }
  if (normalized === LIBRARY_TABS.VIDEOS) {
    return 'adult_videos';
  }
  return normalized;
};

export const getLibraryTabTranslationKey = (value, sessionMode) => {
  const normalized = normalizeLibraryTab(value, value);
  if (sessionMode === 'nsfw' && normalized === LIBRARY_TABS.PEOPLE) {
    return 'adultPeople';
  }
  return normalized;
};

export const getLibraryEmptyStateKey = (value, sessionMode) => {
  const normalized = normalizeLibraryTab(value, value);
  if (sessionMode !== 'nsfw') {
    return normalized;
  }
  if (normalized === LIBRARY_TABS.MOVIES) {
    return 'adult';
  }
  if (normalized === LIBRARY_TABS.TV) {
    return 'adult_tv';
  }
  if (normalized === LIBRARY_TABS.PEOPLE) {
    return 'adultPeople';
  }
  if (normalized === LIBRARY_TABS.COLLECTIONS) {
    return 'adultCollections';
  }
  if (normalized === LIBRARY_TABS.TAGS) {
    return 'adultTags';
  }
  if (normalized === LIBRARY_TABS.SCENES) {
    return 'adult_scenes';
  }
  if (normalized === LIBRARY_TABS.VIDEOS) {
    return 'adult_videos';
  }
  return normalized;
};

export const getLibraryTagBucketKeys = (sessionMode) => (
  sessionMode === 'nsfw'
    ? ['adult', 'adult_tv', 'adult_people', 'adult_scenes', 'adult_videos']
    : ['movies', 'tv', 'people', 'videos']
);

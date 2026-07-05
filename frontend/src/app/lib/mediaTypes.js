export const MEDIA_TYPES = Object.freeze({
  MOVIE: 'movie',
  TV: 'tv',
  SEASON: 'season',
  EPISODE: 'episode',
  PERSON: 'person',
  COLLECTION: 'collection',
  SCENE: 'scene',
});

const MEDIA_TYPE_ALIASES = Object.freeze({
  adult: MEDIA_TYPES.MOVIE,
  adult_tv: MEDIA_TYPES.TV,
  adult_star: MEDIA_TYPES.PERSON,
  adult_people: MEDIA_TYPES.PERSON,
  film: MEDIA_TYPES.MOVIE,
  movie: MEDIA_TYPES.MOVIE,
  show: MEDIA_TYPES.TV,
  tv: MEDIA_TYPES.TV,
  season: MEDIA_TYPES.SEASON,
  episode: MEDIA_TYPES.EPISODE,
  person: MEDIA_TYPES.PERSON,
  people: MEDIA_TYPES.PERSON,
  collection: MEDIA_TYPES.COLLECTION,
  scene: MEDIA_TYPES.SCENE,
  scenes: MEDIA_TYPES.SCENE,
  adult_scenes: MEDIA_TYPES.SCENE,
  adult_scene: MEDIA_TYPES.SCENE,
});

export const normalizeMediaType = (value, fallback = null) => {
  const normalized = MEDIA_TYPE_ALIASES[String(value || '').trim().toLowerCase()];
  if (normalized) {
    return normalized;
  }
  if (fallback == null) {
    return null;
  }
  return normalizeMediaType(fallback, null);
};

export const isMovieMediaType = (value) => {
  const mediaType = normalizeMediaType(value);
  return mediaType === MEDIA_TYPES.MOVIE || mediaType === MEDIA_TYPES.JAV;
};

export const isSceneMediaType = (value) => normalizeMediaType(value) === MEDIA_TYPES.SCENE;

export const isJavMediaType = (value) => normalizeMediaType(value) === MEDIA_TYPES.JAV;

export const isSeasonMediaType = (value) => normalizeMediaType(value) === MEDIA_TYPES.SEASON;

export const isEpisodeMediaType = (value) => normalizeMediaType(value) === MEDIA_TYPES.EPISODE;

export const isTvMediaType = (value) => normalizeMediaType(value) === MEDIA_TYPES.TV;

export const isPersonMediaType = (value) => normalizeMediaType(value) === MEDIA_TYPES.PERSON;

export const isTvLikeMediaType = (value) => {
  const mediaType = normalizeMediaType(value);
  return mediaType === MEDIA_TYPES.TV
    || mediaType === MEDIA_TYPES.SEASON
    || mediaType === MEDIA_TYPES.EPISODE;
};

export const isMovieOrEpisodeMediaType = (value) => (
  isMovieMediaType(value) || isEpisodeMediaType(value)
);

export const toMetadataMediaType = (value, fallback = MEDIA_TYPES.MOVIE) => (
  isTvLikeMediaType(value) ? MEDIA_TYPES.TV : normalizeMediaType(value, fallback)
);

/**
 * normalizeMediaEntity.js
 *
 * Centralizes entity data assembly for card rendering.
 * Every component that renders a media/person card can call
 * normalizeMediaEntity(item, opts) to get a consistent shape.
 */

import {
  resolveMediaImageUrl,
  getPosterImagePath,
  getTvPosterImagePath,
  getProfileImagePath,
  pickFirstImagePath,
} from './imageUrls';

// ─── Media Type Detection ────────────────────────────────────────

const resolveMediaType = (item) => item.media_type || item.type || 'movie';

const isPersonEntity = (item) => {
  const mt = resolveMediaType(item);
  return mt === 'person' || (!item.title && !!item.profile_path);
};

const isSceneEntity = (item) => {
  const mt = resolveMediaType(item);
  return mt === 'scene' || mt === 'scenes';
};

const isTvEntity = (item) => {
  const mt = resolveMediaType(item);
  return mt === 'tv' || mt === 'tvshows' || mt === 'episode';
};

// ─── Title ───────────────────────────────────────────────────────

const resolveTitle = (item) => item.title || item.name || 'Unknown';

// ─── Image URL ───────────────────────────────────────────────────

const resolveImageUrl = (item, opts = {}) => {
  const { context } = opts;
  const isPerson = isPersonEntity(item);
  const isScene = isSceneEntity(item);
  const isTv = isTvEntity(item);

  if (isPerson) {
    const path = getProfileImagePath(item);
    return path ? resolveMediaImageUrl(path, 'poster') : '';
  }

  if (isScene) {
    // Scenes prefer backdrop/still over poster
    const path = pickFirstImagePath(
      item.backdrop_path,
      item.local_backdrop_path,
      item.still_path,
      item.poster_path,
      item.local_poster_path,
    );
    const type = (item.backdrop_path || item.local_backdrop_path) ? 'backdrop' : 'poster';
    return path ? resolveMediaImageUrl(path, context === 'search' ? 'posterThumb' : type) : '';
  }

  if (context === 'continueWatching') {
    const path = pickFirstImagePath(item.still_path, item.backdrop_path);
    return path ? resolveMediaImageUrl(path, item.still_path ? 'still' : 'backdrop') : '';
  }

  // Movie / TV / Collection — poster preferred
  const path = isTv ? getTvPosterImagePath(item) : getPosterImagePath(item);
  return path ? resolveMediaImageUrl(path, context === 'search' ? 'posterThumb' : 'poster') : '';
};

// ─── Ratings ─────────────────────────────────────────────────────

const resolveRatings = (item) => {
  const isPerson = isPersonEntity(item);
  const isScene = isSceneEntity(item);

  if (isPerson) {
    return { ratingImdb: null, ratingTmdb: null, ratingPorndb: null };
  }

  const ratingImdb = (isScene ? null : item.rating_imdb) || null;
  const ratingTmdb = (isScene ? null : (item.rating_tmdb || item.rating || item.vote_average)) || null;
  const ratingPorndb = item.rating_porndb || null;

  return { ratingImdb, ratingTmdb, ratingPorndb };
};

// ─── Performers (gender-preference filtered) ─────────────────────

const resolvePerformers = (item, settings, maxCount = 4) => {
  const allPeople = item.people || [];
  if (!allPeople.length) return [];

  const pref = settings?.adult_gender_preference;
  if (!pref || pref === 'all') {
    return allPeople.slice(0, maxCount);
  }

  const filtered = allPeople.filter((p) => {
    const g = typeof p.gender === 'string'
      ? (p.gender.toUpperCase().includes('FEMALE') ? 1 : p.gender.toUpperCase().includes('MALE') ? 2 : 0)
      : p.gender;
    if (pref === 'female') return g === 1;
    if (pref === 'male') return g === 2;
    return true;
  });
  return filtered.slice(0, maxCount);
};

// ─── Subtitle ────────────────────────────────────────────────────

const resolveSubtitle = (item, opts = {}) => {
  const { context } = opts;
  const isPerson = isPersonEntity(item);
  const isScene = isSceneEntity(item);
  const isTv = isTvEntity(item);

  if (context === 'credits') {
    const itemType = resolveMediaType(item);
    const isSceneOrPornDb = (itemType === 'scene' || itemType === 'scenes') ||
      (item.source === 'porndb' || item.source === 'theporndb');
    if (isSceneOrPornDb) {
      return (item.release_date || '').split('T')[0].split(' ')[0] || item.year || '';
    }
    return item.character || item.year || '';
  }

  if (context === 'drawer') {
    if (isPerson) return item.role || 'Actor';
    return item.year || item.media_type || '';
  }

  if (isPerson) {
    return item.people_role || item.known_for_department || '';
  }

  if (isScene) {
    return (item.release_date ? item.release_date.substring(0, 10) : item.year) || '';
  }

  if (isTv) {
    const firstYear = item.first_air_date ? new Date(item.first_air_date).getFullYear() : null;
    const lastYear = item.last_air_date ? new Date(item.last_air_date).getFullYear() : null;
    const isEnded = item.release_status?.toLowerCase() === 'ended';
    if (firstYear) {
      return isEnded && lastYear ? `${firstYear} - ${lastYear}` : `${firstYear} - `;
    }
    return item.year || '';
  }

  // Movie default
  const parts = [];
  const year = item.release_date ? item.release_date.substring(0, 4) : item.year;
  if (year) parts.push(year);
  if (item.info) parts.push(item.info);
  return parts.join(' • ');
};

// ─── Blur Detection ──────────────────────────────────────────────

const resolveShouldBlur = (item, opts = {}) => {
  const { sessionMode, isAdultContext } = opts;
  if (sessionMode === 'nsfw') return false;
  const isScene = isSceneEntity(item);
  const isAdultItem = !!item.is_adult || !!item.adult;
  
  if (isScene) {
    const isExplicitlySfw = item.is_adult === false || item.adult === false;
    if (isExplicitlySfw) {
      return !!isAdultContext;
    }
    return true;
  }
  
  return !!isAdultContext || isAdultItem;
};

// ─── Main Export ─────────────────────────────────────────────────

/**
 * Normalizes a raw entity into a consistent shape for card rendering.
 *
 * @param {Object} item - Raw entity from any API source
 * @param {Object} opts
 * @param {string} opts.context - 'library' | 'search' | 'recommendations' | 'credits' | 'drawer' | 'continueWatching'
 * @param {Object} opts.settings - User settings (for gender preference)
 * @param {string} opts.sessionMode - 'sfw' | 'nsfw'
 * @param {boolean} opts.isAdultContext - Whether the context is adult-specific
 * @returns {Object} Normalized entity props
 */
export function normalizeMediaEntity(item, opts = {}) {
  const { settings } = opts;
  const ratings = resolveRatings(item);

  return {
    id: item.id,
    mediaType: resolveMediaType(item),
    isPerson: isPersonEntity(item),
    isScene: isSceneEntity(item),
    isTv: isTvEntity(item),

    title: resolveTitle(item),
    subtitle: resolveSubtitle(item, opts),
    imageUrl: resolveImageUrl(item, opts),

    ...ratings,

    isWatched: item.is_watched || false,
    isFavorite: item.is_favorite || false,
    inLibrary: item.in_library,

    performers: resolvePerformers(item, settings),
    shouldBlur: resolveShouldBlur(item, opts),
  };
}

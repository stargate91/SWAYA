/**
 * Centralized query key constants and cache invalidation helpers.
 *
 * Instead of scattering 100+ invalidateQueries calls across mutation files,
 * use invalidateEntity(qc, rawId, opts) to invalidate all detail caches
 * for a given entity in one call.
 */

// ─── Query Key Constants ─────────────────────────────────────────
export const QK = Object.freeze({
  library:             ['library'],
  libraryCollections:  ['libraryCollections'],
  libraryTags:         ['libraryTags'],
  libraryFilters:      ['libraryFilters'],
  allTags:             ['allTags'],
  stats:               ['stats'],
  continueWatching:    ['continue-watching'],
  watchedHistory:      ['watched-history'],
  recommendations:     ['recommendations'],
  lists:               ['lists'],
  organizer:           ['organizer'],
  organizerCount:      ['organizer-count'],
  people:              ['people'],
  peopleInfinite:      ['people-infinite'],
});

// ─── ID Variant Generator ────────────────────────────────────────
const PREFIXES = ['tv_', 'collection_', 'stash_', 'tmdb_', 'porndb_', 'fansdb_'];

/**
 * Given a raw entity ID (possibly prefixed), returns all cache-key ID variants
 * that might exist across different query caches.
 */
export const entityIdVariants = (rawId) => {
  const str = String(rawId);
  let cleanId = str;
  for (const prefix of PREFIXES) {
    if (cleanId.startsWith(prefix)) {
      cleanId = cleanId.slice(prefix.length);
      break;
    }
  }
  const ids = new Set([str, cleanId]);
  const num = Number(cleanId);
  if (!isNaN(num)) ids.add(num);
  return [...ids];
};

// ─── Detail Key Groups ───────────────────────────────────────────
const DETAIL_GROUPS = [
  'library-item-detail',
  'library-tv-detail',
  'full-metadata',
  'library-collection-detail',
  'person-detail',
];

// ─── Core Invalidation Helper ────────────────────────────────────
/**
 * Invalidates all detail caches for a single entity, plus optional list-level caches.
 *
 * @param {import('@tanstack/react-query').QueryClient} qc
 * @param {string|number} rawId - The entity ID (may include prefixes like tv_, collection_, etc.)
 * @param {Object} [opts]
 * @param {boolean} [opts.lists]            - Invalidate library list + collections
 * @param {boolean} [opts.stats]            - Invalidate stats
 * @param {boolean} [opts.tags]             - Invalidate tags + filters
 * @param {boolean} [opts.recommendations]  - Invalidate recommendations
 * @param {boolean} [opts.continueWatching] - Invalidate continue watching
 * @param {boolean} [opts.watchedHistory]   - Invalidate watched history
 * @param {boolean} [opts.organizer]        - Invalidate organizer + count
 * @param {boolean} [opts.listsList]        - Invalidate user lists
 */
export const invalidateEntity = (qc, rawId, opts = {}) => {
  const variants = entityIdVariants(rawId);

  for (const group of DETAIL_GROUPS) {
    for (const id of variants) {
      qc.invalidateQueries({ queryKey: [group, id] });
    }
  }

  if (opts.lists) {
    qc.invalidateQueries({ queryKey: QK.library });
    qc.invalidateQueries({ queryKey: QK.libraryCollections });
  }
  if (opts.stats)            qc.invalidateQueries({ queryKey: QK.stats });
  if (opts.tags) {
    qc.invalidateQueries({ queryKey: QK.libraryTags });
    qc.invalidateQueries({ queryKey: QK.allTags });
    qc.invalidateQueries({ queryKey: QK.libraryFilters });
  }
  if (opts.recommendations)  qc.invalidateQueries({ queryKey: QK.recommendations });
  if (opts.continueWatching) qc.invalidateQueries({ queryKey: QK.continueWatching });
  if (opts.watchedHistory)   qc.invalidateQueries({ queryKey: QK.watchedHistory });
  if (opts.organizer) {
    qc.invalidateQueries({ queryKey: QK.organizer });
    qc.invalidateQueries({ queryKey: QK.organizerCount });
  }
  if (opts.listsList)        qc.invalidateQueries({ queryKey: QK.lists });
};

/**
 * Invalidates only tv-detail keys for a given TV show ID.
 * Covers both raw and tv_-prefixed variants.
 */
export const invalidateTvDetail = (qc, tvId) => {
  const variants = entityIdVariants(tvId);
  for (const id of variants) {
    qc.invalidateQueries({ queryKey: ['library-tv-detail', id] });
    qc.invalidateQueries({ queryKey: ['library-tv-detail', `tv_${id}`] });
  }
};

/**
 * Invalidates all person-related caches for a given person ID.
 * Covers person-detail (all ID variants), person-credits, people lists.
 */
export const invalidatePerson = (qc, personId, opts = {}) => {
  const variants = entityIdVariants(personId);
  for (const id of variants) {
    qc.invalidateQueries({ queryKey: ['person-detail', id] });
    qc.invalidateQueries({ queryKey: ['person-credits', id] });
  }
  // Broad person-detail invalidation (catches queries with extra params)
  qc.invalidateQueries({ queryKey: ['person-detail'] });
  qc.invalidateQueries({ queryKey: QK.people });
  qc.invalidateQueries({ queryKey: QK.peopleInfinite });

  if (opts.lists)           qc.invalidateQueries({ queryKey: QK.library });
  if (opts.stats)           qc.invalidateQueries({ queryKey: QK.stats });
  if (opts.recommendations) qc.invalidateQueries({ queryKey: QK.recommendations });
  if (opts.listsList)       qc.invalidateQueries({ queryKey: QK.lists });
};

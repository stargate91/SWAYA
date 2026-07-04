import { Mars, User, Venus, VenusAndMars } from '@/ui/icons';
import { isTvLikeMediaType } from '@/lib/mediaTypes';

export function getGenderLabel(gender, t) {
  if (gender === 1 || gender === '1') {
    return t('library.details.female') || 'Female';
  }
  if (gender === 2 || gender === '2') {
    return t('library.details.male') || 'Male';
  }
  if (gender === 3 || gender === '3') {
    return t('library.details.nonBinary') || 'Non-binary';
  }
  return null;
}

export function getGenderIcon(gender) {
  if (gender === 1 || gender === '1') {
    return Venus;
  }
  if (gender === 2 || gender === '2') {
    return Mars;
  }
  if (gender === 3 || gender === '3') {
    return VenusAndMars;
  }
  return User;
}

export function normalizeCreditType(item) {
  return isTvLikeMediaType(item?.media_type || item?.type) ? 'tv' : 'movie';
}

export function normalizeCreditTitle(item) {
  return String(item?.title || item?.name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getCreditIdentityCandidates(item) {
  return [
    item?.tmdb_id,
    item?.tv_tmdb_id,
    item?.library_tv_tmdb_id,
    item?.library_item_id,
    item?.id,
  ]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map((value) => String(value));
}

export function isKnownForMatch(entry, knownForEntry) {
  if (normalizeCreditType(entry) !== normalizeCreditType(knownForEntry)) {
    return false;
  }

  const entryIds = getCreditIdentityCandidates(entry);
  const knownForIds = getCreditIdentityCandidates(knownForEntry);
  if (entryIds.some((id) => knownForIds.includes(id))) {
    return true;
  }

  const entryTitle = normalizeCreditTitle(entry);
  const knownForTitle = normalizeCreditTitle(knownForEntry);
  const entryYear = String(entry?.year || '');
  const knownForYear = String(knownForEntry?.year || '');

  if (!entryTitle || !knownForTitle) {
    return false;
  }

  if (entryTitle === knownForTitle && entryYear === knownForYear) {
    return true;
  }

  return entryTitle === knownForTitle;
}

export function prioritizePersonCredits(items, knownForItems) {
  if (!items?.length) {
    return [];
  }

  const knownForRank = new Map(
    (knownForItems || []).map((entry, index) => {
      const ids = getCreditIdentityCandidates(entry);
      const key = ids[0] || `${normalizeCreditType(entry)}:${normalizeCreditTitle(entry)}:${entry?.year || ''}`;
      return [key, index];
    })
  );

  return [...items]
    .map((entry) => {
      const matchedKnownFor = (knownForItems || []).find((knownForEntry) => isKnownForMatch(entry, knownForEntry));
      const matchIds = matchedKnownFor ? getCreditIdentityCandidates(matchedKnownFor) : [];
      const fallbackKey = `${normalizeCreditType(entry)}:${normalizeCreditTitle(entry)}:${entry?.year || ''}`;
      const rankKey = matchIds[0] || fallbackKey;
      return {
        ...entry,
        is_known_for: Boolean(matchedKnownFor),
        known_for_rank: matchedKnownFor ? (knownForRank.get(rankKey) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => {
      if (Boolean(a?.is_known_for) !== Boolean(b?.is_known_for)) {
        return a?.is_known_for ? -1 : 1;
      }

      if (a?.is_known_for && b?.is_known_for) {
        return (a?.known_for_rank ?? Number.MAX_SAFE_INTEGER) - (b?.known_for_rank ?? Number.MAX_SAFE_INTEGER);
      }

      if (Boolean(a?.in_library) !== Boolean(b?.in_library)) {
        return a?.in_library ? -1 : 1;
      }

      const yearDiff = (Number(b?.year) || 0) - (Number(a?.year) || 0);
      if (yearDiff !== 0) {
        return yearDiff;
      }

      return String(a?.title || '').localeCompare(String(b?.title || ''));
    });
}

export function getTmdbBackdropScore(item) {
  const rating = Number(item?.rating_tmdb ?? item?.rating ?? 0);
  const voteCount = Number(item?.vote_count ?? 0);
  return (rating * 100) + (Math.log10(Math.max(voteCount, 1)) * 24);
}

export function sortBackdropCredits(items) {
  return [...(items || [])].sort((a, b) => {
    const scoreDiff = getTmdbBackdropScore(b) - getTmdbBackdropScore(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    const yearDiff = (Number(b?.year) || 0) - (Number(a?.year) || 0);
    if (yearDiff !== 0) {
      return yearDiff;
    }
    return String(a?.title || '').localeCompare(String(b?.title || ''));
  });
}

export function normalizeBackdropKey(path) {
  if (!path) {
    return '';
  }
  const normalized = String(path).trim();
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

export function mergeBackdropCreditPages(pages) {
  const seen = new Set();
  const merged = [];
  (pages || []).forEach((page) => {
    (page?.items || []).forEach((entry) => {
      const key = String(entry?.tmdb_id || entry?.id || `${entry?.title || entry?.name || ''}-${entry?.year || ''}`);
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      merged.push(entry);
    });
  });
  return merged;
}

export function enrichKnownForItems(knownForItems, movies, tv) {
  if (!knownForItems?.length) {
    return [];
  }

  const movieRatings = new Map(
    (movies || [])
      .filter((entry) => entry?.id != null)
      .map((entry) => [String(entry.id), entry.rating_imdb])
  );

  const tvRatings = new Map();
  for (const entry of tv || []) {
    const rating = entry?.rating_imdb;
    const keys = [entry?.tv_tmdb_id, entry?.tmdb_id, entry?.id];
    for (const key of keys) {
      if (key != null && !tvRatings.has(String(key)) && rating != null) {
        tvRatings.set(String(key), rating);
      }
    }
  }

  return knownForItems.map((entry) => {
    const isTv = isTvLikeMediaType(entry.media_type || entry.type);
    const lookupKeys = isTv
      ? [entry.tv_tmdb_id, entry.library_tv_tmdb_id, entry.tmdb_id, entry.id]
      : [entry.library_item_id, entry.tmdb_id, entry.id];

    const sourceMap = isTv ? tvRatings : movieRatings;
    const fallbackImdb = lookupKeys
      .map((key) => (key != null ? sourceMap.get(String(key)) : null))
      .find((value) => value != null);

    return {
      ...entry,
      rating_imdb: entry.rating_imdb ?? fallbackImdb ?? null,
    };
  });
}


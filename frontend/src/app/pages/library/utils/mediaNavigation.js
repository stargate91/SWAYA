import { isSceneMediaType, isTvLikeMediaType } from '@/lib/mediaTypes';

const normalizeSource = (source) => String(source || '').trim().toLowerCase();

const isPornDbSource = (source) => {
  const normalizedSource = normalizeSource(source);
  return normalizedSource === 'porndb' || normalizedSource === 'theporndb';
};

const firstValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const stringValue = String(value).trim();
    if (stringValue && stringValue !== '0') {
      return stringValue;
    }
  }
  return '';
};

const hasProviderPrefix = (value) => /^(porndb|theporndb|fansdb|stash|stashdb)_/i.test(String(value || ''));

const prefixedId = (prefix, value) => {
  if (!value) return '';
  return hasProviderPrefix(value) ? value : `${prefix}_${value}`;
};

export const getCreditSource = (item, fallbackSource) => {
  const explicitSource = normalizeSource(item?.source || fallbackSource);
  if (explicitSource) return explicitSource;
  if (item?.rating_porndb || item?.porndb_id || item?.theporndb_id) return 'porndb';
  if (item?.fansdb_id) return 'fansdb';
  if (item?.stash_id || item?.stashdb_id) return 'stashdb';
  return 'tmdb';
};

export const getCreditDetailPath = (item, fallbackType, fallbackSource) => {
  const resolvedType = item?.media_type || item?.type || fallbackType;
  const resolvedTypeKey = String(resolvedType || '').toLowerCase();
  const source = getCreditSource(item, fallbackSource);

  if (resolvedTypeKey === 'person' || resolvedTypeKey === 'performer') {
    const personId = firstValue(item?.person_id, item?.id);
    return personId ? `/library/people/${personId}` : '';
  }

  if (isSceneMediaType(resolvedType)) {
    if (item?.in_library) {
      return `/library/scene/${item.library_item_id || item.id}`;
    }
    const prefix = isPornDbSource(source) ? 'porndb' : (source === 'fansdb' ? 'fansdb' : 'stash');
    const externalId = firstValue(
      item?.stash_id,
      item?.stashdb_id,
      item?.fansdb_id,
      item?.porndb_id,
      item?.theporndb_id,
      item?.external_id,
      item?.uuid,
      item?.id
    );
    return externalId ? `/library/scene/${prefixedId(prefix, externalId)}` : '';
  }

  if (isTvLikeMediaType(resolvedType) || resolvedTypeKey === 'tvshows') {
    const tvId = firstValue(item?.library_tv_tmdb_id, item?.tv_tmdb_id, item?.tmdb_id, item?.id);
    return tvId ? `/library/tv/${tvId}` : '';
  }

  if (item?.in_library) {
    return `/library/movie/${item.library_item_id || item.id}`;
  }

  if (isPornDbSource(source)) {
    const externalId = firstValue(
      item?.porndb_id,
      item?.theporndb_id,
      item?.stash_id,
      item?.external_id,
      item?.uuid,
      item?.id,
      item?.tmdb_id
    );
    return externalId ? `/library/movie/${prefixedId('porndb', externalId)}` : '';
  }

  const tmdbId = firstValue(item?.tmdb_id, item?.id);
  return tmdbId ? `/library/movie/tmdb_${tmdbId}` : '';
};

export const navigateToCreditDetail = (navigate, item, fallbackType, fallbackSource) => {
  const path = getCreditDetailPath(item, fallbackType, fallbackSource);
  if (path) {
    navigate(path, { state: { allowAdult: true } });
  }
};

import { API_BASE } from '@/lib/backend';

export const TMDB_IMAGE_SIZES = {
  poster: 'w780',
  backdrop: 'original',
  logo: 'original',
  still: 'w400',
  person: 'h632',
  thumbnail: 'w300',
  backdropThumb: 'w300',
  posterThumb: 'w154',
  personThumb: 'w185',
  originalPoster: 'original',
  originalStill: 'original',
  originalPerson: 'original',
  scene_stills: 'w500',
  originalSceneStill: 'original',
};

export const buildTmdbImageUrl = (path, size = TMDB_IMAGE_SIZES.poster) => {
  if (!path) return '';
  if (String(path).startsWith('http://') || String(path).startsWith('https://') || String(path).startsWith('//')) {
    return path;
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const pickFirstImagePath = (...paths) => {
  for (const path of paths) {
    if (typeof path === 'string' && path.trim()) {
      return path.trim();
    }
  }
  return '';
};

export const getPosterImagePath = (item) => pickFirstImagePath(
  item?.displayPoster,
  item?.poster_path,
  item?.local_poster_path,
);

export const getTvPosterImagePath = (item) => pickFirstImagePath(
  item?.displayPoster,
  item?.tv_poster_path,
  item?.poster_path,
  item?.local_poster_path,
);

export const getProfileImagePath = (item) => pickFirstImagePath(
  item?.profile_path,
  item?.poster_path,
  item?.displayPoster,
);

export const getBackdropImagePath = (item) => pickFirstImagePath(
  item?.local_backdrop_path,
  item?.backdrop_path,
);

export const resolveMediaImageUrl = (path, imageType = 'poster', apiBase = API_BASE) => {
  if (!path) return '';
  // Note: Backend now returns resolved paths starting with /media/ or http://.
  // Fallbacks below are kept for legacy compatibility.
  let pathStr = String(path);
  if (pathStr.startsWith('//')) {
    pathStr = `https:${pathStr}`;
  }
  if (pathStr.startsWith(apiBase) || pathStr.startsWith('http://localhost') || pathStr.startsWith('http://127.0.0.1')) {
    return pathStr;
  }
  
  const isOriginalType = ['backdrop', 'logo', 'originalPoster', 'originalStill', 'originalPerson', 'originalSceneStill'].includes(imageType);

  if (pathStr.startsWith('/media/') || pathStr.startsWith('/api/') || pathStr.startsWith('media/')) {
    const relPath = pathStr.startsWith('media/') ? `/${pathStr}` : pathStr;
    if (isOriginalType && relPath.includes('/thumbnails/')) {
      return `${apiBase}${relPath.replace('/thumbnails/', '/original/')}`;
    }
    return `${apiBase}${relPath}`;
  }
  
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    if (pathStr.includes('image.tmdb.org/t/p/')) {
      const parts = pathStr.split('/t/p/');
      if (parts.length === 2) {
        const subparts = parts[1].split('/');
        if (subparts.length >= 2) {
          const size = TMDB_IMAGE_SIZES[imageType] || TMDB_IMAGE_SIZES.poster;
          const rest = subparts.slice(1).join('/');
          return `${parts[0]}/t/p/${size}/${rest}`;
        }
      }
      return pathStr;
    }
    return `${apiBase}/api/v1/media/image-proxy?url=${encodeURIComponent(pathStr)}`;
  }
  
  if (pathStr.startsWith('/')) {
    const size = TMDB_IMAGE_SIZES[imageType] || TMDB_IMAGE_SIZES.poster;
    return buildTmdbImageUrl(pathStr, size);
  }

  const normalizedPath = String(path).replace(/^\/+/, '');
  if (normalizedPath.startsWith('media/images/')) {
    return `${apiBase}/${normalizedPath}`;
  }

  let folder = 'posters';
  if (imageType === 'backdrop') folder = 'backdrops';
  else if (imageType === 'logo') folder = 'logos';
  else if (imageType === 'person' || imageType === 'originalPerson' || imageType === 'personThumb') folder = 'people';
  else if (imageType === 'still' || imageType === 'originalStill') folder = 'stills';
  else if (imageType === 'scene_stills' || imageType === 'originalSceneStill') folder = 'scene_stills';

  const subfolderType = isOriginalType ? 'original' : 'thumbnails';

  if (normalizedPath.includes('/')) {
    if (normalizedPath.startsWith('original/') || normalizedPath.startsWith('thumbnails/')) {
      return `${apiBase}/media/images/${normalizedPath}`;
    }
    return `${apiBase}/media/images/${subfolderType}/${normalizedPath}`;
  }
  return `${apiBase}/media/images/${subfolderType}/${folder}/${normalizedPath}`;
};

export const fnv1aHash = (str) => {
  let hash = 2166136261;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

export const pathsMatch = (path, currentPath) => {
  if (!path || !currentPath) return false;
  const pathLower = path.toLowerCase();
  const currentLower = currentPath.toLowerCase();

  if (pathLower === currentLower) return true;

  const isPathHttp = pathLower.startsWith('http://') || pathLower.startsWith('https://');
  const isCurrentHttp = currentLower.startsWith('http://') || currentLower.startsWith('https://');

  if (isPathHttp && isCurrentHttp) {
    return pathLower === currentLower;
  }

  // Handle local vs remote override matching
  const currentFilename = currentLower.split(/[/\\]/).pop().split('?')[0];
  const optionFilename = pathLower.split(/[/\\]/).pop().split('?')[0];

  // Try exact filename match first
  if (currentFilename === optionFilename) return true;

  // If option is remote, calculate its FNV-1a hash and see if it is in the current local filename
  if (isPathHttp && !isCurrentHttp) {
    const urlHash = fnv1aHash(path);
    const hashPattern = `_${urlHash}`;
    if (currentFilename.includes(hashPattern)) {
      return true;
    }
  }

  // Fallback to suffix match of cleaned filename
  const cleanCurrent = currentFilename.replace('user_override_', '');
  if (cleanCurrent.includes(optionFilename)) {
    return true;
  }

  return false;
};


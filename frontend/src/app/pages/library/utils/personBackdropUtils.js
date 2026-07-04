const fnv1aHash = (str) => {
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

export const checkImageResolution = (url) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
};

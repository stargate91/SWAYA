/**
 * episodeFormat.js
 *
 * Unified episode number parsing and formatting utilities.
 * Replaces duplicated logic from ContinueWatchingWidget and detailUtils.
 */

/**
 * Normalizes an episode number input (string, array, number) into
 * a sorted array of integers.
 *
 * Handles: arrays, JSON strings like "[1,2]", comma-separated "1,2,3",
 * dash ranges, and plain numbers.
 */
export const normalizeEpisodeNumbers = (episodeNumber) => {
  if (Array.isArray(episodeNumber)) {
    return episodeNumber.map((n) => Number(n)).filter(Number.isInteger);
  }

  if (typeof episodeNumber === 'string') {
    const trimmed = episodeNumber.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed)
          ? parsed.map((n) => Number(n)).filter(Number.isInteger)
          : [Number(parsed)].filter(Number.isInteger);
      } catch {
        return [];
      }
    }

    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s) => Number(s.trim())).filter(Number.isInteger);
    }

    // Dash-separated range (e.g. "1-3") — return as-is endpoints
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map((s) => Number(s.trim())).filter(Number.isInteger);
      return parts;
    }

    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? [parsed] : [];
  }

  return Number.isInteger(episodeNumber) ? [episodeNumber] : [];
};

/**
 * Formats an episode number for display.
 * Input can be number, string, array, etc.
 *
 * Examples:
 *   5         → "5"
 *   "1,2,3"   → "1-3"
 *   [1,2,3]   → "1-3"
 *   "1-3"     → "1-3"
 *   null      → ""
 */
export const formatEpisodeNumber = (epNum) => {
  if (epNum === undefined || epNum === null) return '';
  const nums = normalizeEpisodeNumbers(epNum);
  if (nums.length === 0) return '';
  if (nums.length === 1) return String(nums[0]);
  return `${nums[0]}-${nums[nums.length - 1]}`;
};

/**
 * Formats a full episode code like "S01E05" or "S02E01-03".
 *
 * @param {number|string} seasonNumber
 * @param {number|string|array} episodeNumber
 * @returns {string|null} null if no season
 */
export const formatEpisodeCode = (seasonNumber, episodeNumber) => {
  if (!seasonNumber) return null;
  const sStr = String(seasonNumber).padStart(2, '0');
  const normalized = normalizeEpisodeNumbers(episodeNumber);
  if (normalized.length === 0) return `S${sStr}`;
  if (normalized.length === 1) return `S${sStr}E${String(normalized[0]).padStart(2, '0')}`;
  const first = String(normalized[0]).padStart(2, '0');
  const last = String(normalized[normalized.length - 1]).padStart(2, '0');
  return `S${sStr}E${first}-${last}`;
};

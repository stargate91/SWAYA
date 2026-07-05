import {
  isLibraryCollectionTab,
  isLibraryPeopleTab,
  isLibraryTagsTab,
  isLibraryVideoTab,
} from '@/lib/libraryTabs';

export function sortLibraryItems(items, resolvedTab, sortKey, sortDirection) {
  if (!items || items.length === 0) return [];

  const getSortValue = (item) => {
    if (isLibraryVideoTab(resolvedTab)) {
      if (sortKey === 'title') {
        return String(item.title || '').toLowerCase();
      }
      if (sortKey === 'year') {
        return Number(item.year) || 0;
      }
      if (sortKey === 'release_date') {
        return item.release_date || item.year || '';
      }
      if (sortKey === 'rating_imdb') {
        return parseFloat(item.rating_imdb) || 0;
      }
      if (sortKey === 'rating') {
        return parseFloat(item.rating) || 0;
      }
      if (sortKey === 'user_rating') {
        return parseFloat(item.user_rating) || 0;
      }
      if (sortKey === 'duration') {
        return Number(item.duration) || 0;
      }
      if (sortKey === 'file_size') {
        return Number(item.file_size || item.size || item.size_mb) || 0;
      }
      if (sortKey === 'last_watched') {
        return item.last_watched_at ? new Date(item.last_watched_at).getTime() : 0;
      }
    }

    if (isLibraryCollectionTab(resolvedTab)) {
      if (sortKey === 'title') {
        return String(item.title || '').toLowerCase();
      }
      return Number(item.owned_count) || 0;
    }

    if (isLibraryPeopleTab(resolvedTab)) {
      if (sortKey === 'name' || sortKey === 'title') {
        return String(item.name || '').toLowerCase();
      }
      if (sortKey === 'library_count') {
        return Number(item.library_count) || 0;
      }
      if (sortKey === 'rating') {
        return parseFloat(item.rating) || 0;
      }
      if (sortKey === 'birthday') {
        return item.birthday ? new Date(item.birthday).getTime() : 0;
      }
      if (sortKey === 'user_rating') {
        return parseFloat(item.user_rating) || 0;
      }
      if (sortKey === 'height') {
        return Number(item.height) || 0;
      }
      if (sortKey === 'weight') {
        return Number(item.weight) || 0;
      }
      if (sortKey === 'cup_size') {
        const cupOrder = {
          'A': 1, 'B': 2, 'C': 3, 'D': 4, 'DD': 5, 'DDD': 6, 'E': 7, 'EE': 8, 'F': 9, 'FF': 10,
          'G': 11, 'GG': 12, 'H': 13, 'HH': 14, 'I': 15, 'J': 16, 'K': 17
        };
        return cupOrder[String(item.cup_size || '').trim().toUpperCase()] || 0;
      }
      if (sortKey === 'waist') {
        return Number(item.waist) || 0;
      }
      if (sortKey === 'hip') {
        return Number(item.hip) || 0;
      }
      if (sortKey === 'hourglass_ratio') {
        const w = parseFloat(item.waist) || 0;
        const h = parseFloat(item.hip) || 0;
        return w > 0 && h > 0 ? w / h : 0;
      }
      if (sortKey === 'body_slender') {
        const w = parseFloat(item.waist) || 0;
        const h = parseFloat(item.hip) || 0;
        return w > 0 && h > 0 ? w + h : 0;
      }
      if (sortKey === 'body_curvy') {
        const w = parseFloat(item.waist) || 0;
        const h = parseFloat(item.hip) || 0;
        return w > 0 && h > 0 ? w + h : 0;
      }
    }

    if (isLibraryTagsTab(resolvedTab)) {
      if (sortKey === 'name' || sortKey === 'title') {
        return String(item.name || '').toLowerCase();
      }
      return Number(item.total_count) || 0;
    }

    return '';
  };

  const mapped = items.map((item, index) => ({
    index,
    value: getSortValue(item),
    item
  }));

  mapped.sort((a, b) => {
    const valA = a.value;
    const valB = b.value;

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return a.index - b.index;
  });

  return mapped.map(x => x.item);
}

export function getAvailableGenres(items) {
  if (!items) return [];
  const genresSet = new Set();
  items.forEach((item) => {
    if (item.genres && Array.isArray(item.genres)) {
      item.genres.forEach((genre) => {
        if (genre) genresSet.add(genre.trim());
      });
    }
  });
  return ['all', ...Array.from(genresSet).sort()];
}

export function getFilteredListItems({
  items,
  watchedFilter,
  mediaTypeFilter,
  genreFilter,
  genderFilter,
  jobFilter,
  listSearchQuery,
  sortKey,
  sortDirection,
  listType,
}) {
  if (!items) return [];

  let result = items;

  if (watchedFilter !== 'all') {
    const wantWatched = watchedFilter === 'watched';
    result = result.filter((item) => !!item.is_watched === wantWatched);
  }

  if (listType !== 'person' && mediaTypeFilter !== 'all') {
    result = result.filter((item) => {
      const itemType = item.media_type;
      const isAdult = item.is_adult !== false && item.adult !== false;
      if (mediaTypeFilter === 'movie') {
        return itemType === 'movie';
      } else if (mediaTypeFilter === 'show') {
        return itemType === 'show' || itemType === 'tv' || itemType === 'episode' || itemType === 'season';
      } else if (mediaTypeFilter === 'scene') {
        return (itemType === 'scene' || itemType === 'still') && isAdult && !item.is_home_video;
      } else if (mediaTypeFilter === 'videos') {
        return itemType === 'videos' || itemType === 'video' || ((itemType === 'scene' || itemType === 'still') && (!isAdult || item.is_home_video));
      }
      return true;
    });
  }

  if (listType !== 'person' && genreFilter !== 'all') {
    result = result.filter((item) => {
      return item.genres && item.genres.some((g) => g.toLowerCase().trim() === genreFilter.toLowerCase().trim());
    });
  }

  if (listType === 'person' && genderFilter !== 'all') {
    result = result.filter((item) => {
      const itemGender = item.gender;
      if (genderFilter === 'female') return itemGender === 1;
      if (genderFilter === 'male') return itemGender === 2;
      return true;
    });
  }

  if (listType === 'person' && jobFilter !== 'all') {
    result = result.filter((item) => {
      const dept = item.known_for_department;
      if (jobFilter === 'actor') return dept === 'Acting';
      if (jobFilter === 'director') return dept === 'Directing' || dept === 'Creator';
      if (jobFilter === 'writer') return dept === 'Writing';
      if (jobFilter === 'sound') return dept === 'Sound';
      return true;
    });
  }

  if (listSearchQuery.trim()) {
    const queryLower = listSearchQuery.toLowerCase().trim();
    result = result.filter((item) => {
      const titleMatch = item.title && item.title.toLowerCase().includes(queryLower);
      const nameMatch = item.name && item.name.toLowerCase().includes(queryLower);
      const performersMatch = item.people && item.people.some(p => p.name && p.name.toLowerCase().includes(queryLower));
      return titleMatch || nameMatch || performersMatch;
    });
  }

  return [...result].sort((a, b) => {
    let valA, valB;
    if (sortKey === 'added_at') {
      valA = a.added_at ? new Date(a.added_at).getTime() : 0;
      valB = b.added_at ? new Date(b.added_at).getTime() : 0;
    } else if (sortKey === 'release_date') {
      valA = a.release_date ? new Date(a.release_date).getTime() : 0;
      valB = b.release_date ? new Date(b.release_date).getTime() : 0;
    } else if (sortKey === 'user_rating') {
      valA = typeof a.user_rating === 'number' ? a.user_rating : 0;
      valB = typeof b.user_rating === 'number' ? b.user_rating : 0;
    } else {
      valA = (a.title || a.name || '').toLowerCase();
      valB = (b.title || b.name || '').toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

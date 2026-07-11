export function calculateAge(birthday) {
  if (!birthday) return '';
  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return birthday;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${birthday} (${age})`;
}

export function calculateSlenderScore(item) {
  const w = parseFloat(item.waist) || 0;
  const height = parseFloat(item.height) || 0;
  if (w > 0) {
    const h_cm = height > 0 ? height : 165.0;
    const w_cm = w * 2.54;
    return (w_cm / h_cm).toFixed(3);
  }
  return '';
}

export function calculateCurvyScore(item) {
  const w = parseFloat(item.waist) || 0;
  const h = parseFloat(item.hip) || 0;
  if (w > 0 && h > 0) {
    const cupOrder = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'DD': 5, 'DDD': 6, 'E': 7, 'EE': 8, 'F': 9, 'FF': 10,
      'G': 11, 'GG': 12, 'H': 13, 'HH': 14, 'I': 15, 'J': 16, 'K': 17
    };
    const cupVal = cupOrder[String(item.cup_size || '').trim().toUpperCase()] || 0;
    const bandVal = parseFloat(item.band_size) || 34.0;
    const breastScore = cupVal > 0 ? (cupVal + (bandVal - 30.0) / 2.0) : 0.0;
    return ((h - w) * 2.54 + breastScore).toFixed(1);
  }
  return '';
}

export function formatPerformerSubtitle(item, sortKey, t) {
  const isPhysicalSort = ['height', 'weight', 'cup_size', 'waist', 'hip', 'hourglass_ratio', 'body_slender', 'body_curvy'].includes(sortKey);
  const isMetadataSort = ['birthday', 'rating', 'popularity', 'library_count', 'last_watched', 'watch_count', 'tag_count', 'finish_count', 'last_finish'].includes(sortKey);

  if (isPhysicalSort || isMetadataSort) {
    if (sortKey === 'height') {
      return item.height ? `${item.height} cm` : '—';
    } else if (sortKey === 'weight') {
      return item.weight ? `${item.weight} kg` : '—';
    } else if (sortKey === 'cup_size') {
      const band = item.band_size || '';
      const cup = item.cup_size || '';
      return (band || cup) ? `${band}${cup}` : '—';
    } else if (sortKey === 'waist') {
      return item.waist ? `${t('library.performerEdit.waistInches') || 'Waist'}: ${item.waist}"` : '—';
    } else if (sortKey === 'hip') {
      return item.hip ? `${t('library.performerEdit.hipInches') || 'Hip'}: ${item.hip}"` : '—';
    } else if (sortKey === 'hourglass_ratio') {
      const w = parseFloat(item.waist) || 0;
      const h = parseFloat(item.hip) || 0;
      return w > 0 && h > 0 ? (w / h).toFixed(2) : '—';
    } else if (sortKey === 'body_slender') {
      const score = calculateSlenderScore(item);
      return score ? `${t('library.sort.slenderScore') || 'Slender Score'}: ${score}` : '—';
    } else if (sortKey === 'body_curvy') {
      const score = calculateCurvyScore(item);
      return score ? `${t('library.sort.curvyScore') || 'Curvy Score'}: ${score}` : '—';
    } else if (sortKey === 'birthday') {
      return calculateAge(item.birthday) || '—';
    } else if (sortKey === 'rating') {
      if (item.is_adult_person || item.rating_porndb) {
        return item.rating_porndb ? `PornDB Rating: ${Number(item.rating_porndb).toFixed(1)}` : '—';
      }
      return item.popularity ? `Popularity: ${Number(item.popularity).toFixed(1)}` : '—';
    } else if (sortKey === 'popularity') {
      return item.popularity ? `Popularity: ${Number(item.popularity).toFixed(1)}` : '—';
    } else if (sortKey === 'library_count') {
      const count = item.library_count || 0;
      return t('library.sort.libraryCountValue', { count }) || `${count} items`;
    } else if (sortKey === 'last_watched') {
      return item.last_watched_at ? `Last Watched: ${item.last_watched_at.substring(0, 10)}` : '—';
    } else if (sortKey === 'watch_count') {
      return `Watch Count: ${item.watch_count || 0}`;
    } else if (sortKey === 'tag_count') {
      return `Tags: ${item.tag_count || 0}`;
    } else if (sortKey === 'finish_count') {
      return `Finish Count: ${item.finish_count || 0}`;
    } else if (sortKey === 'last_finish') {
      return item.last_finish_at ? `Last Finish: ${item.last_finish_at.substring(0, 10)}` : '—';
    }
  }

  return item.people_role ? t(`library.people.roles.${item.people_role}`, { defaultValue: item.people_role }) : '';
}

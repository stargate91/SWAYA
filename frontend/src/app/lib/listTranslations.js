export const translateListName = (name, t) => {
  if (name === 'Watchlist') return t('lists.watchlist_name') || name;
  if (name === 'NSFW Watchlist') return t('lists.nsfw_watchlist_name') || name;
  if (name === 'NSFW Movie/TV Watchlist') return t('lists.nsfw_movie_watchlist_name') || name;
  return name;
};

export const translateListDescription = (name, desc, t) => {
  if (name === 'Watchlist') return t('lists.watchlist_description') || desc;
  if (name === 'NSFW Watchlist') return t('lists.nsfw_watchlist_description') || desc;
  if (name === 'NSFW Movie/TV Watchlist') return t('lists.nsfw_movie_watchlist_description') || desc;
  return desc;
};

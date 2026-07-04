import { getIconForUrl, getBrandColorForKey, createLinkAdder } from './externalLinksShared';

export function buildMediaExternalLinks(item, t, type) {
  if (!item) return [];

  const links = [];
  const seenUrls = new Set();
  const seenKeys = new Set();
  const addLink = createLinkAdder(links, seenUrls, seenKeys);

  // 1. Database external_links first
  if (Array.isArray(item.external_links)) {
    item.external_links.forEach((link) => {
      const href = (link.url && String(link.url).startsWith('http')) 
        ? link.url 
        : (link.profile_url && String(link.profile_url).startsWith('http') ? link.profile_url : null);
      if (!href) return;
      const key = link.provider || link.key;
      addLink({
        key: key,
        label: link.name || link.provider || 'Link',
        href: href,
        iconSrc: getIconForUrl(href, key, '/links/homepage.png'),
        brandColor: getBrandColorForKey(key),
      });
    });
  }

  // 2. Fallbacks from ids
  const externalIds = item.external_ids || {};
  const tmdbId = item.tmdb_id || item.tv_tmdb_id || externalIds.tmdb || externalIds.tmdb_id;
  if (tmdbId) {
    const pathSegment = type === 'tv' ? 'tv' : 'movie';
    addLink({
      key: 'tmdb',
      label: t('library.details.tmdb') || 'TMDb',
      href: `https://www.themoviedb.org/${pathSegment}/${tmdbId}`,
      iconSrc: '/links/tmdb.png',
      brandColor: 'var(--color-brand-tmdb)',
    });
  }

  const imdbId = item.imdb_id || externalIds.imdb || externalIds.imdb_id;
  if (imdbId) {
    addLink({
      key: 'imdb',
      label: t('library.details.imdb') || 'IMDb',
      href: `https://www.imdb.com/title/${imdbId}`,
      iconSrc: '/links/imdb.png',
      brandColor: 'var(--color-brand-imdb)',
    });
  }

  if (item.homepage) {
    addLink({
      key: 'website',
      label: t('library.details.website') || 'Website',
      href: item.homepage,
      iconSrc: '/links/homepage.png',
      brandColor: 'var(--color-text-primary)',
    });
  }

  return links;
}

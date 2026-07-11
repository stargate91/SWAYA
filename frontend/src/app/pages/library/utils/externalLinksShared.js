export function getIconForUrl(url, key, fallback = null) {
  const keyLower = String(key || '').toLowerCase();
  if (keyLower === 'x') return '/links/x.svg';
  if (keyLower === 'twitter') return '/links/twitter.png';

  try {
    const hostname = new URL(url).hostname.replace('www.', '').toLowerCase();
    if (hostname.includes('twitter.com')) return '/links/twitter.png';
    if (hostname.includes('x.com')) return '/links/x.svg';
    if (hostname.includes('instagram.com')) return '/links/instagram.ico';
    if (hostname.includes('tiktok.com')) return '/links/tiktok.png';
    if (hostname.includes('wikidata.org')) return '/links/wikidata.svg';
    if (hostname.includes('facebook.com')) return '/links/facebook.ico';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return '/links/youtube.ico';
    if (hostname.includes('onlyfans.com')) return '/links/onylfans.ico';
    if (hostname.includes('fansly.com')) return '/links/fansly.png';
    if (hostname.includes('patreon.com')) return '/links/patreon.ico';
    if (hostname.includes('pornhub.com')) return '/links/pornhub.ico';
    if (hostname.includes('manyvids.com')) return '/links/manyvids.ico';
    if (hostname.includes('linktr.ee')) return '/links/linktree.png';
    if (hostname.includes('stashdb.org')) return '/links/stashdb.png';
    if (hostname.includes('theporndb.net') || hostname.includes('theporndb.org')) return '/links/theporndb.png';
    if (hostname.includes('fansdb.cc') || hostname.includes('fansdb.xyz')) return '/links/fansdb.webp';
    if (hostname.includes('threads.net')) return '/links/threads.png';
    if (hostname.includes('twitch.tv')) return '/links/twitch.jpg';
    if (hostname.includes('kick.com')) return '/links/kick.ico';
    if (hostname.includes('bluesky.app')) return '/links/bluesky.png';
    if (hostname.includes('clips4sale.com')) return '/links/clip4sale.ico';
    if (hostname.includes('allmylinks.com')) return '/links/allmylinks.ico';
    if (hostname.includes('beacons.ai')) return '/links/beacons.png';
    if (hostname.includes('iafd.com')) return '/links/iafd.ico';
    if (hostname.includes('babepedia.com')) return '/links/babepedia.ico';
    if (hostname.includes('freeones.com')) return '/links/freeones.png';
    if (hostname.includes('data18.com')) return '/links/data18.ico';
    if (hostname.includes('themoviedb.org')) return '/links/tmdb.png';
    if (hostname.includes('imdb.com')) return '/links/imdb.png';
  } catch {
    /* ignore invalid URL */
  }
  return fallback;
}

export function getBrandColorForKey(key) {
  const colors = {
    tmdb: 'var(--color-brand-tmdb)',
    imdb: 'var(--color-brand-imdb)',
    stashdb: 'var(--color-brand-stashdb)',
    fansdb: 'var(--color-brand-fansdb)',
    porndb: 'var(--color-brand-porndb)',
    onlyfans: 'var(--color-brand-onlyfans)',
    fansly: 'var(--color-brand-fansly)',
    patreon: 'var(--color-brand-patreon)',
    instagram: 'var(--color-brand-instagram)',
    facebook: 'var(--color-brand-facebook)',
    twitter: 'var(--color-brand-twitter)',
    x: 'var(--color-brand-threads)',
    youtube: 'var(--color-brand-youtube)',
    tiktok: 'var(--color-brand-tiktok)',
    threads: 'var(--color-brand-threads)',
    twitch: 'var(--color-brand-twitch)',
    kick: 'var(--color-brand-kick)',
    bluesky: 'var(--color-brand-bluesky)',
    loyalfans: 'var(--color-brand-loyalfans)',
    manyvids: 'var(--color-brand-manyvids)',
    linktree: 'var(--color-brand-linktree)',
    pornhub: 'var(--color-brand-pornhub)',
    clips4sale: 'var(--color-brand-clips4sale)',
    allmylinks: 'var(--color-brand-allmylinks)',
    beacons: 'var(--color-brand-beacons)',
    iafd: 'var(--color-brand-iafd)',
    babepedia: 'var(--color-brand-babepedia)',
    freeones: 'var(--color-brand-freeones)',
    theporndb: 'var(--color-brand-porndb)',
    data18: 'var(--color-brand-data18)',
    website: 'var(--color-brand-website)',
  };
  return colors[key?.toLowerCase()] || 'var(--color-text-primary)';
}

export function detectSiteName(url, site) {
  if (site && site !== 'Link' && site !== 'Website' && site !== 'Other') {
    return site;
  }
  try {
    const hostname = new URL(url).hostname.replace('www.', '').toLowerCase();
    if (hostname.includes('onlyfans.com')) return 'OnlyFans';
    if (hostname.includes('fansly.com')) return 'Fansly';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'X (Twitter)';
    if (hostname.includes('instagram.com')) return 'Instagram';
    if (hostname.includes('tiktok.com')) return 'TikTok';
    if (hostname.includes('pornhub.com')) return 'Pornhub';
    if (hostname.includes('stashdb.org')) return 'StashDB';
    if (hostname.includes('theporndb.net') || hostname.includes('theporndb.org')) return 'ThePornDB';
    if (hostname.includes('fansdb.cc') || hostname.includes('fansdb.xyz')) return 'FansDB';
    if (hostname.includes('manyvids.com')) return 'ManyVids';
    if (hostname.includes('fancentro.com')) return 'Fancentro';
    if (hostname.includes('babepedia.com')) return 'Babepedia';
    if (hostname.includes('freeones.com')) return 'FreeOnes';
    if (hostname.includes('iafd.com')) return 'IAFD';
    if (hostname.includes('data18.com')) return 'Data18';
    if (hostname.includes('wikidata.org')) return 'Wikidata';
    if (hostname.includes('imdb.com')) return 'IMDb';
    if (hostname.includes('themoviedb.org')) return 'TMDb';
    if (hostname.includes('linktr.ee')) return 'Linktree';
    if (hostname.includes('thenude.com')) return 'theNude';
    if (hostname.includes('eurobabeindex.com')) return 'EuroBabeIndex';
    if (hostname.includes('adultfilmdatabase.com')) return 'AFDB';
    if (hostname.includes('facebook.com')) return 'Facebook';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';

    const parts = hostname.split('.');
    if (parts.length > 1) {
      const domain = parts[parts.length - 2];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    return hostname;
  } catch {
    return site || 'Link';
  }
}

export function createLinkAdder(links, seenUrls, seenKeys) {
  return function addLink(linkObj) {
    if (!linkObj.href) return;
    try {
      const normalized = new URL(linkObj.href).href.replace(/\/$/, '').toLowerCase();
      if (seenUrls.has(normalized) || seenKeys.has(linkObj.key)) return;
      seenUrls.add(normalized);
      seenKeys.add(linkObj.key);
      links.push(linkObj);
    } catch {
      if (seenUrls.has(linkObj.href.toLowerCase()) || seenKeys.has(linkObj.key)) return;
      seenUrls.add(linkObj.href.toLowerCase());
      seenKeys.add(linkObj.key);
      links.push(linkObj);
    }
  };
}

export function resolveSocialLinks(externalLinks) {
  if (!Array.isArray(externalLinks)) return [];

  // Only show links that have a real specific icon file in /links/ (including homepage/website)
  const knownIcons = new Set([
    '/links/tmdb.png', '/links/stashdb.png', '/links/fansdb.webp', '/links/theporndb.png',
    '/links/imdb.png', '/links/instagram.ico', '/links/instagram.svg',
    '/links/facebook.ico', '/links/facebook.svg', '/links/x.svg',
    '/links/tiktok.png', '/links/tiktok.svg', '/links/youtube.ico', '/links/youtube.svg',
    '/links/onylfans.ico', '/links/fansly.png', '/links/pornhub.ico',
    '/links/manyvids.ico', '/links/patreon.ico', '/links/linktree.png',
    '/links/threads.png', '/links/twitch.jpg', '/links/kick.ico',
    '/links/bluesky.png', '/links/clip4sale.ico', '/links/allmylinks.ico',
    '/links/beacons.png', '/links/iafd.ico', '/links/babepedia.ico',
    '/links/freeones.png', '/links/data18.ico', '/links/homepage.png',
    '/links/twitter.png', '/links/website.svg'
  ]);

  const allLinks = externalLinks.filter(link =>
    link?.iconSrc && knownIcons.has(link.iconSrc)
  );

  // Left-to-right display priority order (imdb, website, homepage on the far right / highest priority)
  const order = [
    'clip4sale', 'manyvids', 'pornhub', 'data18', 'babepedia', 'iafd', 'freeones',
    'facebook', 'threads', 'bluesky', 'kick', 'twitch', 'fansly', 'onlyfans', 'patreon', 'beacons', 'linktree', 'youtube', 'tiktok', 'twitter', 'x', 'instagram',
    'theporndb', 'porndb', 'fansdb', 'stashdb', 'stash', 'tmdb', 'imdb', 'website', 'homepage'
  ];

  const getCleanKey = (link) => {
    const icon = String(link.iconSrc || '').toLowerCase();
    if (icon.includes('tmdb')) return 'tmdb';
    if (icon.includes('imdb')) return 'imdb';
    if (icon.includes('stashdb')) return 'stashdb';
    if (icon.includes('fansdb')) return 'fansdb';
    if (icon.includes('theporndb') || icon.includes('porndb')) return 'porndb';
    if (icon.includes('instagram')) return 'instagram';
    if (icon.includes('x.svg')) return 'x';
    if (icon.includes('twitter')) return 'twitter';
    if (icon.includes('tiktok')) return 'tiktok';
    if (icon.includes('youtube')) return 'youtube';
    if (icon.includes('onlyfans') || icon.includes('onylfans')) return 'onlyfans';
    if (icon.includes('fansly')) return 'fansly';
    if (icon.includes('patreon')) return 'patreon';
    if (icon.includes('pornhub')) return 'pornhub';
    if (icon.includes('manyvids')) return 'manyvids';
    if (icon.includes('linktree')) return 'linktree';
    if (icon.includes('threads')) return 'threads';
    if (icon.includes('twitch')) return 'twitch';
    if (icon.includes('kick')) return 'kick';
    if (icon.includes('bluesky')) return 'bluesky';
    if (icon.includes('clip4sale')) return 'clip4sale';
    if (icon.includes('allmylinks')) return 'allmylinks';
    if (icon.includes('beacons')) return 'beacons';
    if (icon.includes('iafd')) return 'iafd';
    if (icon.includes('babepedia')) return 'babepedia';
    if (icon.includes('freeones')) return 'freeones';
    if (icon.includes('data18')) return 'data18';
    if (icon.includes('homepage') || icon.includes('website')) return 'homepage';
    return String(link.key || '').toLowerCase();
  };

  const sorted = [...allLinks].sort((a, b) => {
    const keyA = getCleanKey(a);
    const keyB = getCleanKey(b);
    const idxA = order.indexOf(keyA);
    const idxB = order.indexOf(keyB);
    
    const cleanIdxA = idxA === -1 ? 999 : idxA;
    const cleanIdxB = idxB === -1 ? 999 : idxB;
    
    return cleanIdxA - cleanIdxB;
  });

  const seenIcons = new Set();
  const uniqueLinks = [];
  for (const link of sorted) {
    if (!link.iconSrc) continue;
    if (!seenIcons.has(link.iconSrc)) {
      seenIcons.add(link.iconSrc);
      uniqueLinks.push(link);
    }
  }

  return uniqueLinks;
}


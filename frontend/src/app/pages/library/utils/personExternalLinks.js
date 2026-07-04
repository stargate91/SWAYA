import { getIconForUrl, getBrandColorForKey, detectSiteName, createLinkAdder } from './externalLinksShared';

export function buildPersonExternalLinks(item, t) {
  if (!item?.id) {
    return [];
  }

  const links = [];
  const seenUrls = new Set();
  const seenKeys = new Set();
  const addLink = createLinkAdder(links, seenUrls, seenKeys);

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
        iconSrc: getIconForUrl(href, key),
        brandColor: getBrandColorForKey(key),
      });
    });
  }

  const externalIds = item.external_ids || {};
  const tmdbId = externalIds.tmdb_id || (!item.is_adult && Number(item.id) < 100000000 ? item.id : null);
  if (tmdbId) {
    addLink({
      key: 'tmdb',
      label: t('library.details.tmdb') || 'TMDb',
      href: `https://www.themoviedb.org/person/${tmdbId}`,
      iconSrc: '/links/tmdb.png',
      brandColor: 'var(--color-brand-tmdb)',
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

  if (externalIds.imdb_id) {
    addLink({
      key: 'imdb',
      label: t('library.details.imdb') || 'IMDb',
      href: `https://www.imdb.com/name/${externalIds.imdb_id}`,
      iconSrc: '/links/imdb.png',
      brandColor: 'var(--color-brand-imdb)',
    });
  }

  const instagramId = externalIds.instagram_id || externalIds.instagram;
  if (instagramId) {
    addLink({
      key: 'instagram',
      label: 'Instagram',
      href: String(instagramId).startsWith('http') ? instagramId : `https://www.instagram.com/${instagramId}`,
      iconSrc: '/links/instagram.ico',
      brandColor: getBrandColorForKey('instagram'),
    });
  }

  const facebookId = externalIds.facebook_id || externalIds.facebook;
  if (facebookId) {
    addLink({
      key: 'facebook',
      label: 'Facebook',
      href: String(facebookId).startsWith('http') ? facebookId : `https://www.facebook.com/${facebookId}`,
      iconSrc: '/links/facebook.ico',
      brandColor: getBrandColorForKey('facebook'),
    });
  }

  const twitterId = externalIds.twitter_id || externalIds.twitter || externalIds.x || externalIds.x_id;
  if (twitterId) {
    const isXUrl = String(twitterId).includes('x.com') || externalIds.x || externalIds.x_id;
    const cleanId = String(twitterId).replace(/https?:\/\/(www\.)?(twitter|x)\.com\//i, '');
    addLink({
      key: isXUrl ? 'x' : 'twitter',
      label: isXUrl ? 'X' : 'Twitter',
      href: String(twitterId).startsWith('http') ? twitterId : (isXUrl ? `https://x.com/${cleanId}` : `https://twitter.com/${cleanId}`),
      iconSrc: isXUrl ? '/links/x.svg' : '/links/twitter.png',
      brandColor: isXUrl ? getBrandColorForKey('x') : getBrandColorForKey('twitter'),
    });
  }

  const youtubeId = externalIds.youtube_id || externalIds.youtube;
  if (youtubeId) {
    addLink({
      key: 'youtube',
      label: 'YouTube',
      href: String(youtubeId).startsWith('http') ? youtubeId : `https://www.youtube.com/${String(youtubeId).startsWith('@') ? youtubeId : `@${youtubeId}`}`,
      iconSrc: '/links/youtube.ico',
      brandColor: getBrandColorForKey('youtube'),
    });
  }

  const tiktokId = externalIds.tiktok_id || externalIds.tiktok;
  if (tiktokId) {
    addLink({
      key: 'tiktok',
      label: 'TikTok',
      href: String(tiktokId).startsWith('http') ? tiktokId : `https://www.tiktok.com/@${String(tiktokId).replace(/^@/, '')}`,
      iconSrc: '/links/tiktok.png',
      brandColor: getBrandColorForKey('tiktok'),
    });
  }

  if (externalIds.threads_id) {
    addLink({
      key: 'threads',
      label: 'Threads',
      href: `https://www.threads.net/@${externalIds.threads_id.replace(/^@/, '')}`,
      iconSrc: '/links/threads.png',
      brandColor: getBrandColorForKey('threads'),
    });
  }

  if (externalIds.twitch_id) {
    addLink({
      key: 'twitch',
      label: 'Twitch',
      href: `https://www.twitch.tv/${externalIds.twitch_id}`,
      iconSrc: '/links/twitch.jpg',
      brandColor: getBrandColorForKey('twitch'),
    });
  }

  if (externalIds.kick_id) {
    addLink({
      key: 'kick',
      label: 'Kick',
      href: `https://kick.com/${externalIds.kick_id}`,
      iconSrc: '/links/kick.ico',
      brandColor: getBrandColorForKey('kick'),
    });
  }

  if (externalIds.bluesky_id) {
    addLink({
      key: 'bluesky',
      label: 'BlueSky',
      href: `https://bsky.app/profile/${externalIds.bluesky_id}`,
      iconSrc: '/links/bluesky.png',
      brandColor: getBrandColorForKey('bluesky'),
    });
  }

  if (externalIds.onlyfans_id) {
    addLink({
      key: 'onlyfans',
      label: 'OnlyFans',
      href: `https://onlyfans.com/${externalIds.onlyfans_id}`,
      iconSrc: '/links/onylfans.ico',
      brandColor: getBrandColorForKey('onlyfans'),
    });
  }

  if (externalIds.fansly_id) {
    addLink({
      key: 'fansly',
      label: 'Fansly',
      href: `https://fansly.com/${externalIds.fansly_id}`,
      iconSrc: '/links/fansly.png',
      brandColor: getBrandColorForKey('fansly'),
    });
  }

  if (externalIds.patreon_id) {
    addLink({
      key: 'patreon',
      label: 'Patreon',
      href: `https://www.patreon.com/${externalIds.patreon_id}`,
      iconSrc: '/links/patreon.ico',
      brandColor: getBrandColorForKey('patreon'),
    });
  }

  if (externalIds.loyalfans_id) {
    addLink({
      key: 'loyalfans',
      label: 'LoyalFans',
      href: `https://www.loyalfans.com/${externalIds.loyalfans_id}`,
      iconSrc: '/links/loyalfans.ico',
      brandColor: getBrandColorForKey('loyalfans'),
    });
  }

  if (externalIds.manyvids_id) {
    addLink({
      key: 'manyvids',
      label: 'ManyVids',
      href: `https://www.manyvids.com/${externalIds.manyvids_id}`,
      iconSrc: '/links/manyvids.ico',
      brandColor: getBrandColorForKey('manyvids'),
    });
  }

  if (externalIds.linktree_id) {
    addLink({
      key: 'linktree',
      label: 'Linktree',
      href: `https://linktr.ee/${externalIds.linktree_id}`,
      iconSrc: '/links/linktree.png',
      brandColor: getBrandColorForKey('linktree'),
    });
  }

  if (externalIds.pornhub_id) {
    addLink({
      key: 'pornhub',
      label: 'Pornhub',
      href: `https://www.pornhub.com/${externalIds.pornhub_id}`,
      iconSrc: '/links/pornhub.ico',
      brandColor: getBrandColorForKey('pornhub'),
    });
  }

  if (externalIds.clips4sale_id) {
    addLink({
      key: 'clips4sale',
      label: 'Clips4Sale',
      href: `https://www.clips4sale.com/${externalIds.clips4sale_id}`,
      iconSrc: '/links/clip4sale.ico',
      brandColor: getBrandColorForKey('clips4sale'),
    });
  }

  if (externalIds.allmylinks_id) {
    addLink({
      key: 'allmylinks',
      label: 'AllMyLinks',
      href: `https://allmylinks.com/${externalIds.allmylinks_id}`,
      iconSrc: '/links/allmylinks.ico',
      brandColor: getBrandColorForKey('allmylinks'),
    });
  }

  if (externalIds.beacons_id) {
    addLink({
      key: 'beacons',
      label: 'Beacons',
      href: `https://beacons.ai/${externalIds.beacons_id}`,
      iconSrc: '/links/beacons.png',
      brandColor: getBrandColorForKey('beacons'),
    });
  }

  if (externalIds.iafd_id) {
    addLink({
      key: 'iafd',
      label: 'IAFD',
      href: `https://www.iafd.com/person.rme/${externalIds.iafd_id}`,
      iconSrc: '/links/iafd.ico',
      brandColor: getBrandColorForKey('iafd'),
    });
  }

  if (externalIds.babepedia_id) {
    addLink({
      key: 'babepedia',
      label: 'Babepedia',
      href: `https://www.babepedia.com/babe/${externalIds.babepedia_id}`,
      iconSrc: '/links/babepedia.ico',
      brandColor: getBrandColorForKey('babepedia'),
    });
  }

  if (externalIds.freeones_id) {
    addLink({
      key: 'freeones',
      label: 'FreeOnes',
      href: `https://www.freeones.com/${externalIds.freeones_id}`,
      iconSrc: '/links/freeones.png',
      brandColor: getBrandColorForKey('freeones'),
    });
  }

  if (externalIds.data18_id) {
    addLink({
      key: 'data18',
      label: 'DATA18',
      href: `https://www.data18.com/star/${externalIds.data18_id}`,
      iconSrc: '/links/data18.ico',
      brandColor: getBrandColorForKey('data18'),
    });
  }

  if (externalIds.stashdb_id) {
    addLink({
      key: 'stashdb',
      label: 'StashDB',
      href: `https://stashdb.org/performers/${externalIds.stashdb_id}`,
      iconSrc: '/links/stashdb.png',
      brandColor: getBrandColorForKey('stashdb'),
    });
  }

  if (externalIds.fansdb_id) {
    addLink({
      key: 'fansdb',
      label: 'FansDB',
      href: `https://fansdb.cc/performers/${externalIds.fansdb_id}`,
      iconSrc: '/links/fansdb.webp',
      brandColor: getBrandColorForKey('fansdb'),
    });
  }

  if (externalIds.theporndb_id) {
    addLink({
      key: 'theporndb',
      label: 'THEPornDB',
      href: `https://theporndb.net/performers/${externalIds.theporndb_id}`,
      iconSrc: '/links/theporndb.png',
      brandColor: getBrandColorForKey('theporndb'),
    });
  }

  if (Array.isArray(externalIds.urls)) {
    externalIds.urls.forEach((u, i) => {
      if (u && u.url) {
        addLink({
          key: `extra-${i}`,
          label: detectSiteName(u.url, u.site),
          href: u.url,
          iconSrc: getIconForUrl(u.url),
          brandColor: 'var(--color-text-primary)',
        });
      }
    });
  }

  return links;
}

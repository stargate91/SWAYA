import { useMemo } from 'react';
import { buildMediaExternalLinks } from '../utils/externalLinksUtils';

export default function useMediaSocialLinks(item, t, type) {
  const externalLinks = useMemo(
    () => buildMediaExternalLinks(item, t, type),
    [item, t, type]
  );

  const socialLinks = useMemo(() => {
    if (!item) return [];
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
      '/links/twitter.png', '/links/website.svg',
    ]);
    const allLinks = externalLinks.filter(link =>
      link.iconSrc && knownIcons.has(link.iconSrc)
    );
    const order = ['theporndb', 'fansdb', 'stashdb', 'tmdb', 'imdb', 'website', 'instagram', 'facebook', 'x', 'twitter', 'tiktok', 'youtube'];
    const ordered = [];
    for (const key of order) {
      const found = allLinks.find(l => l.key === key);
      if (found) {
        ordered.push(found);
      }
    }
    for (const link of allLinks) {
      if (!order.includes(link.key)) {
        ordered.push(link);
      }
    }
    const seenIcons = new Set();
    const uniqueLinks = [];
    for (const link of ordered) {
      if (!link.iconSrc) continue;
      const isGeneric = link.iconSrc.includes('homepage') || link.iconSrc.includes('website');
      if (isGeneric || !seenIcons.has(link.iconSrc)) {
        seenIcons.add(link.iconSrc);
        uniqueLinks.push(link);
      }
    }
    return uniqueLinks;
  }, [externalLinks, item]);

  return socialLinks;
}

import { useMemo } from 'react';
import { buildMediaExternalLinks, resolveSocialLinks } from '../utils/externalLinksUtils';

export default function useMediaSocialLinks(item, t, type) {
  const externalLinks = useMemo(
    () => buildMediaExternalLinks(item, t, type),
    [item, t, type]
  );

  const socialLinks = useMemo(() => {
    if (!item) return [];
    return resolveSocialLinks(externalLinks);
  }, [externalLinks, item]);

  return socialLinks;
}

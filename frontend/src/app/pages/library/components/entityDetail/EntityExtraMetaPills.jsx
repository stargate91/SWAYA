 
import { Ruler, Globe, Eye, Palette, Brush, Gem } from '@/ui/icons';
import Pill from '@/ui/Pill';

const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatListAttribute = (list) => {
  if (!list) return null;
  if (Array.isArray(list)) {
    if (list.length === 0) return null;
    const locations = list.map(item => item.location || item.description).filter(Boolean);
    if (locations.length === 0) return 'Yes';
    return toTitleCase(locations.join(', '));
  }
  if (typeof list === 'string') {
    const formatted = toTitleCase(list);
    if (formatted === 'No Piercings' || formatted === 'No Tattoos') return 'No';
    return formatted;
  }
  return null;
};

export default function EntityExtraMetaPills({ isPeople, item, t }) {
  if (!isPeople || !item) return null;

  const externalIds = item.external_ids || {};
  const attrs = externalIds.attributes || {};

  const tattooText = formatListAttribute(attrs.tattoos);
  const piercingText = formatListAttribute(attrs.piercings);

  const COLON_SPACE = ': ';

  // For tattoos
  let tattooPillText = null;
  let tattooTooltip = null;
  if (tattooText) {
    if (Array.isArray(attrs.tattoos)) {
      tattooPillText = `${t('library.details.tattoos') || 'Tattoos'}${COLON_SPACE}${attrs.tattoos.length}`;
      tattooTooltip = tattooText;
    } else if (tattooText.length <= 16) {
      tattooPillText = `${t('library.details.tattoos') || 'Tattoos'}${COLON_SPACE}${tattooText}`;
    } else {
      tattooPillText = `${t('library.details.tattoos') || 'Tattoos'}${COLON_SPACE}Yes`;
      tattooTooltip = tattooText;
    }
  }

  // For piercings
  let piercingPillText = null;
  let piercingTooltip = null;
  if (piercingText) {
    if (Array.isArray(attrs.piercings)) {
      piercingPillText = `${t('library.details.piercings') || 'Piercings'}${COLON_SPACE}${attrs.piercings.length}`;
      piercingTooltip = piercingText;
    } else if (piercingText.length <= 16) {
      piercingPillText = `${t('library.details.piercings') || 'Piercings'}${COLON_SPACE}${piercingText}`;
    } else {
      piercingPillText = `${t('library.details.piercings') || 'Piercings'}${COLON_SPACE}Yes`;
      piercingTooltip = piercingText;
    }
  }

  const CM_SUFFIX = ' cm';

  return (
    <>
      {attrs.height && (
        <Pill variant="meta" icon={<Ruler size={14} />}>
          {attrs.height}{CM_SUFFIX}
        </Pill>
      )}
      {attrs.measurements && (
        <Pill variant="meta" icon={<Ruler size={14} />}>
          {attrs.measurements}
        </Pill>
      )}
      {attrs.ethnicity && (
        <Pill variant="meta" icon={<Globe size={14} />}>
          {toTitleCase(attrs.ethnicity)}
        </Pill>
      )}
      {attrs.eye_color && (
        <Pill variant="meta" icon={<Eye size={14} />}>
          {toTitleCase(attrs.eye_color)}
        </Pill>
      )}
      {attrs.hair_color && (
        <Pill variant="meta" icon={<Palette size={14} />}>
          {toTitleCase(attrs.hair_color)}
        </Pill>
      )}
      {tattooPillText && (
        <Pill variant="meta" title={tattooTooltip || undefined} icon={<Brush size={14} />}>
          {tattooPillText}
        </Pill>
      )}
      {piercingPillText && (
        <Pill variant="meta" title={piercingTooltip || undefined} icon={<Gem size={14} />}>
          {piercingPillText}
        </Pill>
      )}
    </>
  );
}

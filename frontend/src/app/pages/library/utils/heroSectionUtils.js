import { getPosterImagePath, getProfileImagePath } from '@/lib/imageUrls';
import { resolveDetailsImageUrl } from './detailUtils';

export const toTitleCase = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const formatListAttr = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    const locations = val.map(i => i.location || i.description).filter(Boolean);
    if (locations.length === 0) return 'Yes';
    return toTitleCase(locations.join(', '));
  }
  if (typeof val === 'string') {
    const formatted = toTitleCase(val);
    if (formatted === 'No Piercings' || formatted === 'No Tattoos') return 'No';
    return formatted;
  }
  return null;
};

export const getCountryISO = (placeOfBirth) => {
  if (!placeOfBirth) return null;
  const place = placeOfBirth.trim().toUpperCase();
  const parts = place.split(',').map(p => p.trim());
  const lastPart = parts[parts.length - 1];

  const map = {
    'USA': 'US', 'UNITED STATES': 'US', 'UNITED STATES OF AMERICA': 'US',
    'HUNGARY': 'HU', 'MAGYARORSZÁG': 'HU',
    'GERMANY': 'DE', 'DEUTSCHLAND': 'DE',
    'UNITED KINGDOM': 'GB', 'UK': 'GB', 'GREAT BRITAIN': 'GB', 'ENGLAND': 'GB',
    'CANADA': 'CA', 'FRANCE': 'FR', 'SPAIN': 'ES', 'ITALY': 'IT',
    'RUSSIA': 'RU', 'RUSSIAN FEDERATION': 'RU',
    'AUSTRALIA': 'AU', 'JAPAN': 'JP', 'BRAZIL': 'BR',
    'NETHERLANDS': 'NL', 'POLAND': 'PL', 'UKRAINE': 'UA', 'SWEDEN': 'SE',
    'CZECH REPUBLIC': 'CZ', 'CZECHIA': 'CZ', 'SLOVAKIA': 'SK', 'AUSTRIA': 'AT',
    'CUBA': 'CU', 'COLOMBIA': 'CO', 'MEXICO': 'MX', 'ROMANIA': 'RO',
    'ARGENTINA': 'AR', 'BELGIUM': 'BE', 'SWITZERLAND': 'CH', 'CHINA': 'CN',
    'SOUTH KOREA': 'KR', 'KOREA': 'KR', 'PHILIPPINES': 'PH', 'THAILAND': 'TH',
    'VIETNAM': 'VN', 'NORWAY': 'NO', 'DENMARK': 'DK', 'FINLAND': 'FI',
    'BULGARIA': 'BG', 'GREECE': 'GR', 'TURKEY': 'TR', 'PORTUGAL': 'PT',
    'SOUTH AFRICA': 'ZA', 'NEW ZEALAND': 'NZ', 'VENEZUELA': 'VE',
  };
  return map[lastPart] || (lastPart.length === 2 ? lastPart : null);
};

export const getFlagEmoji = (countryISO) => {
  if (!countryISO) return '';
  const codePoints = countryISO
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '';
  }
};

export const calculateAliases = (alternateNames) => {
  const candidateAliases = alternateNames || [];
  let accumulatedLength = 0;
  
  const sidebarAliases = candidateAliases.slice(0, 4).map((alias, idx) => {
    accumulatedLength += alias.length + (idx > 0 ? 2 : 0);
    const isTruncated = accumulatedLength > 20 || idx >= 2;
    return {
      original: alias,
      isTruncated
    };
  });

  const drawerAliases = [
    ...sidebarAliases.filter(a => a.isTruncated).map(a => a.original),
    ...candidateAliases.slice(4)
  ];

  return {
    candidateAliases: candidateAliases.slice(0, 4),
    sidebarAliases,
    drawerAliases
  };
};
export const getOriginalImageUrlHelper = (isPeople, item, mediaUrl, API_BASE) => {
  const rawPath = isPeople ? getProfileImagePath(item) : getPosterImagePath(item);
  if (!rawPath) return mediaUrl || '';
  return resolveDetailsImageUrl(rawPath, API_BASE, isPeople ? 'originalPerson' : 'originalPoster');
};

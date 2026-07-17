

export const getFlagUrl = (code) => {
  const mapping = {
    en: 'gb', hu: 'hu', de: 'de', fr: 'fr', es: 'es', it: 'it',
    zh: 'cn', ko: 'kr', ru: 'ru', ja: 'jp', pt: 'pt', pl: 'pl'
  };
  const country = mapping[code] || 'un';
  return `https://flagcdn.com/w40/${country}.png`;
};

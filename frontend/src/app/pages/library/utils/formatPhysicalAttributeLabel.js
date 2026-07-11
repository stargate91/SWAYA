export const formatPhysicalAttributeLabel = (val) => {
  if (!val) return '';
  if (val.toUpperCase() === 'NA' || val.toUpperCase() === 'N/A') return 'N/A';
  return val
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word === 'na' || word === 'n/a') return 'N/A';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

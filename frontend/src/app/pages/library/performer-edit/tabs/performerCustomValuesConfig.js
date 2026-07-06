export const getGenderOptions = (t) => [
  { value: '1', label: t('library.performerEdit.female') || 'Female' },
  { value: '2', label: t('library.performerEdit.male') || 'Male' },
  { value: '0', label: t('common.other') || 'Other' },
];

export const getSameSexOnlyOptions = () => [
  { value: 'No', label: 'No' },
  { value: 'Yes', label: 'Yes' },
];

export const getBreastTypeOptions = (t) => [
  { value: 'NATURAL', label: t('library.performerEdit.breastTypes.natural') || 'Natural' },
  { value: 'FAKE', label: t('library.performerEdit.breastTypes.fake') || 'Fake / Implant' },
  { value: 'NA', label: t('library.performerEdit.breastTypes.na') || 'N/A' },
];

export const getCupSizeOptions = () => [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'DD', label: 'DD' },
  { value: 'DDD', label: 'DDD' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' },
  { value: 'H', label: 'H' },
  { value: 'I', label: 'I' },
  { value: 'J', label: 'J' },
  { value: 'K', label: 'K' },
];

export const getHairColorOptions = (t) => [
  { value: 'BLONDE', label: t('library.performerEdit.hairColors.blonde') || 'Blonde' },
  { value: 'BRUNETTE', label: t('library.performerEdit.hairColors.brunette') || 'Brunette' },
  { value: 'BLACK', label: t('library.performerEdit.hairColors.black') || 'Black' },
  { value: 'RED', label: t('library.performerEdit.hairColors.red') || 'Red' },
  { value: 'AUBURN', label: t('library.performerEdit.hairColors.auburn') || 'Auburn' },
  { value: 'GREY', label: t('library.performerEdit.hairColors.grey') || 'Grey' },
  { value: 'BALD', label: t('library.performerEdit.hairColors.bald') || 'Bald' },
  { value: 'VARIOUS', label: t('library.performerEdit.hairColors.various') || 'Various' },
  { value: 'WHITE', label: t('library.performerEdit.hairColors.white') || 'White' },
  { value: 'OTHER', label: t('common.other') || 'Other' },
];

export const getEyeColorOptions = (t) => [
  { value: 'BLUE', label: t('library.performerEdit.eyeColors.blue') || 'Blue' },
  { value: 'BROWN', label: t('library.performerEdit.eyeColors.brown') || 'Brown' },
  { value: 'GREY', label: t('library.performerEdit.eyeColors.grey') || 'Grey' },
  { value: 'GREEN', label: t('library.performerEdit.eyeColors.green') || 'Green' },
  { value: 'HAZEL', label: t('library.performerEdit.eyeColors.hazel') || 'Hazel' },
  { value: 'RED', label: t('library.performerEdit.eyeColors.red') || 'Red' },
];

export const getEthnicityOptions = (t) => [
  { value: 'CAUCASIAN', label: t('library.performerEdit.ethnicities.caucasian') || 'Caucasian' },
  { value: 'BLACK', label: t('library.performerEdit.ethnicities.black') || 'Black' },
  { value: 'ASIAN', label: t('library.performerEdit.ethnicities.asian') || 'Asian' },
  { value: 'INDIAN', label: t('library.performerEdit.ethnicities.indian') || 'Indian' },
  { value: 'LATIN', label: t('library.performerEdit.ethnicities.latin') || 'Latin' },
  { value: 'MIDDLE_EASTERN', label: t('library.performerEdit.ethnicities.middle_eastern') || 'Middle Eastern' },
  { value: 'MIXED', label: t('library.performerEdit.ethnicities.mixed') || 'Mixed' },
  { value: 'OTHER', label: t('common.other') || 'Other' },
];

export const getButtShapeOptions = (t) => [
  { value: 'BUBBLE', label: t('library.performerEdit.buttShapes.bubble') || 'Bubble' },
  { value: 'HEART', label: t('library.performerEdit.buttShapes.heart') || 'Heart' },
  { value: 'SQUARE', label: t('library.performerEdit.buttShapes.square') || 'Square' },
  { value: 'FLAT', label: t('library.performerEdit.buttShapes.flat') || 'Flat' },
];

export const getButtSizeOptions = (t) => [
  { value: 'SMALL', label: t('library.performerEdit.buttSizes.small') || 'Small' },
  { value: 'MEDIUM', label: t('library.performerEdit.buttSizes.medium') || 'Medium' },
  { value: 'BIG', label: t('library.performerEdit.buttSizes.big') || 'Big' },
  { value: 'EXTRA_BIG', label: t('library.performerEdit.buttSizes.extra_big') || 'Extra Big' },
];

export const getDropdownOptions = (standardOptions, currentValue) => {
  if (!currentValue) return standardOptions;
  const upperValue = currentValue.toUpperCase();
  const exists = standardOptions.some(opt => opt.value === upperValue);
  if (exists) return standardOptions;
  const label = currentValue.charAt(0).toUpperCase() + currentValue.slice(1).toLowerCase();
  return [...standardOptions, { value: upperValue, label }];
};

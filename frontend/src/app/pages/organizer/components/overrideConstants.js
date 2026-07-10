export const SUBCATEGORIES_BY_CATEGORY = {
  video: [
    { value: 'trailer', label: 'Trailer' },
    { value: 'sample', label: 'Sample' },
    { value: 'behind_the_scenes', label: 'Behind the Scenes' },
    { value: 'featurette', label: 'Featurette' },
    { value: 'deleted_scenes', label: 'Deleted Scenes' },
    { value: 'interview', label: 'Interview' },
    { value: 'scene_comparison', label: 'Scene Comparison' },
    { value: 'short', label: 'Short' },
    { value: 'promo', label: 'Promo' },
    { value: 'clip', label: 'Clip' },
    { value: 'other', label: 'Other' },
  ],
  image: [
    { value: 'poster', label: 'Poster' },
    { value: 'fanart', label: 'Fanart' },
    { value: 'disc', label: 'Disc' },
    { value: 'backdrop', label: 'Backdrop' },
    { value: 'banner', label: 'Banner' },
    { value: 'thumbnail', label: 'Thumbnail' },
    { value: 'logo', label: 'Logo' },
    { value: 'clearlogo', label: 'Clearlogo' },
    { value: 'character_art', label: 'Character Art' },
    { value: 'other', label: 'Other' },
  ],
  subtitle: [
    { value: 'full', label: 'Full' },
    { value: 'forced', label: 'Forced' },
    { value: 'sdh', label: 'SDH' },
    { value: 'hearing_impaired', label: 'Hearing Impaired' },
    { value: 'commentary_sub', label: 'Commentary Sub' },
    { value: 'lyrics', label: 'Lyrics' },
    { value: 'other', label: 'Other' },
  ],
  audio: [
    { value: 'dubbed', label: 'Dubbed' },
    { value: 'original', label: 'Original' },
    { value: 'commentary_audio', label: 'Commentary Audio' },
    { value: 'descriptive', label: 'Descriptive' },
    { value: 'isolated_score', label: 'Isolated Score' },
    { value: 'other', label: 'Other' },
  ],
  metadata: [
    { value: 'nfo', label: 'NFO' },
    { value: 'xml', label: 'XML' },
    { value: 'json', label: 'JSON' },
    { value: 'txt', label: 'TXT' },
    { value: 'url', label: 'URL' },
    { value: 'other', label: 'Other' },
  ],
};

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English (English)' },
  { value: 'hu', label: 'Hungarian (Magyar)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'it', label: 'Italian (Italiano)' },
  { value: 'zh', label: 'Chinese (中文)' },
  { value: 'ko', label: 'Korean (한국어)' },
  { value: 'ru', label: 'Russian (Русский)' },
  { value: 'ja', label: 'Japanese (日本語)' },
  { value: 'pt', label: 'Portuguese (Português)' },
  { value: 'pl', label: 'Polish (Polski)' },
];

export const SOURCE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'bluray', label: 'Blu-Ray' },
  { value: 'web', label: 'WEB-DL' },
  { value: 'dvd', label: 'DVD' },
  { value: 'tv', label: 'TV HDTV' },
  { value: 'cam', label: 'CAM' },
];

export const EDITION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'theatrical', label: 'Theatrical Edition' },
  { value: 'directors_cut', label: "Director's Cut" },
  { value: 'extended', label: 'Extended Edition' },
  { value: 'unrated', label: 'Unrated' },
  { value: 'remastered', label: 'Remastered' },
  { value: 'special', label: 'Special Edition' },
  { value: 'ultimate', label: 'Ultimate' },
  { value: 'collectors_edition', label: "Collector's Edition" },
  { value: 'fan_edit', label: 'Fan Edit' },
];

export const AUDIO_TYPE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'mono', label: 'Mono' },
  { value: 'stereo', label: 'Stereo' },
  { value: 'surround', label: 'Surround Sound' },
  { value: 'dual_audio', label: 'Dual Audio' },
  { value: 'multi_audio', label: 'Multi Audio' },
];

export const MAIN_TYPE_OPTIONS = [
  { value: 'movie', label: 'Movie' },
  { value: 'episode', label: 'Episode' },
  { value: 'bonus', label: 'Bonus Video' },
];

import { useMemo, useCallback } from 'react';

export function useTranslatedOverrideOptions(t, isScenesMode = false) {
  const translate = useCallback((key, fallback) => {
    const val = t(key);
    return (val && val !== key) ? val : fallback;
  }, [t]);

  const translatedLanguageOptions = useMemo(() =>
    LANGUAGE_OPTIONS.map((opt) => ({
      ...opt,
      label: translate(`languages.${opt.value}`, opt.label),
    })),
    [translate]
  );

  const translatedSubcategoriesByCategory = useMemo(() => {
    const result = {};
    Object.keys(SUBCATEGORIES_BY_CATEGORY).forEach((catKey) => {
      result[catKey] = SUBCATEGORIES_BY_CATEGORY[catKey].map((opt) => ({
        ...opt,
        label: translate(`organizer.overrideModal.options.subcategories.${opt.value}`, opt.label),
      }));
    });
    return result;
  }, [translate]);

  const translatedSourceOptions = useMemo(() =>
    SOURCE_OPTIONS.map((opt) => ({
      ...opt,
      label: translate(`organizer.overrideModal.options.sources.${opt.value}`, opt.label),
    })),
    [translate]
  );

  const translatedEditionOptions = useMemo(() =>
    EDITION_OPTIONS.map((opt) => ({
      ...opt,
      label: translate(`organizer.overrideModal.options.editions.${opt.value}`, opt.label),
    })),
    [translate]
  );

  const translatedAudioTypeOptions = useMemo(() =>
    AUDIO_TYPE_OPTIONS.map((opt) => ({
      ...opt,
      label: translate(`organizer.overrideModal.options.audioTypes.${opt.value}`, opt.label),
    })),
    [translate]
  );

  const translatedMainTypeOptions = useMemo(() => {
    if (isScenesMode) {
      return [
        { value: 'scene', label: translate('organizer.overrideModal.options.mainTypes.scene', 'Scene') },
        { value: 'bonus', label: translate('organizer.overrideModal.options.mainTypes.bonus', 'Bonus Video') },
      ];
    }
    return MAIN_TYPE_OPTIONS.map((opt) => ({
      ...opt,
      label: translate(`organizer.overrideModal.options.mainTypes.${opt.value}`, opt.label),
    }));
  }, [translate, isScenesMode]);

  return {
    translatedLanguageOptions,
    translatedSubcategoriesByCategory,
    translatedSourceOptions,
    translatedEditionOptions,
    translatedAudioTypeOptions,
    translatedMainTypeOptions,
  };
}

/* eslint-disable react/jsx-no-literals, i18next/no-literal-string */
import Inline from '@/ui/Inline';
import Badge from '@/ui/Badge';
import SettingsInstructionsBox from '../components/SettingsInstructionsBox.jsx';

export function createAdultGeneralSection(t, adultGenderPreferenceOptions) {
  return {
    title: t('settingsPage.sections.adult.title'),
    eyebrow: t('settingsPage.sections.adult.eyebrow'),
    items: [
      {
        type: 'switch',
        field: 'include_adult',
        id: 'include_adult',
        hint: t('settingsPage.sections.adult.includeAdultHint'),
        hintClassName: 'ui-field__hint settings-hint--spaced',
        children: (
          <Inline gap="sm" align="center" className="settings-inline-switch">
            <span>{t('settingsPage.sections.adult.includeAdult')}</span>
            <Badge family="adult" tone="danger">
              {t('settingsPage.sections.adult.eighteenPlus')}
            </Badge>
          </Inline>
        ),
      },
      {
        type: 'select',
        field: 'adult_gender_preference',
        label: t('settingsPage.sections.adult.adultGenderPreference'),
        hint: t('settingsPage.sections.adult.adultGenderPreferenceHint'),
        options: adultGenderPreferenceOptions,
        visible: (context) => Boolean(context.include_adult),
      },
    ],
  };
}

export function createAdultStashdbSection(t) {
  return {
    title: t('settingsPage.sections.stashdb.title'),
    eyebrow: t('settingsPage.sections.stashdb.eyebrow'),
    gap: 'xl',
    items: [
      {
        type: 'text',
        field: 'stashdb_api_key',
        label: t('settingsPage.sections.stashdb.apiKey'),
        hint: t('settingsPage.sections.stashdb.apiKeyHint'),
        placeholder: "API Key...",
        inputType: 'password',
      },
      {
        type: 'text',
        field: 'stashdb_endpoint',
        label: t('settingsPage.sections.stashdb.endpoint'),
        hint: t('settingsPage.sections.stashdb.endpointHint'),
        placeholder: "https://stashdb.org/graphql",
      },
      {
        type: 'custom',
        key: 'stashdb-instructions',
        render: () => (
          <SettingsInstructionsBox
            title={t('settingsPage.sections.stashdb.stepsTitle')}
            steps={[
              <>{t('settingsPage.sections.stashdb.step1Start')}<a href="https://stashdb.org/" target="_blank" rel="noopener noreferrer" className="settings-link">stashdb.org</a>{t('settingsPage.sections.stashdb.step1End')}</>,
              <>{t('settingsPage.sections.stashdb.step2Start')}<a href="https://stashdb.org/users" target="_blank" rel="noopener noreferrer" className="settings-link">{t('settingsPage.sections.stashdb.step2Link')}</a>{t('settingsPage.sections.stashdb.step2End')}</>,
              t('settingsPage.sections.stashdb.step3'),
              t('settingsPage.sections.stashdb.step4'),
            ]}
          />
        ),
      },
    ],
  };
}

export function createAdultFansdbSection(t) {
  return {
    title: t('settingsPage.sections.fansdb.title'),
    eyebrow: t('settingsPage.sections.fansdb.eyebrow'),
    gap: 'xl',
    items: [
      {
        type: 'text',
        field: 'fansdb_api_key',
        label: t('settingsPage.sections.fansdb.apiKey'),
        hint: t('settingsPage.sections.fansdb.apiKeyHint'),
        placeholder: "API Key...",
        inputType: 'password',
      },
      {
        type: 'text',
        field: 'fansdb_endpoint',
        label: t('settingsPage.sections.fansdb.endpoint'),
        hint: t('settingsPage.sections.fansdb.endpointHint'),
        placeholder: "https://fansdb.cc/graphql",
      },
      {
        type: 'custom',
        key: 'fansdb-instructions',
        render: () => (
          <SettingsInstructionsBox
            title={t('settingsPage.sections.fansdb.stepsTitle')}
            steps={[
              <>{t('settingsPage.sections.fansdb.step1Start')}<a href="https://fansdb.cc/" target="_blank" rel="noopener noreferrer" className="settings-link">fansdb.cc</a>{t('settingsPage.sections.fansdb.step1End')}</>,
              <>{t('settingsPage.sections.fansdb.step2Start')}<strong>{t('settingsPage.sections.fansdb.step2Link')}</strong>{t('settingsPage.sections.fansdb.step2End')}</>,
              t('settingsPage.sections.fansdb.step3'),
              t('settingsPage.sections.fansdb.step4'),
            ]}
          />
        ),
      },
    ],
  };
}

export function createAdultTheporndbSection(t) {
  return {
    title: t('settingsPage.sections.theporndb.title'),
    eyebrow: t('settingsPage.sections.theporndb.eyebrow'),
    gap: 'xl',
    items: [
      {
        type: 'text',
        field: 'porndb_api_key',
        label: t('settingsPage.sections.theporndb.apiKey'),
        hint: t('settingsPage.sections.theporndb.apiKeyHint'),
        placeholder: "API Key...",
        inputType: 'password',
      },
      {
        type: 'text',
        field: 'porndb_endpoint',
        label: t('settingsPage.sections.theporndb.endpoint'),
        hint: t('settingsPage.sections.theporndb.endpointHint'),
        placeholder: "https://theporndb.net/graphql",
      },
      {
        type: 'custom',
        key: 'theporndb-instructions',
        render: () => (
          <SettingsInstructionsBox
            title={t('settingsPage.sections.theporndb.stepsTitle')}
            steps={[
              <>{t('settingsPage.sections.theporndb.step1Start')}<a href="https://theporndb.net/" target="_blank" rel="noopener noreferrer" className="settings-link">theporndb.net</a>{t('settingsPage.sections.theporndb.step1End')}</>,
              <>{t('settingsPage.sections.theporndb.step2Start')}<strong>{t('settingsPage.sections.theporndb.step2Link')}</strong>{t('settingsPage.sections.theporndb.step2End')}</>,
              t('settingsPage.sections.theporndb.step3'),
              t('settingsPage.sections.theporndb.step4'),
            ]}
          />
        ),
      },
    ],
  };
}

export function createAdultPreviewsSection(t) {
  return {
    title: t('settingsPage.sections.adultPreviews.title') || 'Hover Previews',
    eyebrow: t('settingsPage.sections.adultPreviews.eyebrow') || 'PREVIEWS',
    items: [
      {
        type: 'switch',
        field: 'hover_previews_enabled',
        id: 'hover_previews_enabled',
        children: (
          <span>{t('settingsPage.sections.adultPreviews.enable') || 'Enable Hover Previews'}</span>
        ),
      },
      {
        type: 'select',
        field: 'hover_previews_delay',
        label: t('settingsPage.sections.adultPreviews.delay') || 'Hover Delay',
        options: [
          { value: 200, label: '200 ms' },
          { value: 300, label: '300 ms' },
          { value: 400, label: '400 ms' },
          { value: 500, label: '500 ms' },
          { value: 600, label: '600 ms' },
          { value: 800, label: '800 ms' },
          { value: 1000, label: '1.0 s' },
          { value: 1200, label: '1.2 s' },
        ],
        visible: (context) => Boolean(context.hover_previews_enabled),
      },
      {
        type: 'select',
        field: 'hover_previews_duration',
        label: t('settingsPage.sections.adultPreviews.duration') || 'Clip Duration',
        options: [
          { value: 8, label: '8 seconds' },
          { value: 12, label: '12 seconds' },
          { value: 16, label: '16 seconds' },
          { value: 20, label: '20 seconds' },
          { value: 24, label: '24 seconds' },
        ],
        visible: (context) => Boolean(context.hover_previews_enabled),
      },
      {
        type: 'select',
        field: 'previews_cache_max_size_mb',
        label: t('settingsPage.sections.adultPreviews.cacheSize') || 'Max Cache Size',
        options: [
          { value: 500, label: '500 MB' },
          { value: 1024, label: '1 GB' },
          { value: 2048, label: '2 GB' },
          { value: 5120, label: '5 GB' },
          { value: 10240, label: '10 GB' },
          { value: -1, label: 'Unlimited' },
        ],
        visible: (context) => Boolean(context.hover_previews_enabled),
      },
      {
        type: 'select',
        field: 'previews_cache_max_age_days',
        label: t('settingsPage.sections.adultPreviews.cacheAge') || 'Max Cache Age',
        options: [
          { value: 7, label: '7 days' },
          { value: 14, label: '14 days' },
          { value: 30, label: '30 days' },
          { value: 90, label: '90 days' },
          { value: -1, label: 'Unlimited' },
        ],
        visible: (context) => Boolean(context.hover_previews_enabled),
      },
    ],
  };
}

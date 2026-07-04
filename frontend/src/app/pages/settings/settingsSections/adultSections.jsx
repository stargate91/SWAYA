import Inline from '@/ui/Inline';
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
            <span className="settings-badge settings-badge--danger">
              {t('settingsPage.sections.adult.eighteenPlus')}
            </span>
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

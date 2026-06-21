import Card from '@/ui/Card';
import Dropdown from '@/ui/Dropdown';
import Stack from '@/ui/Stack';
import { FOLDER_SCENE_TAGS, SCENE_TAGS } from '../settingsTemplateTags.js';
import { useTemplatePreview } from '../hooks';
import { useSettingsFormContext } from '../SettingsFormContext.jsx';
import TemplateFieldSection from './TemplateFieldSection.jsx';

export default function JavTab({
  form,
  t,
  handleChange,
  insertTag,
  formInputs,
}) {
  const getPreview = useTemplatePreview(form);
  const { renderContext } = useSettingsFormContext();
  const isScanActive = Boolean(renderContext?.isBackgroundActive);
  const studioName = form.naming_squeeze_studio_names ? 'AliceJapan' : 'Alice Japan';
  const parentStudioName = form.naming_squeeze_studio_names ? 'AliceGroup' : 'Alice Group';
  const performerSeparator = form.naming_performer_splitchar || ' & ';
  const tagBlacklist = new Set(
    String(form.scene_tag_blacklist || '')
      .split(',')
      .map((tag) => tag.trim().toLocaleLowerCase())
      .filter(Boolean)
  );
  const tagLimit = Math.max(0, Number.parseInt(form.scene_tag_limit, 10) || 0);
  let previewTags = ['AV', 'Debut', 'Featured', 'HD', 'Uncensored']
    .filter((tag) => !tagBlacklist.has(tag.toLocaleLowerCase()))
    .sort((left, right) => left.localeCompare(right));
  previewTags = tagLimit > 0 ? previewTags.slice(0, tagLimit) : [];
  const javContext = {
    date: '2024-06-14',
    studio: studioName,
    parent_studio: parentStudioName,
    studio_family: parentStudioName,
    performers: ['Yua Mikami'].join(performerSeparator),
    performer: ['Yua Mikami'].join(performerSeparator),
    tags: previewTags.join(form.scene_tag_separator || ' '),
  };
  const javPreview = getPreview(form.naming_jav_template, 'jav', { contextOverrides: javContext });
  const folderPreview = form.folder_jav_template
    ? getPreview(form.folder_jav_template, 'jav', { isFile: false, contextOverrides: javContext })
    : '';

  const groupingOptions = [
    { value: 'none', label: t('settingsPage.sections.jav.groupingOptions.none') },
    { value: 'studio', label: t('settingsPage.sections.jav.groupingOptions.studio') },
    { value: 'parent_studio', label: t('settingsPage.sections.jav.groupingOptions.parentStudio') },
    { value: 'parent_studio_studio', label: t('settingsPage.sections.jav.groupingOptions.parentStudioStudio') },
  ];

  return (
    <Stack gap="xl">
      <Card title={t('settingsPage.sections.jav.namingTitle')} eyebrow={t('settingsPage.sections.jav.eyebrow')}>
        <Stack gap="lg">
          <TemplateFieldSection
            t={t}
            inputRef={formInputs.namingJav}
            label={t('settingsPage.sections.jav.filenameTemplate')}
            hint={t('settingsPage.sections.jav.filenameTemplateHint')}
            value={form.naming_jav_template}
            disabled={isScanActive}
            onChange={handleChange('naming_jav_template')}
            placeholder="{studio} {performers} {date} {title} [{resolution}]"
            tags={SCENE_TAGS}
            fieldKey="naming_jav_template"
            insertTag={insertTag}
            previewText={javPreview}
          />
        </Stack>
      </Card>

      <Card title={t('settingsPage.sections.jav.groupingTitle')} eyebrow={t('settingsPage.sections.jav.eyebrow')}>
        <Stack gap="lg">
          <Dropdown
            label={t('settingsPage.sections.jav.groupingMode')}
            hint={t('settingsPage.sections.jav.groupingModeHint')}
            value={form.jav_grouping_mode}
            options={groupingOptions}
            disabled={isScanActive}
            onChange={handleChange('jav_grouping_mode')}
          />
          <TemplateFieldSection
            t={t}
            inputRef={formInputs.folderJav}
            label={t('settingsPage.sections.jav.folderTemplate')}
            hint={t('settingsPage.sections.jav.folderTemplateHint')}
            value={form.folder_jav_template}
            disabled={isScanActive}
            onChange={handleChange('folder_jav_template')}
            placeholder="{year} - {title}"
            tags={FOLDER_SCENE_TAGS}
            fieldKey="folder_jav_template"
            insertTag={insertTag}
            previewText={folderPreview}
          />
        </Stack>
      </Card>
    </Stack>
  );
}

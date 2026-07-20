import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Switch from '@/ui/Switch';
import { FOLDER_SHOW_TAGS, FOLDER_SEASON_TAGS, FOLDER_EPISODE_TAGS, EPISODE_TAGS } from '../settingsTemplateTags.js';
import { useTemplatePreview } from '../hooks';
import TemplateFieldSection from './TemplateFieldSection.jsx';
import SettingsLiveImpact from './SettingsLiveImpact.jsx';
import { useSettingsFormContext, useSettingsViewContext } from '../SettingsFormContext.jsx';
import styles from '../SettingsPage.module.css';

export default function TvShowsTab() {
  const { form, actions, formInputs } = useSettingsFormContext();
  const { t, realBackgroundActive } = useSettingsViewContext();
  const isScanActive = Boolean(realBackgroundActive);
  const getPreview = useTemplatePreview(form);

  const sortOptions = {
    enabled: form.folder_sort_by_type,
    moviesName: form.folder_movies_name,
    tvName: form.folder_tv_name
  };

  return (
    <Stack gap="xl">
      <Card
        title={t('settingsPage.sections.folderStructure.tvFoldersTitle')}
        eyebrow={t('settingsPage.sections.folderStructure.structureEyebrow')}
      >
        <Stack gap="xl">
          <h3 className="settings-section-heading">
            {t('settingsPage.sections.folderStructure.showFoldersTitle')}
          </h3>

          <div>
            <Switch
              id="folder_create_show_dir"
              checked={form.folder_create_show_dir}
              disabled={isScanActive}
              onChange={actions.handleCheckboxChange('folder_create_show_dir')}
            >
              {t('settingsPage.sections.folderStructure.createShowDir')}
            </Switch>
            <span className={`settings-field-hint ${styles['hint-block-compact']}`}>
              {t('settingsPage.sections.folderStructure.createShowDirHint')}
            </span>

            {form.folder_create_show_dir && (
              <TemplateFieldSection
                t={t}
                inputRef={formInputs.folderTv}
                label={t('settingsPage.sections.folderStructure.showTemplate')}
                value={form.folder_tv_template}
                disabled={isScanActive}
                onChange={actions.handleChange('folder_tv_template')}
                placeholder="{tv_title} ({year_range})"
                tags={FOLDER_SHOW_TAGS}
                fieldKey="folder_tv_template"
                insertTag={actions.insertTag}
                previewText={getPreview(form.folder_tv_template, 'tv', { isFile: false, sortOptions })}
                className={`${styles['nested-block']} ${styles['nested-block-top']}`}
              />
            )}
          </div>

          <div>
            <Switch
              id="folder_create_video_subdir"
              checked={form.folder_create_video_subdir}
              disabled={isScanActive}
              onChange={actions.handleCheckboxChange('folder_create_video_subdir')}
            >
              {t('settingsPage.sections.folderStructure.createVideoSubdir')}
            </Switch>
            <span className={`settings-field-hint ${styles['hint-block-compact']}`}>
              {t('settingsPage.sections.folderStructure.createVideoSubdirHint')}
            </span>
          </div>

          <h3 className="settings-section-heading">
            {t('settingsPage.sections.folderStructure.seasonEpisodeFoldersTitle')}
          </h3>

          <div>
            <Switch
              id="folder_create_season_dir"
              checked={form.folder_create_season_dir}
              disabled={isScanActive}
              onChange={actions.handleCheckboxChange('folder_create_season_dir')}
            >
              {t('settingsPage.sections.folderStructure.createSeasonDir')}
            </Switch>
            <span className={`settings-field-hint ${styles['hint-block-compact']}`}>
              {t('settingsPage.sections.folderStructure.createSeasonDirHint')}
            </span>

            {form.folder_create_season_dir && (
              <TemplateFieldSection
                t={t}
                inputRef={formInputs.folderSeason}
                label={t('settingsPage.sections.folderStructure.seasonTemplate')}
                value={form.folder_season_template}
                disabled={isScanActive}
                onChange={actions.handleChange('folder_season_template')}
                placeholder={t('settingsPage.sections.folderStructure.seasonTemplatePlaceholder')}
                tags={FOLDER_SEASON_TAGS}
                fieldKey="folder_season_template"
                insertTag={actions.insertTag}
                previewText={getPreview(form.folder_season_template, 'season', { isFile: false, sortOptions })}
                className={`${styles['nested-block']} ${styles['nested-block-top']}`}
              />
            )}
          </div>

          <div>
            <Switch
              id="folder_create_episode_dir"
              checked={form.folder_create_episode_dir}
              disabled={isScanActive}
              onChange={actions.handleCheckboxChange('folder_create_episode_dir')}
            >
              {t('settingsPage.sections.folderStructure.createEpisodeDir')}
            </Switch>
            <span className={`settings-field-hint ${styles['hint-block-compact']}`}>
              {t('settingsPage.sections.folderStructure.createEpisodeDirHint')}
            </span>

            {form.folder_create_episode_dir && (
              <TemplateFieldSection
                t={t}
                inputRef={formInputs.folderEpisode}
                label={t('settingsPage.sections.folderStructure.episodeTemplate')}
                value={form.folder_episode_template}
                disabled={isScanActive}
                onChange={actions.handleChange('folder_episode_template')}
                placeholder="Episode {episode}"
                tags={FOLDER_EPISODE_TAGS}
                fieldKey="folder_episode_template"
                insertTag={actions.insertTag}
                previewText={getPreview(form.folder_episode_template, 'episode', { isFile: false, sortOptions })}
                className={`${styles['nested-block']} ${styles['nested-block-top']}`}
              />
            )}
          </div>
        </Stack>
      </Card>

      <Card
        title={t('settingsPage.sections.fileNaming.episodeTemplateLabel')}
        eyebrow={t('settingsPage.sections.fileNaming.eyebrow')}
      >
        <Stack gap="lg">
          <TemplateFieldSection
            t={t}
            inputRef={formInputs.namingEpisode}
            label={t('settingsPage.sections.fileNaming.episodeTemplateLabel')}
            hint={t('settingsPage.sections.fileNaming.episodeTemplateHint')}
            value={form.naming_episode_template}
            disabled={isScanActive}
            onChange={actions.handleChange('naming_episode_template')}
            placeholder="{tv_title} - S{season}E{episode} - {episode_title}"
            tags={EPISODE_TAGS}
            fieldKey="naming_episode_template"
            insertTag={actions.insertTag}
            previewText={getPreview(form.naming_episode_template, 'episode')}
          />
        </Stack>
      </Card>

      <SettingsLiveImpact
        form={form}
        t={t}
        title={t('settingsPage.sections.liveImpact.title')}
        eyebrow={t('settingsPage.sections.liveImpact.eyebrow')}
        hint={t('settingsPage.sections.liveImpact.fileNamingHint')}
        filterType="tv"
      />
    </Stack>
  );
}

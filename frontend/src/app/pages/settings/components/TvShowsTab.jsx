import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Switch from '@/ui/Switch';
import { FOLDER_SHOW_TAGS, FOLDER_SEASON_TAGS, FOLDER_EPISODE_TAGS, EPISODE_TAGS } from '../settingsTemplateTags.js';
import { useTemplatePreview } from '../hooks';
import TemplateFieldSection from './TemplateFieldSection.jsx';
import SettingsLiveImpact from './SettingsLiveImpact.jsx';
import { useSettingsFormContext, useSettingsViewContext } from '../SettingsFormContext.jsx';
import styles from '../SettingsPage.module.css';

export default function TvShowsTab({ isAdult = false }) {
  const { form, actions, formInputs } = useSettingsFormContext();
  const { t, realBackgroundActive } = useSettingsViewContext();
  const isScanActive = Boolean(realBackgroundActive);
  const getPreview = useTemplatePreview(form);

  const sortOptions = {
    enabled: form.folder_sort_by_type,
    moviesName: form.folder_movies_name,
    tvName: form.folder_tv_name
  };

  const folderTvField = isAdult ? 'folder_adult_tv_template' : 'folder_tv_template';
  const folderSeasonField = isAdult ? 'folder_adult_season_template' : 'folder_season_template';
  const namingEpisodeField = isAdult ? 'naming_adult_episode_template' : 'naming_episode_template';

  return (
    <Stack gap="xl">
      <Card
        title={isAdult ? t('settingsPage.sections.folderStructure.adultTvFoldersTitle') : t('settingsPage.sections.folderStructure.tvFoldersTitle')}
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
                value={form[folderTvField]}
                disabled={isScanActive}
                onChange={actions.handleChange(folderTvField)}
                placeholder={isAdult ? "Leave empty to use standard TV folder pattern" : "{tv_title} ({year_range})"}
                tags={FOLDER_SHOW_TAGS}
                fieldKey={folderTvField}
                insertTag={actions.insertTag}
                previewText={getPreview(form[folderTvField] || form.folder_tv_template, 'tv', { isFile: false, sortOptions })}
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
                value={form[folderSeasonField]}
                disabled={isScanActive}
                onChange={actions.handleChange(folderSeasonField)}
                placeholder={isAdult ? "Leave empty to use standard season folder pattern" : t('settingsPage.sections.folderStructure.seasonTemplatePlaceholder')}
                tags={FOLDER_SEASON_TAGS}
                fieldKey={folderSeasonField}
                insertTag={actions.insertTag}
                previewText={getPreview(form[folderSeasonField] || form.folder_season_template, 'season', { isFile: false, sortOptions })}
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
        title={isAdult ? t('settingsPage.sections.folderStructure.adultEpisodeTemplateLabel') : t('settingsPage.sections.fileNaming.episodeTemplateLabel')}
        eyebrow={t('settingsPage.sections.fileNaming.eyebrow')}
      >
        <Stack gap="lg">
          <TemplateFieldSection
            t={t}
            inputRef={formInputs.namingEpisode}
            label={isAdult ? t('settingsPage.sections.folderStructure.adultEpisodeTemplateLabel') : t('settingsPage.sections.fileNaming.episodeTemplateLabel')}
            hint={isAdult ? "Configure a separate template for adult TV episodes, or leave empty to inherit standard TV naming style." : t('settingsPage.sections.fileNaming.episodeTemplateHint')}
            value={form[namingEpisodeField]}
            disabled={isScanActive}
            onChange={actions.handleChange(namingEpisodeField)}
            placeholder={isAdult ? "Leave empty to use standard episode file pattern" : "{tv_title} - S{season}E{episode} - {episode_title}"}
            tags={EPISODE_TAGS}
            fieldKey={namingEpisodeField}
            insertTag={actions.insertTag}
            previewText={getPreview(form[namingEpisodeField] || form.naming_episode_template, 'episode')}
          />
        </Stack>
      </Card>

      <SettingsLiveImpact
        form={form}
        t={t}
        title={t('settingsPage.sections.liveImpact.title')}
        eyebrow={t('settingsPage.sections.liveImpact.eyebrow')}
        hint={t('settingsPage.sections.liveImpact.fileNamingHint')}
        filterType={isAdult ? "adult_tv" : "tv"}
      />
    </Stack>
  );
}

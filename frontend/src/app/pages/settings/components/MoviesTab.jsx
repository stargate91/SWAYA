import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Switch from '@/ui/Switch';
import Dropdown from '@/ui/Dropdown';
import Input from '@/ui/Input';
import Hint from '@/ui/Hint';
import { MOVIE_TAGS, FOLDER_MOVIE_TAGS } from '../settingsTemplateTags.js';
import { useTemplatePreview } from '../hooks';
import { FOLDER_COLLECTION_MODES } from '../settingsConstants.js';
import TemplateFieldSection from './TemplateFieldSection.jsx';
import SettingsLiveImpact from './SettingsLiveImpact.jsx';
import { useSettingsFormContext, useSettingsViewContext } from '../SettingsFormContext.jsx';
import styles from '../SettingsPage.module.css';

export default function MoviesTab({ isAdult = false }) {
  const { form, setForm, actions, formInputs } = useSettingsFormContext();
  const { t, collectionModeOptions, realBackgroundActive } = useSettingsViewContext();
  const isScanActive = Boolean(realBackgroundActive);
  const getPreview = useTemplatePreview(form);

  const shouldShowCollectionThreshold = form.folder_collection_mode === FOLDER_COLLECTION_MODES.THRESHOLD;
  const sortOptions = {
    enabled: form.folder_sort_by_type,
    moviesName: form.folder_movies_name,
    tvName: form.folder_tv_name
  };

  const folderField = isAdult ? 'folder_adult_movie_template' : 'folder_movie_template';
  const namingField = isAdult ? 'naming_adult_movie_template' : 'naming_movie_template';

  return (
    <Stack gap="xl">
      <Card
        title={isAdult ? t('settingsPage.sections.folderStructure.adultMovieFoldersTitle') : t('settingsPage.sections.folderStructure.movieFoldersTitle')}
        eyebrow={t('settingsPage.sections.folderStructure.structureEyebrow')}
      >
        <Stack gap="lg">
          <div>
            <Switch
              id="folder_create_movie_subdir"
              checked={form.folder_create_movie_subdir}
              disabled={isScanActive}
              onChange={actions.handleCheckboxChange('folder_create_movie_subdir')}
            >
              {t('settingsPage.sections.folderStructure.createMovieSubdir')}
            </Switch>
            <span className={`settings-field-hint ${styles['hint-block-compact']}`}>
              {t('settingsPage.sections.folderStructure.createMovieSubdirHint')}
            </span>

            {form.folder_create_movie_subdir && (
              <TemplateFieldSection
                t={t}
                inputRef={formInputs.folderMovie}
                label={t('settingsPage.sections.folderStructure.movieTemplate')}
                value={form[folderField]}
                disabled={isScanActive}
                onChange={actions.handleChange(folderField)}
                placeholder={isAdult ? "Leave empty to use standard movie folder pattern" : "{title} ({year})"}
                tags={FOLDER_MOVIE_TAGS}
                fieldKey={folderField}
                insertTag={actions.insertTag}
                previewText={getPreview(form[folderField] || form.folder_movie_template, 'movie', { isFile: false, sortOptions })}
                className={`${styles['nested-block']} ${styles['nested-block-top']}`}
              />
            )}
          </div>
        </Stack>
      </Card>

      <Card
        title={isAdult ? t('settingsPage.sections.folderStructure.adultMovieTemplateLabel') : t('settingsPage.sections.fileNaming.movieTemplateLabel')}
        eyebrow={t('settingsPage.sections.fileNaming.eyebrow')}
      >
        <Stack gap="lg">
          <TemplateFieldSection
            t={t}
            inputRef={formInputs.namingMovie}
            label={isAdult ? t('settingsPage.sections.folderStructure.adultMovieTemplateLabel') : t('settingsPage.sections.fileNaming.movieTemplateLabel')}
            hint={isAdult ? "Configure a separate template for adult movies, or leave empty to inherit standard movie naming style." : t('settingsPage.sections.fileNaming.movieTemplateHint')}
            value={form[namingField]}
            disabled={isScanActive}
            onChange={actions.handleChange(namingField)}
            placeholder={isAdult ? "Leave empty to use standard movie file pattern" : "{title} ({year}) {resolution}"}
            tags={MOVIE_TAGS}
            fieldKey={namingField}
            insertTag={actions.insertTag}
            previewText={getPreview(form[namingField] || form.naming_movie_template, 'movie')}
          />
        </Stack>
      </Card>

      {!isAdult && (
        <Card
          title={t('settingsPage.sections.collections.title')}
          eyebrow={t('settingsPage.sections.collections.eyebrow')}
        >
          <Stack>
            <Switch
              id="folder_create_collection_dir"
              checked={form.folder_create_collection_dir}
              disabled={isScanActive}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm(prev => {
                  const next = { ...prev, folder_create_collection_dir: checked };
                  if (
                    checked &&
                    (next.folder_collection_mode === FOLDER_COLLECTION_MODES.NEVER || !next.folder_collection_mode)
                  ) {
                    next.folder_collection_mode = FOLDER_COLLECTION_MODES.THRESHOLD;
                  }
                  return next;
                });
              }}
            >
              {t('settingsPage.sections.collections.createCollectionDir')}
            </Switch>
            <Hint className={styles['hint-spaced']}>
              {t('settingsPage.sections.collections.createCollectionDirHint')}
            </Hint>

            {form.folder_create_collection_dir && (
              <Stack gap="lg">
                <Dropdown
                  label={t('settingsPage.sections.collections.collectionMode')}
                  value={form.folder_collection_mode}
                  options={collectionModeOptions}
                  disabled={isScanActive}
                  onChange={actions.handleChange('folder_collection_mode')}
                  hint={t('settingsPage.sections.collections.collectionModeHint')}
                />

                {shouldShowCollectionThreshold && (
                  <Input
                    label={t('settingsPage.sections.collections.collectionThreshold')}
                    value={form.folder_collection_threshold}
                    disabled={isScanActive}
                    onChange={actions.handleChange('folder_collection_threshold')}
                    placeholder="3"
                    type="number"
                    min="1"
                    hint={t('settingsPage.sections.collections.collectionThresholdHint')}
                  />
                )}

                <TemplateFieldSection
                  t={t}
                  inputRef={formInputs.folderCollection}
                  label={t('settingsPage.sections.collections.collectionTemplate')}
                  value={form.folder_collection_template}
                  disabled={isScanActive}
                  onChange={actions.handleChange('folder_collection_template')}
                  placeholder="{collection}"
                  tags={['{collection}']}
                  fieldKey="folder_collection_template"
                  insertTag={actions.insertTag}
                  previewText={getPreview(form.folder_collection_template, 'collection', { isFile: false, sortOptions })}
                />
              </Stack>
            )}
          </Stack>
        </Card>
      )}

      <SettingsLiveImpact
        form={form}
        t={t}
        title={t('settingsPage.sections.liveImpact.title')}
        eyebrow={t('settingsPage.sections.liveImpact.eyebrow')}
        hint={t('settingsPage.sections.liveImpact.fileNamingHint')}
        filterType={isAdult ? "adult_movies" : "movies"}
      />
    </Stack>
  );
}

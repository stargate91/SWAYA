import Card from '@/ui/Card';
import Stack from '@/ui/Stack';
import Switch from '@/ui/Switch';
import Input from '@/ui/Input';
import Dropdown from '@/ui/Dropdown';
import { useSettingsFormContext, useSettingsViewContext, useSettingsField } from '../SettingsFormContext.jsx';
import SettingsLiveImpact from './SettingsLiveImpact.jsx';
import SettingsSelectField from './fields/SettingsSelectField.jsx';
import SettingsTextField from './fields/SettingsTextField.jsx';
import GeneralFoldersSection from './GeneralFoldersSection.jsx';
import styles from '../SettingsPage.module.css';

export default function OrganizationGeneralTab() {
  const { form, actions } = useSettingsFormContext();
  const { t, casingOptions, separatorOptions, collisionOptions, realBackgroundActive } = useSettingsViewContext();
  const isScanActive = Boolean(realBackgroundActive);
  const collisionStrategyField = useSettingsField('collision_strategy');

  return (
    <Stack gap="xl">
      <GeneralFoldersSection t={t} />
      <Card
        title={t('settingsPage.sections.fileNaming.title')}
        eyebrow={t('settingsPage.sections.fileNaming.eyebrow')}
      >
        <Stack gap="xl">
          <h3 className="settings-section-heading">
            {t('settingsPage.sections.fileNaming.styleTitle')}
          </h3>
          <Stack gap="lg">
            <Dropdown
              label={t('settingsPage.sections.fileNaming.casingLabel')}
              hint={t('settingsPage.sections.fileNaming.casingHint')}
              value={form.naming_filename_casing}
              options={casingOptions}
              disabled={isScanActive}
              onChange={actions.handleChange('naming_filename_casing')}
            />
            <Dropdown
              label={t('settingsPage.sections.fileNaming.separatorLabel')}
              hint={t('settingsPage.sections.fileNaming.separatorHint')}
              value={form.naming_word_separator}
              options={separatorOptions}
              disabled={isScanActive}
              onChange={actions.handleChange('naming_word_separator')}
            />
          </Stack>

          <Stack gap="lg">
            <h3 className="settings-section-heading">
              {t('settingsPage.sections.fileNaming.templatesTitle')}
            </h3>
            <Input
              label={t('settingsPage.sections.fileNaming.customTagLabel')}
              hint={t('settingsPage.sections.fileNaming.customTagHint')}
              value={form.naming_custom_tag}
              disabled={isScanActive}
              onChange={actions.handleChange('naming_custom_tag')}
              placeholder={t('settingsPage.sections.fileNaming.defaultCustomTagPlaceholder')}
            />
          </Stack>

          <Stack gap="lg">
            <h3 className="settings-section-heading">
              {t('settingsPage.sections.fileNaming.fileTypesTitle')}
            </h3>
            <Input
              label={t('settingsPage.sections.fileNaming.videoExtsLabel')}
              hint={t('settingsPage.sections.fileNaming.videoExtsHint')}
              value={form.naming_video_exts}
              disabled={isScanActive}
              onChange={actions.handleChange('naming_video_exts')}
              placeholder=".mkv, .mp4, .avi, .m4v, .mov, .wmv, .mpg, .mpeg"
            />
          </Stack>
        </Stack>
      </Card>

      <Card
        title={t('settingsPage.sections.folderStructure.behaviorTitle')}
        eyebrow={t('settingsPage.sections.folderStructure.behaviorEyebrow')}
      >
        <Stack gap="lg">
          <Switch
            id="folder_organization_enabled"
            checked={form.folder_organization_enabled}
            disabled={isScanActive}
            onChange={actions.handleCheckboxChange('folder_organization_enabled')}
          >
            {t('settingsPage.sections.folderStructure.orgEnabled')}
          </Switch>
          <span className={`settings-field-hint ${styles['hint-tight-top']}`}>
            {t('settingsPage.sections.folderStructure.orgEnabledHint')}
          </span>

          {form.folder_organization_enabled && (
            <>
              <h3 className="settings-section-heading">
                {t('settingsPage.sections.folderStructure.destinationTitle')}
              </h3>
              <Switch
                id="folder_move_to_library"
                checked={form.folder_move_to_library}
                disabled={isScanActive}
                onChange={actions.handleCheckboxChange('folder_move_to_library')}
              >
                {t('settingsPage.sections.folderStructure.moveToLibrary')}
              </Switch>
              <span className={`settings-field-hint ${styles['hint-tight-top']}`}>
                {t('settingsPage.sections.folderStructure.moveToLibraryHint')}
              </span>

              {form.folder_move_to_library && (
                <>
                  <h3 className="settings-section-heading">
                    {t('settingsPage.sections.folderStructure.rootFoldersTitle')}
                  </h3>
                  <Switch
                    id="folder_sort_by_type"
                    checked={form.folder_sort_by_type}
                    disabled={isScanActive}
                    onChange={actions.handleCheckboxChange('folder_sort_by_type')}
                  >
                    {t('settingsPage.sections.folderStructure.sortByType')}
                  </Switch>
                  <span className={`settings-field-hint ${styles['hint-tight-top']}`}>
                    {t('settingsPage.sections.folderStructure.sortByTypeHint')}
                  </span>

                  {form.folder_sort_by_type && (
                    <div className={styles['nested-block']}>
                      <Stack gap="md">
                        <Input
                          label={t('settingsPage.sections.folderStructure.moviesDirName')}
                          value={form.folder_movies_name}
                          disabled={isScanActive}
                          onChange={actions.handleChange('folder_movies_name')}
                          placeholder={t('settingsPage.sections.folderStructure.defaultMoviesName')}
                        />
                        <Input
                          label={t('settingsPage.sections.folderStructure.tvDirName')}
                          value={form.folder_tv_name}
                          disabled={isScanActive}
                          onChange={actions.handleChange('folder_tv_name')}
                          placeholder={t('settingsPage.sections.folderStructure.defaultTvName')}
                        />
                        <Input
                          label={t('settingsPage.sections.folderStructure.videosDirName')}
                          value={form.folder_videos_name}
                          disabled={isScanActive}
                          onChange={actions.handleChange('folder_videos_name')}
                          placeholder={t('settingsPage.sections.folderStructure.defaultVideosName')}
                        />
                      </Stack>
                    </div>
                  )}

                  {form.include_adult && (
                    <Stack gap="md">
                      <h3 className="settings-section-heading">
                        {t('settingsPage.sections.folderStructure.adultFoldersTitle')}
                      </h3>
                      <Input
                        label={t('settingsPage.sections.folderStructure.adultDirName')}
                        value={form.folder_adult_name}
                        disabled={isScanActive}
                        onChange={actions.handleChange('folder_adult_name')}
                        placeholder={t('common.adult')}
                      />
                      <Switch
                        id="naming_adult_subfolders_enabled"
                        checked={form.naming_adult_subfolders_enabled}
                        disabled={isScanActive}
                        onChange={actions.handleCheckboxChange('naming_adult_subfolders_enabled')}
                      >
                        {t('settingsPage.sections.folderStructure.organizeAdultByType')}
                      </Switch>
                      <span className={`settings-field-hint ${styles['hint-tight-top']}`}>
                        {t('settingsPage.sections.folderStructure.organizeAdultByTypeHint')}
                      </span>
                      {form.naming_adult_subfolders_enabled && (
                        <div className={styles['nested-block']}>
                          <Stack gap="md">
                            <Input
                              label={t('settingsPage.sections.folderStructure.adultMoviesDirName')}
                              value={form.folder_adult_movies_name}
                              disabled={isScanActive}
                              onChange={actions.handleChange('folder_adult_movies_name')}
                              placeholder={t('settingsPage.sections.folderStructure.defaultAdultMoviesName')}
                            />
                            <Input
                              label={t('settingsPage.sections.folderStructure.adultTvDirName')}
                              value={form.folder_adult_tv_name}
                              disabled={isScanActive}
                              onChange={actions.handleChange('folder_adult_tv_name')}
                              placeholder={t('settingsPage.sections.folderStructure.defaultAdultTvName')}
                            />
                            <Input
                              label={t('settingsPage.sections.folderStructure.adultScenesDirName')}
                              value={form.folder_adult_scenes_name}
                              disabled={isScanActive}
                              onChange={actions.handleChange('folder_adult_scenes_name')}
                              placeholder={t('settingsPage.sections.folderStructure.defaultAdultScenesName')}
                            />
                            <Input
                              label={t('settingsPage.sections.folderStructure.adultVideosDirName')}
                              value={form.folder_adult_videos_name}
                              disabled={isScanActive}
                              onChange={actions.handleChange('folder_adult_videos_name')}
                              placeholder={t('settingsPage.sections.folderStructure.defaultAdultVideosName')}
                            />
                          </Stack>
                        </div>
                      )}
                    </Stack>
                  )}

                  <Switch
                    id="folder_remove_empty"
                    checked={form.folder_remove_empty}
                    disabled={isScanActive}
                    onChange={actions.handleCheckboxChange('folder_remove_empty')}
                  >
                    {t('settingsPage.sections.folderStructure.removeEmpty')}
                  </Switch>
                  <span className={`settings-field-hint ${styles['hint-tight-top']}`}>
                    {t('settingsPage.sections.folderStructure.removeEmptyHint')}
                  </span>
                </>
              )}
            </>
          )}
        </Stack>
      </Card>

      <Card
        title={t('settingsPage.sections.rules.title')}
        eyebrow={t('settingsPage.sections.rules.eyebrow')}
      >
        <Stack>
          <SettingsSelectField
            field="collision_strategy"
            label={t('settingsPage.sections.rules.collisionStrategy')}
            options={collisionOptions}
          />
          {collisionStrategyField.value === 'replace_if_better' && (
            <SettingsTextField
              field="collision_duration_tolerance_seconds"
              label={t('settingsPage.sections.rules.durationTolerance')}
              placeholder={t('settingsPage.sections.rules.durationTolerancePlaceholder')}
              type="number"
              min="0"
            />
          )}
        </Stack>
      </Card>

      <SettingsLiveImpact
        form={form}
        t={t}
        title={t('settingsPage.sections.liveImpact.title')}
        eyebrow={t('settingsPage.sections.liveImpact.eyebrow')}
        hint={t('settingsPage.sections.liveImpact.fileNamingHint')}
      />
    </Stack>
  );
}

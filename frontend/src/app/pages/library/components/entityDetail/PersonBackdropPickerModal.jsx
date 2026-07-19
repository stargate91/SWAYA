 
import { useRef } from 'react';
import { ImageOff, ENTITY_ICONS } from '@/ui/icons';
import EmptyState from '@/ui/EmptyState';
import SegmentedControl from '@/ui/SegmentedControl';
import SelectableCard from '@/ui/SelectableCard';
import PosterCard from '@/ui/PosterCard';
import Grid from '@/ui/Grid';
import ImageUploadPanel from '@/ui/ImageUploadPanel';
import { API_BASE } from '@/lib/backend';
import { getPosterImagePath } from '@/lib/imageUrls';
import { isTvLikeMediaType } from '@/lib/mediaTypes';
import { resolveDetailsImageUrl } from '../../utils/detailUtils';
import { pathsMatch } from '../../utils/personBackdropUtils';
import PersonBackdropBrowser from './PersonBackdropBrowser';
import ImageOptionCard from './ImageOptionCard';
import { useOverridePersonBackdropMutation } from '@/queries';
import usePersonBackdropPicker from '../../hooks/usePersonBackdropPicker';
import Stack from '@/ui/Stack';
import styles from './PersonBackdropPickerModal.module.css';

export default function PersonBackdropPickerModal({
  personId,
  item,
  t,
  toast
}) {
  const viewportRef = useRef(null);
  const overridePersonBackdropMutation = useOverridePersonBackdropMutation();

  const {
    activeTab,
    selectedBackdropPath,
    selectedCredit,
    selectedBackdropMetadataQuery,
    selectedBackdrops,
    visibleItems,
    isLoading,
    isBackdropBrowserOpen,
    isUploadPending,
    headerDescription,
    tabsOptions,
    sceneSourceOptions,
    activeSceneSource,
    initialTabPageSize,
    selectedCreditKey,
    handleViewportScroll,
    handleSelectSceneBackdrop,
    handleOpenBackdropBrowser,
    handleBackToCredits,
    handleUploadBackdrop,
    handleSaveBackdropUrl,
    handleSelectDetailedBackdrop,
    patchSession,
  } = usePersonBackdropPicker({
    personId,
    item,
    t,
    toast,
    viewportRef,
  });

  const profilePath = item?.profile_path;
  const profileUrl = profilePath ? resolveDetailsImageUrl(profilePath, API_BASE, 'person') : null;

  if (isBackdropBrowserOpen) {
    return (
      <Stack gap="lg" fullHeight>
        <PersonBackdropBrowser
          selectedCredit={selectedCredit}
          selectedBackdropMetadataQuery={selectedBackdropMetadataQuery}
          selectedBackdrops={selectedBackdrops}
          selectedBackdropPath={selectedBackdropPath}
          item={item}
          handleSelectDetailedBackdrop={handleSelectDetailedBackdrop}
          overridePersonBackdropMutation={overridePersonBackdropMutation}
          isUploadPending={isUploadPending}
          t={t}
          handleBackToCredits={handleBackToCredits}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="lg" fullHeight>
      {headerDescription && (
        <div className={styles['progress-banner']}>
          <span>{headerDescription}</span>
        </div>
      )}

      <ImageUploadPanel
        imageType="backdrop"
        isPending={overridePersonBackdropMutation.isPending || isUploadPending}
        t={t}
        onSaveUrl={handleSaveBackdropUrl}
        onUploadFile={handleUploadBackdrop}
      />

      <SegmentedControl
        ariaLabel={t('library.details.chooseBackdrop') || 'Choose backdrop source'}
        options={tabsOptions}
        value={activeTab}
        onChange={(value) => patchSession(personId, { activeTab: value, selectedCredit: null })}
      />

      {activeTab === 'scenes' && sceneSourceOptions.length >= 2 && (
        <div>
          <SegmentedControl
            options={sceneSourceOptions}
            value={activeSceneSource}
            onChange={(val) => patchSession(personId, { selectedSceneSource: val, scenesPages: [], scenesNextPage: 2 })}
          />
        </div>
      )}

      <div
        ref={viewportRef}
        className={styles.viewport}
        onScroll={handleViewportScroll}
      >
        {activeTab === 'default' ? (
          <div className={styles['default-tab-content']}>
            {profileUrl ? (
              <Grid variant="picker">
                <ImageOptionCard
                  imageUrl={profileUrl}
                  alt="Default blurred fallback"
                  label={t('library.details.defaultBlurredProfile') || 'Blurred Profile Picture'}
                  isSelected={!selectedBackdropPath}
                  onClick={() => handleSaveBackdropUrl("")}
                  aspect="backdrop"
                  blur
                />
              </Grid>
            ) : (
              <EmptyState
                size="md"
                border="dashed"
                background="translucent"
                iconColor="muted"
                icon={ImageOff}
                title={t('library.details.noProfileAvailable') || 'No profile picture available for default backdrop.'}
              />
            )}
          </div>
        ) : (
          <Grid variant={activeTab === 'scenes' ? 'backdrop' : 'logo'}>
            {isLoading && visibleItems.length === 0 && Array.from({ length: initialTabPageSize }).map((_, index) => (
              <SelectableCard
                key={`person-backdrop-skeleton-${activeTab}-${index}`}
                disabled={true}
                aspect={activeTab === 'scenes' ? 'landscape' : 'poster'}
              />
            ))}

            {!isLoading && visibleItems.length === 0 && (
              <EmptyState
                size="md"
                border="dashed"
                background="translucent"
                iconColor="muted"
                icon={ImageOff}
                className="backdrops-panel__empty-state"
                title={t('library.details.noBackdropsAvailable') || 'No good backdrop options found.'}
              />
            )}

            {visibleItems.map((credit, idx) => {
              const creditKey = String(credit.tmdb_id || credit.id || '');
              const isSceneTab = activeTab === 'scenes';
              
              const isSelected = isSceneTab
                ? pathsMatch(credit.backdrop_path || credit.original_backdrop_path, selectedBackdropPath || item?.backdrop_path)
                : (selectedCreditKey !== '' && selectedCreditKey === creditKey);

              const isPending = overridePersonBackdropMutation.isPending && 
                overridePersonBackdropMutation.variables?.backdropPath === (credit.backdrop_path || credit.original_backdrop_path || credit.backdrop_path);

              const posterPath = getPosterImagePath(credit);
              const posterUrl = posterPath ? resolveDetailsImageUrl(posterPath, API_BASE, 'poster') : null;

              if (isSceneTab) {
                const path = credit.backdrop_path || credit.original_backdrop_path || '';
                const thumbUrl = path.startsWith('/media/')
                  ? resolveDetailsImageUrl(path, API_BASE, 'backdrop')
                  : path;
                return (
                  <SelectableCard
                    key={`person-scene-backdrop-${credit.id}-${idx}`}
                    imageUrl={thumbUrl}
                    alt={credit.title || `Scene backdrop ${idx + 1}`}
                    selected={isSelected}
                    isPending={isPending}
                    aspect="landscape"
                    variant="picker"
                    showCheckmark={false}
                    onClick={() => handleSelectSceneBackdrop(credit)}
                    disabled={overridePersonBackdropMutation.isPending || isUploadPending}
                  />
                );
              }

              const isTv = isTvLikeMediaType(credit.media_type || credit.type);

              return (
                <PosterCard
                  key={`person-backdrop-${activeTab}-${credit.tmdb_id || credit.id}`}
                  imageUrl={posterUrl}
                  title={credit.title}
                  subtitle={credit.year || (credit.release_date && credit.release_date.split('-')[0])}
                  selected={isSelected}
                  onClick={() => handleOpenBackdropBrowser(credit)}
                  disabled={overridePersonBackdropMutation.isPending || isUploadPending}
                  aspect="poster"
                  icon={isTv ? ENTITY_ICONS.tv : ENTITY_ICONS.movie}
                />
              );
            })}
          </Grid>
        )}
      </div>
    </Stack>
  );
}

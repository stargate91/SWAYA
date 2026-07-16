 
import { useRef } from 'react';
import { ImageOff, ENTITY_ICONS } from '@/ui/icons';
import Tooltip from '@/ui/Tooltip';
import EmptyState from '@/ui/EmptyState';
import SegmentedControl from '@/ui/SegmentedControl';
import SelectableCard from '@/ui/SelectableCard';
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
import './PersonBackdropPickerModal.css';

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
      <div className="person-backdrop-picker">
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
      </div>
    );
  }

  return (
    <div className="person-backdrop-picker">
      {headerDescription && (
        <div className="person-backdrop-picker__progress-banner">
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
        className="person-backdrop-picker__tabs"
        options={tabsOptions}
        value={activeTab}
        onChange={(value) => patchSession(personId, { activeTab: value, selectedCredit: null })}
      />

      {activeTab === 'scenes' && sceneSourceOptions.length >= 2 && (
        <div className="person-backdrop-picker__source-selector">
          <SegmentedControl
            className="person-backdrop-picker__source-control"
            options={sceneSourceOptions}
            value={activeSceneSource}
            onChange={(val) => patchSession(personId, { selectedSceneSource: val, scenesPages: [], scenesNextPage: 2 })}
          />
        </div>
      )}

      <div
        ref={viewportRef}
        className="person-backdrop-picker__viewport"
        onScroll={handleViewportScroll}
      >
        {activeTab === 'default' ? (
          <div className="person-backdrop-picker__default-tab-content">
            {profileUrl ? (
              <div className="scene-image-picker-grid">
                <ImageOptionCard
                  imageUrl={profileUrl}
                  alt="Default blurred fallback"
                  label={t('library.details.defaultBlurredProfile') || 'Blurred Profile Picture'}
                  isSelected={!selectedBackdropPath}
                  onClick={() => handleSaveBackdropUrl("")}
                  aspect="backdrop"
                  className="person-backdrop-picker__fallback-card"
                  imgClassName="person-backdrop-fallback-blur"
                />
              </div>
            ) : (
              <EmptyState
                variant="detail-panel"
                icon={ImageOff}
                title={t('library.details.noProfileAvailable') || 'No profile picture available for default backdrop.'}
              />
            )}
          </div>
        ) : (
          <Grid variant={activeTab === 'scenes' ? 'backdrop' : 'logo'}>
            {isLoading && visibleItems.length === 0 && Array.from({ length: initialTabPageSize }).map((_, index) => (
              activeTab === 'scenes' ? (
                <SelectableCard key={`person-backdrop-skeleton-${activeTab}-${index}`} disabled={true} aspect="landscape" />
              ) : (
                <div key={`person-backdrop-skeleton-${activeTab}-${index}`} className="person-backdrop-picker__credit-card skeleton">
                  <div className="person-backdrop-picker__credit-poster-wrap skeleton-shimmer" />
                  <div className="person-backdrop-picker__credit-info">
                    <div className="entity-detail-page__skeleton-block entity-detail-page__skeleton-block--credit-title" />
                    <div className="entity-detail-page__skeleton-block entity-detail-page__skeleton-block--credit-meta" />
                  </div>
                </div>
              )
            ))}

            {!isLoading && visibleItems.length === 0 && (
              <EmptyState
                variant="detail-panel"
                icon={ImageOff}
                className="backdrops-panel__empty-state person-backdrop-picker__empty"
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
                    onClick={() => handleSelectSceneBackdrop(credit)}
                    disabled={overridePersonBackdropMutation.isPending || isUploadPending}
                  />
                );
              }

              const isTv = isTvLikeMediaType(credit.media_type || credit.type);

              return (
                <button
                  type="button"
                  key={`person-backdrop-${activeTab}-${credit.tmdb_id || credit.id}`}
                  className={`person-backdrop-picker__credit-card ${isSelected ? 'is-selected' : ''} ${isPending ? 'backdrop-card--disabled' : ''}`}
                  onClick={() => handleOpenBackdropBrowser(credit)}
                  disabled={overridePersonBackdropMutation.isPending || isUploadPending}
                >
                  <div className="person-backdrop-picker__credit-poster-wrap">
                    {posterUrl ? (
                      <img src={posterUrl} alt={credit.title} className="person-backdrop-picker__credit-poster" />
                    ) : (
                      <div className="person-backdrop-picker__credit-poster person-backdrop-picker__credit-poster--placeholder">
                        {isTv ? <ENTITY_ICONS.tv size={24} /> : <ENTITY_ICONS.movie size={24} />}
                      </div>
                    )}
                  </div>
                  <div className="person-backdrop-picker__credit-info">
                    <Tooltip content={credit.title} side="top">
                      <div className="person-backdrop-picker__credit-title">
                        {credit.title}
                      </div>
                    </Tooltip>
                    <div className="person-backdrop-picker__credit-meta">
                      {credit.year ? <span>{credit.year}</span> : (credit.release_date && <span>{credit.release_date.split('-')[0]}</span>)}
                    </div>
                  </div>
                </button>
              );
            })}
          </Grid>
        )}
      </div>
    </div>
  );
}

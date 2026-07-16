import { useState } from 'react';
import TMDBImageGrid from './entityDetail/TMDBImageGrid';
import SegmentedControl from '@/ui/SegmentedControl';
import useImagePicker from '../hooks/useImagePicker';
import ImageUploadPanel from '@/ui/ImageUploadPanel';
import ImageOptionCard from './entityDetail/ImageOptionCard';
import { resolveMediaImageUrl, pathsMatch } from '@/lib/imageUrls';
import PersonBackdropPickerModal from './entityDetail/PersonBackdropPickerModal';
import './UniversalImagePicker.css';


export default function UniversalImagePicker({
  entityId,
  tmdbId,
  imageType = 'backdrop',
  entityType = 'movie',
  currentPath,
  t,
  toast,
  onClose,
  closeOnSelect = true,
  externalIds,
  item,
}) {
  // Compute available sources
  const sources = [];
  if (entityType === 'person') {
    const hasStash = !!externalIds?.stashdb_id || !!item?.stashdb_id || !!item?.external_ids?.stashdb_id;
    const hasFans = !!externalIds?.fansdb_id || !!item?.fansdb_id || !!item?.external_ids?.fansdb_id;
    const hasPornDb = !!externalIds?.theporndb_id || !!item?.theporndb_id || !!item?.external_ids?.theporndb_id || !!externalIds?.porndb_id || !!item?.porndb_id || !!item?.external_ids?.porndb_id;
    const hasTMDb = !!externalIds?.tmdb_id || !!item?.tmdb_id || !!item?.external_ids?.tmdb_id || (!hasStash && !hasFans && !hasPornDb);

    if (hasTMDb) sources.push({ value: 'tmdb', label: 'TMDb' });
    if (hasStash) sources.push({ value: 'stashdb', label: 'StashDB' });
    if (hasFans) sources.push({ value: 'fansdb', label: 'FansDB' });
    if (hasPornDb) sources.push({ value: 'theporndb', label: 'THEPornDB' });

    console.log('UniversalImagePicker: Performer sources computed:', {
      externalIds,
      tmdbId,
      hasStash,
      hasFans,
      hasPornDb,
      hasTMDb,
      sources
    });
  }

  const [selectedPath, setSelectedPath] = useState(currentPath);

  const [imageSource, setImageSource] = useState(() => {
    return sources.length > 0 ? sources[0].value : 'tmdb';
  });

  const { isPending, handleSaveUrl, handleUploadFile } = useImagePicker({
    entityId,
    entityType,
    imageType,
    toast,
    t,
    onClose,
    closeOnSelect,
    onBeforeSave: (path) => setSelectedPath(path),
  });

  if (entityType === 'person' && imageType === 'backdrop') {
    return (
      <PersonBackdropPickerModal
        personId={entityId}
        item={item}
        t={t}
        toast={toast}
      />
    );
  }

  const handleSelectTmdbImage = handleSaveUrl;

  const isScene = entityType === 'scene' || item?.type === 'scene' || (typeof entityId === 'string' && entityId.startsWith('stash_'));
  const imageLookupId = entityType === 'tv' && tmdbId ? tmdbId : entityId;

  return (
    <div className="universal-image-picker">
      <ImageUploadPanel
        imageType={imageType}
        isPending={isPending}
        t={t}
        onSaveUrl={handleSelectTmdbImage}
        onUploadFile={handleUploadFile}
      />

      {isScene && imageType === 'logo' && (
        <div className="scene-image-picker-options scene-image-picker-options--logo">
          <h4 className="scene-image-picker-title">{t('library.details.availableLogos') || 'Available Logos'}</h4>
          <div className="scene-image-picker-grid">
            {(() => {
              const logoOptions = [];
              const seenLogos = new Set();

              if (item?.original_logo_path) {
                logoOptions.push({
                  path: item.original_logo_path,
                  label: t('library.details.originalSceneLogo') || 'Original Scene Logo',
                  alt: 'Original Logo',
                });
                seenLogos.add(item.original_logo_path);
              }

              if (item?.companies?.[0]?.logo_path && !seenLogos.has(item.companies[0].logo_path)) {
                logoOptions.push({
                  path: item.companies[0].logo_path,
                  label: item.companies[0].name || 'Studio Logo',
                  alt: item.companies[0].name || 'Studio',
                });
                seenLogos.add(item.companies[0].logo_path);
              }

              if (item?.networks?.[0]?.logo_path && !seenLogos.has(item.networks[0].logo_path)) {
                logoOptions.push({
                  path: item.networks[0].logo_path,
                  label: item.networks[0].name || 'Network Logo',
                  alt: item.networks[0].name || 'Network',
                });
                seenLogos.add(item.networks[0].logo_path);
              }

              return logoOptions.map((opt, idx) => (
                <ImageOptionCard
                  key={idx}
                  imageUrl={resolveMediaImageUrl(opt.path, 'logo')}
                  alt={opt.alt}
                  label={opt.label}
                  isSelected={pathsMatch(selectedPath || currentPath, opt.path)}
                  onClick={() => handleSelectTmdbImage(opt.path)}
                  aspect="square"
                />
              ));
            })()}
          </div>
        </div>
      )}

      {isScene && (imageType === 'poster' || imageType === 'backdrop') && (
        <div className="scene-image-picker-options">
          <h4 className="scene-image-picker-title">
            {imageType === 'poster'
              ? (t('library.details.availablePosters') || 'Available Posters')
              : (t('library.details.availableBackdrops') || 'Available Backdrops')}
          </h4>
          <div className="scene-image-picker-grid">
            {(() => {
              const options = [];
              if (item?.original_backdrop_path) {
                options.push({
                  path: item.original_backdrop_path,
                  label: t('library.details.originalSceneStill') || 'Original Scene Still',
                  alt: 'Original Still',
                });
              }

              return options.map((opt, idx) => (
                <ImageOptionCard
                  key={idx}
                  imageUrl={resolveMediaImageUrl(opt.path, imageType)}
                  alt={opt.alt}
                  label={opt.label}
                  isSelected={pathsMatch(selectedPath || currentPath, opt.path)}
                  onClick={() => handleSelectTmdbImage(opt.path)}
                  aspect="backdrop"
                />
              ));
            })()}
          </div>
        </div>
      )}

      {sources.length > 1 && (
        <div className="universal-image-picker__source-filter">
          <SegmentedControl
            className="universal-image-picker__segmented-control"
            value={imageSource}
            onChange={(val) => setImageSource(val)}
            options={sources}
          />
        </div>
      )}

      {!isScene && (
        <div className="universal-image-picker__grid">
          <TMDBImageGrid
            itemId={imageLookupId}
            mediaType={entityType}
            imageType={imageType === 'profile' ? 'poster' : imageType}
            currentPath={selectedPath || currentPath}
            onSelect={handleSelectTmdbImage}
            isPending={isPending}
            t={t}
            selectedSource={imageSource}
          />
        </div>
      )}
    </div>
  );
}

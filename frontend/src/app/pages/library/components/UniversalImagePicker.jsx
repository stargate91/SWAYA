import { useState } from 'react';
import TMDBImageGrid from './entityDetail/TMDBImageGrid';
import SegmentedControl from '@/ui/SegmentedControl';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import Grid from '@/ui/Grid';
import Inline from '@/ui/Inline';
import useImagePicker from '../hooks/useImagePicker';
import ImageUploadPanel from '@/ui/ImageUploadPanel';
import { resolveMediaImageUrl, pathsMatch } from '@/lib/imageUrls';
import PersonBackdropPickerModal from './entityDetail/PersonBackdropPickerModal';
import SelectableCard from '@/ui/SelectableCard';

const DEFAULT_TEXT_LETTERS = 'Aa';

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
    <Stack gap="md" fullWidth className="universal-image-picker">
      <ImageUploadPanel
        imageType={imageType}
        isPending={isPending}
        t={t}
        onSaveUrl={handleSelectTmdbImage}
        onUploadFile={handleUploadFile}
      />

      {imageType === 'logo' && isScene && (
        <Stack gap="md" fullWidth className="scene-image-picker-options scene-image-picker-options--logo">
          <Text as="h4" variant="body" weight="semibold">
            {t('library.details.availableLogos') || 'Available Logos'}
          </Text>
          <Grid variant="logo">
            <SelectableCard
              selected={!(selectedPath || currentPath)}
              onClick={() => handleSelectTmdbImage("none")}
              aspect="logo"
              variant="picker"
              showCheckmark={false}
              alt=" "
              infoLeft={t('library.details.defaultText') || 'Default Text'}
            >
              <div className="ui-selectable-card__text-preview">
                {DEFAULT_TEXT_LETTERS}
              </div>
            </SelectableCard>

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
                <SelectableCard
                  key={idx}
                  imageUrl={resolveMediaImageUrl(opt.path, 'logo')}
                  alt={opt.alt}
                  selected={pathsMatch(selectedPath || currentPath, opt.path)}
                  onClick={() => handleSelectTmdbImage(opt.path)}
                  aspect="logo"
                  variant="picker"
                  showCheckmark={false}
                  infoLeft={opt.label}
                />
              ));
            })()}
          </Grid>
        </Stack>
      )}

      {isScene && (imageType === 'poster' || imageType === 'backdrop') && (
        <Stack gap="md" fullWidth className="scene-image-picker-options">
          <Text as="h4" variant="body" weight="semibold">
            {imageType === 'poster'
              ? (t('library.details.availablePosters') || 'Available Posters')
              : (t('library.details.availableBackdrops') || 'Available Backdrops')}
          </Text>
          <Grid variant="picker">
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
                <SelectableCard
                  key={idx}
                  imageUrl={resolveMediaImageUrl(opt.path, imageType)}
                  alt={opt.alt}
                  selected={pathsMatch(selectedPath || currentPath, opt.path)}
                  onClick={() => handleSelectTmdbImage(opt.path)}
                  aspect={imageType === 'backdrop' ? 'landscape' : 'poster'}
                  variant="picker"
                  showCheckmark={false}
                  infoLeft={opt.label}
                />
              ));
            })()}
          </Grid>
        </Stack>
      )}

      {sources.length > 1 && (
        <Inline align="center" justify="center" data-divider="bottom" fullWidth>
          <SegmentedControl
            value={imageSource}
            onChange={(val) => setImageSource(val)}
            options={sources}
          />
        </Inline>
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
    </Stack>
  );
}

import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { Loader2 } from '@/ui/icons';
import DrawerItemImage from './DrawerItemImage';
import ResultAddButton from './ResultAddButton';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import styles from './ListsAddDrawer.module.css';

export default function DrawerResultsList({
  searching,
  loadingMore,
  results,
  query,
  source,
  statusFilter,
  isAdded,
  listType,
  mediaType,
  t,
  handleScroll,
  handleAdd,
  handleRemove,
}) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);

  const filteredResults = results.filter((item) => {
    if (source === 'discover') return true;
    const added = isAdded(item);
    if (statusFilter === 'added') return added;
    if (statusFilter === 'not_added') return !added;
    return true;
  });

  return (
    <div className={styles['lists-drawer__results']} onScroll={handleScroll}>
      {searching && (
        <div className={styles['lists-drawer__loader']}>
          <Loader2 className="spinner" size={24} />
        </div>
      )}

      {!searching && results.length === 0 && query && (
        <Text color="secondary" style={{ textAlign: 'center', display: 'block', padding: 'var(--space-2xl) 0', fontSize: 'var(--font-size-2xs)' }}>
          {t('common.noResults', { defaultValue: 'No results found.' })}
        </Text>
      )}

      {!searching && results.length > 0 && filteredResults.length === 0 && (
        <Text color="secondary" style={{ textAlign: 'center', display: 'block', padding: 'var(--space-2xl) 0', fontSize: 'var(--font-size-2xs)' }}>
          {t('lists.no_status_match', { defaultValue: 'No items match the selected status filter.' })}
        </Text>
      )}

      {!searching && filteredResults.map((item) => {
        const added = isAdded(item);
        const n = normalizeMediaEntity(item, { context: 'drawer', sessionMode });
        const isSceneItem = item.media_type === 'scene' || mediaType === 'scene' || item.media_type === 'videos' || mediaType === 'videos';
        const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.profile_path);
        const imageSize = listType === 'person' ? 'person' : (isSceneItem ? 'backdrop' : 'poster');

        const isExplicitlySfw = item.is_adult === false || item.adult === false;
        const isAdultItem =
          (isSceneItem && !isExplicitlySfw) ||
          (!isSceneItem && (!!item.is_adult || !!item.adult || !!item.is_adult_person || ['porndb', 'stashdb', 'fansdb'].includes(item.provider)));

        const isBlurred = sessionMode === 'sfw' && isAdultItem;

        return (
          <div key={item.id} className={`${styles['lists-drawer__item']} ${isSceneItem ? styles['lists-drawer__item--scene'] : ''}`}>
            <div className={styles['lists-drawer__item-media']}>
              <DrawerItemImage
                src={poster ? resolveMediaImageUrl(poster, imageSize) : ''}
                listType={listType}
                isSceneItem={isSceneItem}
                mediaType={mediaType}
                itemMediaType={item.media_type}
                isBlurred={isBlurred}
              />
            </div>
            <Stack gap="none" flex={1} style={{ minWidth: 0 }}>
              <Text variant="small" weight="semibold" color="primary" truncate>{n.title}</Text>
              <Text variant="xsmall" color="secondary" style={{ opacity: 0.6 }}>{n.subtitle}</Text>
            </Stack>
            <ResultAddButton
              added={added}
              onAdd={() => handleAdd(item)}
              onRemove={() => handleRemove(item)}
            />
          </div>
        );
      })}

      {loadingMore && (
        <div className={`${styles['lists-drawer__loader']} ${styles['lists-drawer__loader--small']}`}>
          <Loader2 className="spinner" size={20} />
        </div>
      )}
    </div>
  );
}

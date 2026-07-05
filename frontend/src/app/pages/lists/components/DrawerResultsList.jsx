import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { Loader2 } from '@/ui/icons';
import DrawerItemImage from './DrawerItemImage';
import ResultAddButton from './ResultAddButton';
import { resolveMediaImageUrl } from '@/lib/imageUrls';

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
    <div className="lists-drawer__results" onScroll={handleScroll}>
      {searching && (
        <div className="lists-drawer__loader">
          <Loader2 className="spinner" size={24} />
        </div>
      )}

      {!searching && results.length === 0 && query && (
        <div className="lists-drawer__empty">
          {t('lists.no_results', { defaultValue: 'No results found.' })}
        </div>
      )}

      {!searching && results.length > 0 && filteredResults.length === 0 && (
        <div className="lists-drawer__empty">
          {t('lists.no_status_match', { defaultValue: 'No items match the selected status filter.' })}
        </div>
      )}

      {!searching && filteredResults.map((item) => {
        const added = isAdded(item);
        const title = item.title || item.name;
        const subtitle = listType === 'person' ? (item.role || 'Actor') : (item.year || item.media_type || mediaType);
        const isSceneItem = item.media_type === 'scene' || mediaType === 'scene';
        const poster = isSceneItem ? (item.backdrop_path || item.poster_path) : (item.poster_path || item.profile_path);
        const imageSize = listType === 'person' ? 'person' : (isSceneItem ? 'backdrop' : 'poster');

        const isAdultItem =
          !!item.is_adult ||
          !!item.adult ||
          !!item.is_adult_person ||
          isSceneItem ||
          ['porndb', 'stashdb', 'fansdb'].includes(item.provider);

        const isBlurred = sessionMode === 'sfw' && isAdultItem;

        return (
          <div key={item.id} className={`lists-drawer__item ${isSceneItem ? 'lists-drawer__item--scene' : ''}`}>
            <div className="lists-drawer__item-media">
              <DrawerItemImage
                src={poster ? resolveMediaImageUrl(poster, imageSize) : ''}
                listType={listType}
                isSceneItem={isSceneItem}
                mediaType={mediaType}
                itemMediaType={item.media_type}
                isBlurred={isBlurred}
              />
            </div>
            <div className="lists-drawer__item-info">
              <span className="lists-drawer__item-title">{title}</span>
              <span className="lists-drawer__item-subtitle">{subtitle}</span>
            </div>
            <ResultAddButton
              added={added}
              onAdd={() => handleAdd(item)}
              onRemove={() => handleRemove(item)}
            />
          </div>
        );
      })}

      {loadingMore && (
        <div className="lists-drawer__loader lists-drawer__loader--small">
          <Loader2 className="spinner" size={20} />
        </div>
      )}
    </div>
  );
}

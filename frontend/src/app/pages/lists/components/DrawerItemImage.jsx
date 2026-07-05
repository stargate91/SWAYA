import { useState } from 'react';
import { ENTITY_ICONS } from '@/ui/icons';

export default function DrawerItemImage({ src, listType, isSceneItem, mediaType, itemMediaType, isBlurred }) {
  const [hasError, setHasError] = useState(!src);

  if (!src || hasError) {
    return (
      <div className="lists-drawer__item-media-placeholder">
        {listType === 'person' ? (
          <ENTITY_ICONS.performer size={14} />
        ) : isSceneItem ? (
          <ENTITY_ICONS.episode size={14} />
        ) : (mediaType === 'tv' || itemMediaType === 'tv') ? (
          <ENTITY_ICONS.tv size={14} />
        ) : (
          <ENTITY_ICONS.movie size={14} />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={isBlurred ? 'is-blurred' : ''}
      onError={() => setHasError(true)}
    />
  );
}

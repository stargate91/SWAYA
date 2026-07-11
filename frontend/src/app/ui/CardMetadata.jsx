import { memo } from 'react';
import PropTypes from 'prop-types';
import Tooltip from '@/ui/Tooltip';
import Pill from '@/ui/Pill';
import { Star } from '@/ui/icons';

const CardMetadata = memo(function CardMetadata({
  title,
  onTitleClick,
  subtitle,
  performers,
  ratingImdb,
  ratingTmdb,
  ratingPorndb,
  ratingPill,
  className = 'ui-poster-card__details',
  titleClassName = 'ui-poster-card__title',
  subtitleRowClassName = 'ui-poster-card__subtitle-row',
  subtitleClassName = 'ui-poster-card__subtitle',
}) {
  if (!title && !subtitle && (!performers || performers.length === 0) && !ratingImdb && !ratingTmdb && !ratingPorndb && !ratingPill) {
    return null;
  }

  const renderRating = () => {
    if (ratingPill) return ratingPill;

    const hasImdb = ratingImdb !== undefined && ratingImdb !== null && ratingImdb !== '' && parseFloat(ratingImdb) > 0;
    const hasTmdb = ratingTmdb !== undefined && ratingTmdb !== null && ratingTmdb !== '' && parseFloat(ratingTmdb) > 0;
    const hasPorndb = ratingPorndb !== undefined && ratingPorndb !== null && ratingPorndb !== '' && parseFloat(ratingPorndb) > 0;

    if (hasImdb) {
      const val = parseFloat(ratingImdb);
      return (
        <Pill variant="imdb">
          <Star size={10} fill="currentColor" strokeWidth={1.8} />
          {isNaN(val) ? ratingImdb : val.toFixed(1)}
        </Pill>
      );
    } else if (hasTmdb) {
      const val = parseFloat(ratingTmdb);
      return (
        <Pill variant="tmdb">
          <Star size={10} fill="currentColor" strokeWidth={1.8} />
          {isNaN(val) ? ratingTmdb : val.toFixed(1)}
        </Pill>
      );
    } else if (hasPorndb) {
      const val = parseFloat(ratingPorndb);
      return (
        <Pill variant="porndb">
          <Star size={10} fill="currentColor" strokeWidth={1.8} />
          {isNaN(val) ? ratingPorndb : val.toFixed(1)}
        </Pill>
      );
    }
    return null;
  };

   return (
     <div className={className}>
       {title && (
         typeof title === 'string' ? (
           <Tooltip content={title} side="top">
             {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
             <div
               className={titleClassName}
               onClick={onTitleClick}
               role={onTitleClick ? 'button' : undefined}
               tabIndex={onTitleClick ? 0 : undefined}
               onKeyDown={onTitleClick ? (e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                   onTitleClick(e);
                 }
               } : undefined}
             >
               {title}
             </div>
           </Tooltip>
         ) : (
           title
         )
       )}
       {(subtitle || performers?.length > 0 || ratingImdb || ratingTmdb || ratingPorndb || ratingPill) && (
         <div className={subtitleRowClassName}>
           {performers && performers.length > 0 ? (
             <div className={subtitleClassName}>
               {performers.map((p, idx) => (
                 <span key={p.id}>
                   {idx > 0 && ', '}
                   <a
                     href={`#/library/people/${p.id}`}
                     className="ui-poster-card__performer-link"
                     onClick={(e) => e.stopPropagation()}
                   >
                     {p.name}
                   </a>
                 </span>
               ))}
             </div>
          ) : (
            subtitle && (
              typeof subtitle === 'string' ? (
                <div className={subtitleClassName}>{subtitle}</div>
              ) : (
                subtitle
              )
            )
          )}
          {renderRating()}
        </div>
      )}
    </div>
  );
});

CardMetadata.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  onTitleClick: PropTypes.func,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  performers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  ratingImdb: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  ratingTmdb: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  ratingPorndb: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  ratingPill: PropTypes.node,
  className: PropTypes.string,
  titleClassName: PropTypes.string,
  subtitleRowClassName: PropTypes.string,
  subtitleClassName: PropTypes.string,
};

export const CardMetadataRow = function CardMetadataRow({ items = [], className = '' }) {
  const filteredItems = items.filter((item) => item !== null && item !== undefined && item !== '');

  return (
    <div className={`ui-meta-row ${className}`.trim()}>
      {filteredItems.map((item, index) => (
        <span key={`${String(item)}-${index}`} className="ui-meta-row__item">
          {item}
        </span>
      ))}
    </div>
  );
};

CardMetadataRow.propTypes = {
  items: PropTypes.array,
  className: PropTypes.string,
};

CardMetadata.Row = CardMetadataRow;

export default CardMetadata;

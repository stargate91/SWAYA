import { memo } from 'react';
import PropTypes from 'prop-types';
import Tooltip from '@/ui/Tooltip';
import Pill from '@/ui/Pill';
import { Star } from '@/ui/icons';
import styles from './CardMetadata.module.css';

const CardMetadata = memo(function CardMetadata({
  title,
  onTitleClick,
  subtitle,
  performers,
  ratingImdb,
  ratingTmdb,
  ratingPorndb,
  ratingPill,
  date,
  className = '',
  titleClassName = '',
  subtitleRowClassName = '',
  subtitleClassName = '',
  performerLinkClassName = '',
  metaRightClassName = '',
  dateClassName = '',
  ...props
}) {
  if (!title && !subtitle && (!performers || performers.length === 0) && !ratingImdb && !ratingTmdb && !ratingPorndb && !ratingPill && !date) {
    return null;
  }

  const renderRating = () => {
    if (ratingPill) return ratingPill;

    const sources = [
      { val: ratingImdb, variant: 'imdb' },
      { val: ratingTmdb, variant: 'tmdb' },
      { val: ratingPorndb, variant: 'porndb' },
    ];

    const activeRating = sources.find(
      (r) => r.val !== undefined && r.val !== null && r.val !== '' && parseFloat(r.val) > 0
    );

    if (activeRating) {
      const val = parseFloat(activeRating.val);
      return (
        <Pill variant={activeRating.variant}>
          <Star size={10} fill="currentColor" strokeWidth={1.8} />
          {isNaN(val) ? activeRating.val : val.toFixed(1)}
        </Pill>
      );
    }

    return null;
  };

  return (
    <div className={className} {...props}>
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
       {(subtitle || performers?.length > 0 || ratingImdb || ratingTmdb || ratingPorndb || ratingPill || date) && (
         <div className={subtitleRowClassName}>
           {performers && performers.length > 0 ? (
             <div className={subtitleClassName}>
               {performers.map((p, idx) => (
                 <span key={p.id}>
                   {idx > 0 && ', '}
                   <a
                     href={`#/library/people/${p.id}`}
                     className={performerLinkClassName}
                     onClick={(e) => e.stopPropagation()}
                   >
                     {p.name}
                   </a>
                 </span>
               ))}
             </div>
          ) : (
            subtitle && (
              <div className={subtitleClassName}>
                {subtitle}
              </div>
            )
          )}
          {(date || ratingImdb || ratingTmdb || ratingPorndb || ratingPill) && (
            <div className={metaRightClassName}>
              {date && <span className={dateClassName}>{date}</span>}
              {renderRating()}
            </div>
          )}
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
  date: PropTypes.string,
  className: PropTypes.string,
  titleClassName: PropTypes.string,
  subtitleRowClassName: PropTypes.string,
  subtitleClassName: PropTypes.string,
  performerLinkClassName: PropTypes.string,
  metaRightClassName: PropTypes.string,
  dateClassName: PropTypes.string,
};

export const CardMetadataRow = function CardMetadataRow({ items = [], className = '' }) {
  const filteredItems = items.filter((item) => item !== null && item !== undefined && item !== '');

  return (
    <div className={`${styles.row} ${className}`.trim()}>
      {filteredItems.map((item, index) => (
        <span key={`${String(item)}-${index}`} className={styles.item}>
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

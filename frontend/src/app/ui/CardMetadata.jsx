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

  const handlePerformerClick = (e, p) => {
    e.stopPropagation();
    window.location.hash = `/library/people/${p.id}`;
  };

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

  const titleStyle = onTitleClick ? { cursor: 'pointer' } : undefined;

  return (
    <div className={className}>
      {title && (
        typeof title === 'string' ? (
          <Tooltip content={title} side="top">
            <div
              className={titleClassName}
              onClick={onTitleClick}
              style={titleStyle}
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
            <div className={subtitleClassName} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {performers.map((p, idx) => (
                <span key={p.id}>
                  {idx > 0 && ', '}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ui-poster-card__performer-link"
                    onClick={(e) => handlePerformerClick(e, p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handlePerformerClick(e, p);
                      }
                    }}
                  >
                    {p.name}
                  </span>
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

export default CardMetadata;

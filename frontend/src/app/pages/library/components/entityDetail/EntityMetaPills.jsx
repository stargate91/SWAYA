import { createElement } from 'react';
import { Layers, Briefcase, Calendar, CalendarX2, MapPin, X, Check } from 'lucide-react';
import Pill from '@/ui/Pill';
import { getGenderIcon, getGenderLabel } from '../../utils/personCreditsUtils';

export default function EntityMetaPills({ isPeople, item, t }) {
  if (!isPeople) {
    const totalCount = item?.total_count;
    const ownedCount = item?.owned_count;

    return (
      <>
        {totalCount !== undefined && (
          <Pill variant="meta">
            <span className="entity-detail-page__meta-pill-content">
              <Layers size={14} />
              <span>
                {t('library.details.totalCount', {
                  count: totalCount,
                  defaultValue: `${totalCount} total`,
                })}
              </span>
            </span>
          </Pill>
        )}
        {ownedCount !== undefined && (
          <Pill variant="meta">
            <span className="entity-detail-page__meta-pill-content">
              {Number(ownedCount) === 0 ? <X size={14} /> : <Check size={14} />}
              <span>
                {t('library.details.inLibraryCount', {
                  count: ownedCount,
                  defaultValue: `${ownedCount} in library`,
                })}
              </span>
            </span>
          </Pill>
        )}
      </>
    );
  }

  const genderLabel = getGenderLabel(item?.gender, t);

  return (
    <>
      {genderLabel && (
        <Pill variant="meta">
          <span className="entity-detail-page__meta-pill-content">
            {createElement(getGenderIcon(item?.gender), { size: 14 })}
            <span>{genderLabel}</span>
          </span>
        </Pill>
      )}
      {item?.known_for_department && (
        <Pill variant="meta">
          <span className="entity-detail-page__meta-pill-content">
            <Briefcase size={14} />
            <span>{item.known_for_department}</span>
          </span>
        </Pill>
      )}
      {item?.birthday && (
        <Pill variant="meta">
          <span className="entity-detail-page__meta-pill-content">
            <Calendar size={14} />
            <span>{item.birthday}</span>
          </span>
        </Pill>
      )}
      {item?.deathday && (
        <Pill variant="meta">
          <span className="entity-detail-page__meta-pill-content">
            <CalendarX2 size={14} />
            <span>{item.deathday}</span>
          </span>
        </Pill>
      )}
      {item?.place_of_birth && (
        <Pill variant="meta">
          <span className="entity-detail-page__meta-pill-content">
            <MapPin size={14} />
            <span>{item.place_of_birth}</span>
          </span>
        </Pill>
      )}
    </>
  );
}

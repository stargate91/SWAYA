import { createElement } from 'react';
import { Layers, Briefcase, Calendar, CalendarX2, MapPin, X, Check } from '@/ui/icons';
import Pill from '@/ui/Pill';
import { getGenderIcon, getGenderLabel } from '../../utils/personCreditsUtils';

export default function EntityMetaPills({ isPeople, item, t }) {
  if (!isPeople) {
    const totalCount = item?.total_count;
    const ownedCount = item?.owned_count;

    return (
      <>
        {totalCount !== undefined && (
          <Pill variant="meta" icon={<Layers size={14} />}>
            {t('library.details.totalCount', {
              count: totalCount,
              defaultValue: `${totalCount} total`,
            })}
          </Pill>
        )}
        {ownedCount !== undefined && (
          <Pill variant="meta" icon={Number(ownedCount) === 0 ? <X size={14} /> : <Check size={14} />}>
            {t('library.details.inLibraryCount', {
              count: ownedCount,
              defaultValue: `${ownedCount} in library`,
            })}
          </Pill>
        )}
      </>
    );
  }

  const genderLabel = getGenderLabel(item?.gender, t);

  return (
    <>
      {genderLabel && (
        <Pill variant="meta" icon={createElement(getGenderIcon(item?.gender), { size: 14 })}>
          {genderLabel}
        </Pill>
      )}
      {item?.known_for_department && (
        <Pill variant="meta" icon={<Briefcase size={14} />}>
          {t(`library.people.roles.${item.known_for_department.toLowerCase()}`) || item.known_for_department}
        </Pill>
      )}
      {item?.birthday && (
        <Pill variant="meta" icon={<Calendar size={14} />}>
          {item.birthday}
        </Pill>
      )}
      {item?.deathday && (
        <Pill variant="meta" icon={<CalendarX2 size={14} />}>
          {item.deathday}
        </Pill>
      )}
      {item?.place_of_birth && (
        <Pill variant="meta" icon={<MapPin size={14} />}>
          {item.place_of_birth}
        </Pill>
      )}
    </>
  );
}

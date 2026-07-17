import { useState, useMemo } from 'react';
import { User } from '@/ui/icons';
import { useMediaDetailContext } from '../MediaDetailContext';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import Tooltip from '@/ui/Tooltip';
import ScrollRow from '@/ui/ScrollRow';
import Card from '@/ui/Card';
import SegmentedControl from '@/ui/SegmentedControl';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import Inline from '@/ui/Inline';
import styles from './BespokeCastSection.module.css';

export default function BespokeCastSection({ item, t, navigate }) {
  const settings = useMediaDetailContext()?.state?.settings;
  const isAdult = item.is_adult;
  const genderPref = settings?.adult_gender_preference;

  const isTv = item.type === 'tv';

  const [activeTab, setActiveTab] = useState('cast'); // 'cast', 'companies', 'networks'

  const processPeople = (list) => {
    if (!list) return [];
    if (!isAdult || !genderPref || genderPref === 'all') {
      return list.map(p => ({ ...p, isFilteredOut: false }));
    }
    return list.map(person => {
      let isFilteredOut = false;
      if (genderPref === 'female' && person.gender !== 1) {
        isFilteredOut = true;
      } else if (genderPref === 'male' && person.gender !== 2) {
        isFilteredOut = true;
      }
      return { ...person, isFilteredOut };
    });
  };

  const filteredDirectors = processPeople(item.directors);
  const filteredWriters = processPeople(item.writers);
  const filteredSound = processPeople(item.sound);
  const filteredCast = processPeople(item.cast);
  const resolvePersonAvatarUrl = (path) => resolveMediaImageUrl(path, 'person', API_BASE);
  const resolveCompanyLogoUrl = (path) => resolveMediaImageUrl(path, 'logo', API_BASE);

  const maxTotal = 15;

  const allPeople = useMemo(() => {
    const list = [];

    // 1. Directors (max 2) - Priority 1
    const slicedDirectors = filteredDirectors ? filteredDirectors.slice(0, 2) : [];
    slicedDirectors.forEach(p => {
      list.push({ ...p, displayRole: t('library.people.roles.director') || 'Director' });
    });

    // 2. Cast/Actors (up to remaining slots) - Priority 2
    const remainingForCast = maxTotal - list.length;
    const slicedCast = filteredCast ? filteredCast.slice(0, remainingForCast) : [];
    slicedCast.forEach(p => {
      if (!list.some(x => x.id === p.id)) {
        list.push({ ...p, displayRole: p.character });
      }
    });

    // 3. Writers (if limit not reached) - Priority 3
    if (list.length < maxTotal) {
      const remainingForWriters = maxTotal - list.length;
      const slicedWriters = filteredWriters ? filteredWriters.slice(0, Math.min(2, remainingForWriters)) : [];
      slicedWriters.forEach(p => {
        if (!list.some(x => x.id === p.id)) {
          list.push({ ...p, displayRole: t('library.people.roles.writer') || 'Writer' });
        }
      });
    }

    // 4. Sound/Music (if limit not reached) - Priority 4
    if (list.length < maxTotal) {
      const remainingForSound = maxTotal - list.length;
      const slicedSound = filteredSound ? filteredSound.slice(0, Math.min(2, remainingForSound)) : [];
      slicedSound.forEach(p => {
        if (!list.some(x => x.id === p.id)) {
          list.push({ ...p, displayRole: p.job || 'Composer' });
        }
      });
    }

    // Sort: Preferred gender (isFilteredOut === false) comes first
    list.sort((a, b) => {
      if (a.isFilteredOut && !b.isFilteredOut) return 1;
      if (!a.isFilteredOut && b.isFilteredOut) return -1;
      return 0;
    });

    return list;
  }, [filteredDirectors, filteredCast, filteredWriters, filteredSound, maxTotal, t]);

  const showCompanies = isTv && item.companies && item.companies.length > 0;
  const showNetworks = isTv && item.networks && item.networks.length > 0;
  const showTabs = isTv && (showCompanies || showNetworks);

  if (activeTab === 'cast' && allPeople.length === 0) return null;

  return (
    <Card variant="glass-shaded" padding="none">
      <Inline
        justify="between"
        align="center"
        className={styles.header}
      >
        {showTabs ? (
          <SegmentedControl
            variant="filter"
            size="xs"
            options={[
              { value: 'cast', label: t('library.details.cast') || 'Cast & Crew' },
              showCompanies && { value: 'companies', label: t('library.details.productionCompanies') || 'Production Companies' },
              showNetworks && { value: 'networks', label: t('library.details.platformsNetworks') || 'Networks' }
            ].filter(Boolean)}
            value={activeTab}
            onChange={setActiveTab}
          />
        ) : (
          <Text variant="caption" uppercase weight="bold" color="muted" className={styles.title}>
            {t('library.details.cast') || 'Cast & Crew'}
          </Text>
        )}
      </Inline>

      <div className={styles.body}>
        <ScrollRow showArrows={true}>
          <Inline gap="md" wrap={false} className={styles['scroll-container']}>
            {activeTab === 'cast' && allPeople.map(person => {
              const opacity = person.isFilteredOut ? 0.35 : 1;
              return (
                <Stack
                  key={person.id}
                  align="center"
                  gap="xs"
                  onClick={person.isFilteredOut ? undefined : () => navigate(`/library/people/${person.id}`, { state: { allowAdult: true } })}
                  className={styles.card}
                  // eslint-disable-next-line react/forbid-component-props
                  style={{ opacity, cursor: person.isFilteredOut ? 'default' : 'pointer' }}
                >
                  <div className={styles['avatar-wrapper']}>
                    {person.profile_path && !person.isFilteredOut ? (
                      <img
                        src={resolvePersonAvatarUrl(person.profile_path)}
                        alt={person.name}
                        className={styles.avatar}
                      />
                    ) : (
                      <div className={styles['avatar-fallback']}>
                        <User size={24} />
                      </div>
                    )}
                  </div>
                  <Text variant="body" weight="bold" className={styles.name}>
                    {person.name}
                    {person.age_at_release != null && ` (${person.age_at_release})`}
                  </Text>
                  {person.displayRole && (
                    <Text variant="xs" color="muted" className={styles.role}>
                      {person.displayRole}
                    </Text>
                  )}
                </Stack>
              );
            })}

            {activeTab === 'companies' && item.companies.map((c, i) => (
              <div key={i} className={styles['company-card']}>
                <Tooltip content={c.name} side="top">
                  {c.logo_path ? (
                    <img
                      src={resolveCompanyLogoUrl(c.logo_path)}
                      alt={c.name}
                      className={styles['company-logo']}
                    />
                  ) : (
                    <Text variant="small" weight="bold" color="secondary" className={styles['company-text']}>
                      {c.name}
                    </Text>
                  )}
                </Tooltip>
              </div>
            ))}

            {activeTab === 'networks' && item.networks.map((n, i) => (
              <div key={i} className={styles['company-card']}>
                <Tooltip content={n.name} side="top">
                  {n.logo_path ? (
                    <img
                      src={resolveCompanyLogoUrl(n.logo_path)}
                      alt={n.name}
                      className={styles['company-logo']}
                    />
                  ) : (
                    <Text variant="small" weight="bold" color="secondary" className={styles['company-text']}>
                      {n.name}
                    </Text>
                  )}
                </Tooltip>
              </div>
            ))}
          </Inline>
        </ScrollRow>
      </div>
    </Card>
  );
}

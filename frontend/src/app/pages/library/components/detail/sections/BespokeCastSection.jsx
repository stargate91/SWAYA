import { useState, useMemo } from 'react';
import { User } from '@/ui/icons';
import { useMediaDetailContext } from '../MediaDetailContext';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import Tooltip from '@/ui/Tooltip';
import ScrollRow from '@/ui/ScrollRow';
import Card from '@/ui/Card';
import SegmentedControl from '@/ui/SegmentedControl';
import Inline from '@/ui/Inline';
import CastCard from '@/ui/data/CastCard';
import LogoCard from '@/ui/data/LogoCard';
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
    const slicedCast = filteredCast ? filteredCast.slice(0, Math.max(0, remainingForCast)) : [];
    slicedCast.forEach(p => {
      list.push({ ...p, displayRole: p.character });
    });

    // 3. Writers (up to remaining slots) - Priority 3
    const remainingForWriters = maxTotal - list.length;
    if (remainingForWriters > 0) {
      const slicedWriters = filteredWriters ? filteredWriters.slice(0, remainingForWriters) : [];
      slicedWriters.forEach(p => {
        // Avoid duplicates if already in list
        if (!list.some(existing => existing.id === p.id)) {
          list.push({ ...p, displayRole: t('library.people.roles.writer') || 'Writer' });
        }
      });
    }

    // 4. Sound (up to remaining slots) - Priority 4
    const remainingForSound = maxTotal - list.length;
    if (remainingForSound > 0) {
      const slicedSound = filteredSound ? filteredSound.slice(0, remainingForSound) : [];
      slicedSound.forEach(p => {
        if (!list.some(existing => existing.id === p.id)) {
          list.push({ ...p, displayRole: p.job || (t('library.people.roles.sound') || 'Sound') });
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
  }, [filteredDirectors, filteredCast, filteredWriters, filteredSound, t]);

  const showCompanies = isTv && item.companies && item.companies.length > 0;
  const showNetworks = isTv && item.networks && item.networks.length > 0;
  const showTabs = isTv && (showCompanies || showNetworks);

  if (activeTab === 'cast' && allPeople.length === 0) return null;

  const headerContent = showTabs ? (
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
    t('library.details.cast') || 'Cast & Crew'
  );

  return (
    <Card
      variant="glass-shaded"
      headerVariant="shaded"
      padding="md"
      title={headerContent}
    >
      <ScrollRow showArrows={true}>
        <Inline gap="md" wrap={false} className={styles['scroll-container']}>
          {activeTab === 'cast' && allPeople.map(person => {
            const opacity = person.isFilteredOut ? 0.35 : 1;
            return (
              <CastCard
                key={person.id}
                src={person.profile_path && !person.isFilteredOut ? resolvePersonAvatarUrl(person.profile_path) : undefined}
                name={person.name}
                character={person.displayRole}
                fallbackIcon={<User size={24} />}
                onClick={person.isFilteredOut ? undefined : () => navigate(`/library/people/${person.id}`, { state: { allowAdult: true } })}
                className={styles.card}
                // eslint-disable-next-line react/forbid-component-props
                style={{ opacity, cursor: person.isFilteredOut ? 'default' : 'pointer' }}
              />
            );
          })}

          {activeTab === 'companies' && item.companies.map((c, i) => (
            <Tooltip key={i} content={c.name} side="top">
              <LogoCard
                src={c.logo_path ? resolveCompanyLogoUrl(c.logo_path) : undefined}
                alt={c.name}
                size="lg"
                invert
              />
            </Tooltip>
          ))}

          {activeTab === 'networks' && item.networks.map((n, i) => (
            <Tooltip key={i} content={n.name} side="top">
              <LogoCard
                src={n.logo_path ? resolveCompanyLogoUrl(n.logo_path) : undefined}
                alt={n.name}
                size="lg"
                invert
              />
            </Tooltip>
          ))}
        </Inline>
      </ScrollRow>
    </Card>
  );
}

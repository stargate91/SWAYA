/* eslint-disable react/forbid-dom-props */
import { useState, useMemo } from 'react';
import { User } from '@/ui/icons';
import { useMediaDetailContext } from '../MediaDetailContext';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import Tooltip from '@/ui/Tooltip';
import ScrollRow from '@/ui/ScrollRow';

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
    <div className="bespoke-cast-section">
      <div className="bespoke-cast-browser-card">
        <div className="bespoke-browser-card__pills-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {showTabs ? (
            <div className="bespoke-cast-tabs" style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button
                type="button"
                className={`bespoke-cast-tab-btn ${activeTab === 'cast' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('cast')}
                style={{
                  background: activeTab === 'cast' ? 'var(--color-bg-subtle)' : 'transparent',
                  border: 'none',
                  color: activeTab === 'cast' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-md, 8px)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                {t('library.details.cast') || 'Cast & Crew'}
              </button>
              {showCompanies && (
                <button
                  type="button"
                  className={`bespoke-cast-tab-btn ${activeTab === 'companies' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('companies')}
                  style={{
                    background: activeTab === 'companies' ? 'var(--color-bg-subtle)' : 'transparent',
                    border: 'none',
                    color: activeTab === 'companies' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md, 8px)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  {t('library.details.productionCompanies') || 'Production Companies'}
                </button>
              )}
              {showNetworks && (
                <button
                  type="button"
                  className={`bespoke-cast-tab-btn ${activeTab === 'networks' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('networks')}
                  style={{
                    background: activeTab === 'networks' ? 'var(--color-bg-subtle)' : 'transparent',
                    border: 'none',
                    color: activeTab === 'networks' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    padding: 'var(--space-sm) var(--space-md)',
                    borderRadius: 'var(--radius-md, 8px)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  {t('library.details.platformsNetworks') || 'Networks'}
                </button>
              )}
            </div>
          ) : (
            <span className="bespoke-cast-title">
              {t('library.details.cast') || 'Cast & Crew'}
            </span>
          )}
        </div>
        <div className="bespoke-cast-browser-card__body">
          <ScrollRow
            className={activeTab === 'cast' ? "dashboard-cast-grid no-scrollbar" : "bespoke-companies-body no-scrollbar"}
            showArrows={true}
          >
            {activeTab === 'cast' && allPeople.map(person => (
              <div
                key={person.id}
                className={`dashboard-cast-card ${person.isFilteredOut ? 'dashboard-cast-card--filtered' : ''}`}
                onClick={person.isFilteredOut ? undefined : () => navigate(`/library/people/${person.id}`, { state: { allowAdult: true } })}
              >
                <div className={`dashboard-cast-card__avatar-wrapper ${person.isFilteredOut ? 'dashboard-cast-card__avatar-wrapper--filtered' : ''}`}>
                  {person.profile_path && !person.isFilteredOut ? (
                    <img
                      src={resolvePersonAvatarUrl(person.profile_path)}
                      alt={person.name}
                      className="dashboard-cast-card__avatar"
                    />
                  ) : (
                    <div className="dashboard-cast-card__avatar-fallback">
                      <User size={24} />
                    </div>
                  )}
                </div>
                <span className="dashboard-cast-card__name">
                  {person.name}
                  {person.age_at_release != null && ` (${person.age_at_release})`}
                </span>
                {person.displayRole && (
                  <span className="dashboard-cast-card__role">{person.displayRole}</span>
                )}
              </div>
            ))}

            {activeTab === 'companies' && item.companies.map((c, i) => (
              <div key={i} className="bespoke-company-item" style={{ flexShrink: 0 }}>
                <Tooltip content={c.name} side="top">
                  {c.logo_path ? (
                    <img
                      src={resolveCompanyLogoUrl(c.logo_path)}
                      alt={c.name}
                      className="bespoke-company-logo"
                      style={{ maxHeight: '40px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span className="bespoke-company-name-only">{c.name}</span>
                  )}
                </Tooltip>
              </div>
            ))}

            {activeTab === 'networks' && item.networks.map((n, i) => (
              <div key={i} className="bespoke-company-item" style={{ flexShrink: 0 }}>
                <Tooltip content={n.name} side="top">
                  {n.logo_path ? (
                    <img
                      src={resolveCompanyLogoUrl(n.logo_path)}
                      alt={n.name}
                      className="bespoke-company-logo"
                      style={{ maxHeight: '40px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span className="bespoke-company-name-only">{n.name}</span>
                  )}
                </Tooltip>
              </div>
            ))}
          </ScrollRow>
        </div>
      </div>
    </div>
  );
}

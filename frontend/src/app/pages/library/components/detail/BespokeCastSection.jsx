import { useState, useMemo, useEffect, useRef } from 'react';
import { User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMediaDetailContext } from './MediaDetailContext';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';

export default function BespokeCastSection({ item, t, navigate }) {
  const settings = useMediaDetailContext()?.state?.settings;
  const isAdult = item.is_adult;
  const genderPref = settings?.adult_gender_preference;

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

  const castScrollRef = useRef(null);
  const [castScrollState, setCastScrollState] = useState({ left: false, right: false });

  const handleScrollState = () => {
    const container = castScrollRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCastScrollState({
      left: scrollLeft > 4,
      right: scrollLeft < scrollWidth - clientWidth - 4
    });
  };

  useEffect(() => {
    const timer = setTimeout(handleScrollState, 100);
    return () => clearTimeout(timer);
  }, [allPeople]);

  const scrollCast = (direction) => {
    const container = castScrollRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.6;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (allPeople.length === 0) return null;

  return (
    <div className="bespoke-cast-section">
      <div className="bespoke-cast-browser-card">
        <div className="bespoke-browser-card__pills-header">
          <span className="bespoke-cast-title">
            {t('library.details.cast') || 'Cast & Crew'}
          </span>
        </div>
        <div className="bespoke-cast-browser-card__body">
          <button
            type="button"
            className="bespoke-carousel-nav bespoke-carousel-nav--left"
            onClick={() => scrollCast('left')}
          >
            <ChevronLeft size={14} />
          </button>

          <div className={`dashboard-cast-carousel-container bespoke-fade-container ${castScrollState.left ? 'has-fade-left' : ''} ${castScrollState.right ? 'has-fade-right' : ''}`}>
            <div
              className="dashboard-cast-grid"
              ref={castScrollRef}
              onScroll={handleScrollState}
            >
              {allPeople.map(person => (
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
            </div>
          </div>
          <button
            type="button"
            className="bespoke-carousel-nav bespoke-carousel-nav--right"
            onClick={() => scrollCast('right')}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

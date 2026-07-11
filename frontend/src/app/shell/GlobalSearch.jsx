import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ArrowUpRight, Clapperboard, ExternalLink } from '@/ui/icons';
import { ENTITY_ICONS } from '../ui/icons';
import Tooltip from '../ui/Tooltip';
import { useTranslation } from '@/providers/LanguageContext';
import api from '../lib/api';
import { useSettingsQuery } from '../queries/settingsQueries';
import { resolveMediaImageUrl } from '../lib/imageUrls';
import { useDebounce } from '@/hooks/useDebounce';
import './GlobalSearch.css';

const SOURCES = [
  { id: 'tmdb', name: 'TMDb', adult: false },
  { id: 'stashdb', name: 'StashDB', adult: true },
  { id: 'fansdb', name: 'FansDB', adult: true },
  { id: 'porndb', name: 'PornDB', adult: true },
];

const TYPES_BY_SOURCE = {
  tmdb: [
    { id: 'all', name: 'All', icon: Clapperboard },
    { id: 'movie', name: 'Movies', icon: ENTITY_ICONS.movie },
    { id: 'tv', name: 'TV Shows', icon: ENTITY_ICONS.tv },
    { id: 'person', name: 'People', icon: ENTITY_ICONS.performers },
  ],
  stashdb: [
    { id: 'scene', name: 'Scenes', icon: ENTITY_ICONS.episode },
    { id: 'person', name: 'Performers', icon: ENTITY_ICONS.performers },
  ],
  fansdb: [
    { id: 'scene', name: 'Scenes', icon: ENTITY_ICONS.episode },
    { id: 'person', name: 'Performers', icon: ENTITY_ICONS.performers },
  ],
  porndb: [
    { id: 'movie', name: 'Movies', icon: ENTITY_ICONS.movie },
    { id: 'scene', name: 'Scenes', icon: ENTITY_ICONS.episode },
    { id: 'person', name: 'Performers', icon: ENTITY_ICONS.performers },
  ],
};

const getYearLabel = (year) => {
  if (!year) return '';
  const yStr = String(year);
  return yStr.includes('-') ? yStr.split('-')[0] : yStr;
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Search query input state
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  
  // Search results state
  const [results, setResults] = useState([]);
  
  const { data: settings = {} } = useSettingsQuery();
  
  // Selection state
  const [selectedSource, setSelectedSource] = useState('tmdb');
  const [selectedType, setSelectedType] = useState('all');
  
  // UI visibility states
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  const containerRef = useRef(null);
  const selectorRef = useRef(null);



  const hasAdult = settings?.include_adult;
  const filteredSources = SOURCES.filter(s => !s.adult || hasAdult);

  const filteredResults = useMemo(() => {
    const pref = settings?.adult_gender_preference;
    const isAdultSource = SOURCES.find((s) => s.id === selectedSource)?.adult;
    if (!isAdultSource || selectedType !== 'person' || !pref || pref === 'all') {
      return results;
    }
    return results.filter((item) => {
      const g = item.gender;
      if (pref === 'female') return g === 1 || g === '1';
      if (pref === 'male') return g === 2 || g === '2';
      return true;
    });
  }, [results, selectedSource, selectedType, settings?.adult_gender_preference]);

  const groupedResults = useMemo(() => {
    if (selectedType !== 'all') {
      return null;
    }
    const groups = {
      movie: [],
      tv: [],
      person: [],
      scene: [],
      other: []
    };
    filteredResults.forEach((item) => {
      const type = item.media_type;
      if (groups[type]) {
        groups[type].push(item);
      } else {
        groups.other.push(item);
      }
    });
    return groups;
  }, [filteredResults, selectedType]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOverlayOpen(false);
      }
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setIsSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    try {
      const data = await api.metadata.globalSearch({
        query: searchQuery,
        source: selectedSource,
        searchType: selectedType,
        includeAdult: hasAdult,
      });
      setResults(data || []);
      setIsOverlayOpen(true);
    } catch (err) {
      console.error('Global search error:', err);
      setResults([]);
    }
  }, [selectedSource, selectedType, hasAdult]);

  // Debounced search trigger
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      Promise.resolve().then(() => {
        performSearch(debouncedQuery);
      });
    }
  }, [debouncedQuery, performSearch]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length < 2) {
      setResults([]);
      setIsOverlayOpen(false);
    }
  };

  const handleSourceSelect = (sourceId) => {
    setSelectedSource(sourceId);
    // Auto-select first available type for this source
    const availableTypes = TYPES_BY_SOURCE[sourceId] || [];
    const hasSameType = availableTypes.some(t => t.id === selectedType);
    if (!hasSameType && availableTypes.length > 0) {
      setSelectedType(availableTypes[0].id);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOverlayOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}&source=${selectedSource}&type=${selectedType}`);
      setQuery('');
    }
  };

  const handleResultClick = (item) => {
    setIsOverlayOpen(false);
    setQuery('');
    
    const provider = item.provider || selectedSource;
    if (item.media_type === 'movie') {
      const prefix = provider === 'porndb' ? 'porndb_' : 'tmdb_';
      const id = String(item.id).startsWith(prefix) ? item.id : `${prefix}${item.id}`;
      navigate(`/library/movie/${id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'tv') {
      navigate(`/library/tv/${item.id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'person') {
      navigate(`/library/people/${item.id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'scene') {
      const prefix = provider === 'porndb' ? 'porndb' : provider === 'fansdb' ? 'fansdb' : 'stash';
      const id = String(item.id).startsWith(`${prefix}_`) ? item.id : `${prefix}_${item.id}`;
      navigate(`/library/scene/${id}`, { state: { allowAdult: true } });
    }
  };

  // Get active icons/labels
  const activeSourceObj = SOURCES.find(s => s.id === selectedSource) || SOURCES[0];
  const activeTypeObj = (TYPES_BY_SOURCE[selectedSource] || []).find(t => t.id === selectedType) || { name: 'All', icon: Clapperboard };
  const ActiveTypeIcon = activeTypeObj.icon;

  return (
    <div className="global-search" ref={containerRef}>
      <div className="global-search__bar">
        {/* Source & Type Selector Trigger */}
        <div className="global-search__selector-wrapper" ref={selectorRef}>
          <button
            type="button"
            className="global-search__selector-btn"
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
          >
            <ActiveTypeIcon className="global-search__active-icon" size={14} />
            <span className="global-search__active-label">
              {t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name}
            </span>
            <ChevronDown className={`global-search__chevron ${isSelectorOpen ? 'is-open' : ''}`} size={12} />
          </button>

          {/* 2-Level Cascading Dropdown */}
          {isSelectorOpen && (
            <div className="global-search__dropdown">
              {/* Left Column: Sources */}
              <div className="global-search__dropdown-column global-search__dropdown-column--sources">
                <div className="global-search__dropdown-header">{t('search.source') || 'Source'}</div>
                {filteredSources.map(source => (
                  <button
                    key={source.id}
                    type="button"
                    className={`global-search__dropdown-item ${selectedSource === source.id ? 'is-active' : ''}`}
                    onClick={() => handleSourceSelect(source.id)}
                  >
                    {source.name}
                  </button>
                ))}
              </div>
              
              {/* Right Column: Types */}
              <div className="global-search__dropdown-column global-search__dropdown-column--types">
                <div className="global-search__dropdown-header">{t('search.type') || 'Type'}</div>
                {(TYPES_BY_SOURCE[selectedSource] || []).map(type => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      className={`global-search__dropdown-item ${selectedType === type.id ? 'is-active' : ''}`}
                      onClick={() => {
                        setSelectedType(type.id);
                        setIsSelectorOpen(false);
                      }}
                    >
                      <TypeIcon size={12} className="global-search__item-icon" />
                      {t(`search.types.${type.id}`) || type.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="global-search__divider" />

        {/* Input Field */}
        <div className="global-search__input-wrapper">
          <Search className="global-search__search-icon" size={14} />
          <input
            type="text"
            className="global-search__input"
            placeholder={
              selectedSource === 'tmdb'
                ? t('search.placeholderTmdb', { type: (t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name).toLowerCase() }) || `Search ${(t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name).toLowerCase()}...`
                : t('search.placeholderPattern', { type: (t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name).toLowerCase(), source: activeSourceObj.name }) || `Search ${(t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name).toLowerCase()} on ${activeSourceObj.name}...`
            }
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.trim().length >= 2 && setIsOverlayOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {query.trim() && (
            <Tooltip content={t('common.advancedSearch') || 'Advanced Search'} side="bottom">
              <button
                type="button"
                className="global-search__more-btn"
                onClick={() => {
                  setIsOverlayOpen(false);
                  navigate(`/search?q=${encodeURIComponent(query.trim())}&source=${selectedSource}&type=${selectedType}`);
                  setQuery('');
                }}
                title={null}
              >
                <ExternalLink size={12} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Suggestion Results Overlay */}
      {isOverlayOpen && filteredResults.length > 0 && (
        <div className="global-search__overlay">
          <div className="global-search__results-list">
            {selectedType === 'all' ? (
              Object.entries(groupedResults).map(([type, items], groupIdx) => {
                if (items.length === 0) return null;
                const groupTitles = {
                  movie: t('library.tabs.movies') || 'Movies',
                  tv: t('library.tabs.tv') || 'TV Shows',
                  person: selectedSource === 'tmdb' ? (t('library.tabs.people') || 'Artists') : (t('library.tabs.adultPeople') || 'Stars'),
                  scene: t('library.tabs.scenes') || 'Scenes',
                  other: t('common.other') || 'Other'
                };
                const activeGroupTypeObj = (TYPES_BY_SOURCE[selectedSource] || []).find(t => t.id === type) || { icon: Clapperboard };
                const GroupTypeIcon = activeGroupTypeObj.icon;

                return (
                  <div key={type} className="global-search__group">
                    {groupIdx > 0 && <div className="global-search__group-divider" />}
                    <div className="global-search__group-header">{groupTitles[type]}</div>
                    {items.map((item, idx) => (
                      <div
                        key={`${item.id}-${item.media_type}-${idx}`}
                        className="global-search__result-item"
                        onClick={() => handleResultClick(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleResultClick(item)}
                      >
                        {item.poster_path ? (
                          <img src={resolveMediaImageUrl(item.poster_path, 'posterThumb')} alt="" className="global-search__item-poster" loading="lazy" />
                        ) : (
                          <div className="global-search__item-poster-placeholder">
                            <GroupTypeIcon size={16} />
                          </div>
                        )}
                        <div className="global-search__item-info">
                          <div className="global-search__item-title-row">
                            <span className="global-search__item-title">{item.title}</span>
                            {item.year && <span className="global-search__item-year">{getYearLabel(item.year)}</span>}
                          </div>
                          <div className="global-search__item-meta">
                            {item.overview && (
                              <span className="global-search__item-overview">
                                {item.overview.length > 60 ? item.overview.slice(0, 60) + '...' : item.overview}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowUpRight className="global-search__arrow-icon" size={14} />
                      </div>
                    ))}
                  </div>
                );
              })
            ) : (
              filteredResults.map((item, idx) => (
                <div
                  key={`${item.id}-${item.media_type}-${idx}`}
                  className="global-search__result-item"
                  onClick={() => handleResultClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleResultClick(item)}
                >
                  {item.poster_path ? (
                    <img src={resolveMediaImageUrl(item.poster_path, 'posterThumb')} alt="" className="global-search__item-poster" loading="lazy" />
                  ) : (
                    <div className="global-search__item-poster-placeholder">
                      <ActiveTypeIcon size={16} />
                    </div>
                  )}
                  <div className="global-search__item-info">
                    <div className="global-search__item-title-row">
                      <span className="global-search__item-title">{item.title}</span>
                      {item.year && <span className="global-search__item-year">{getYearLabel(item.year)}</span>}
                    </div>
                    <div className="global-search__item-meta">
                      {item.overview && (
                        <span className="global-search__item-overview">
                          {item.overview.length > 60 ? item.overview.slice(0, 60) + '...' : item.overview}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="global-search__arrow-icon" size={14} />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

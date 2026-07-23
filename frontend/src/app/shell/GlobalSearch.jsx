import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clapperboard, ExternalLink } from '@/ui/icons';
import { ENTITY_ICONS } from '../ui/icons';
import Tooltip from '../ui/Tooltip';
import { useTranslation } from '@/providers/LanguageContext';
import api from '../lib/api';
import { useSettingsQuery } from '../queries/settingsQueries';
import { resolveMediaImageUrl } from '../lib/imageUrls';
import { useDebounce } from '@/hooks/useDebounce';
import { useLibraryModeStore } from '../stores/useLibraryModeStore';
import AdultOverlay from '../ui/AdultOverlay';
import CompactCard from '../ui/CompactCard';
import SearchInputCombo from '../ui/SearchInputCombo';
import { isVideoMediaType } from '../lib/mediaTypes';
import styles from './GlobalSearch.module.css';

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
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  const containerRef = useRef(null);

  const hasAdult = settings?.include_adult;
  const filteredSources = SOURCES.filter(s => !s.adult || hasAdult);

  const filteredResults = useMemo(() => {
    return results;
  }, [results]);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { sessionMode } = useLibraryModeStore();

  const isAdultItem = (item) => {
    return selectedSource !== 'tmdb' || item.is_adult || item.media_type === 'scene';
  };

  const shouldBlur = (item) => {
    return sessionMode === 'sfw' && isAdultItem(item);
  };

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
    
    if (item.target_path) {
      navigate(item.target_path, { state: { allowAdult: true } });
      return;
    }
    const provider = item.provider || selectedSource;
    if (item.media_type === 'movie') {
      const prefix = provider === 'porndb' ? 'porndb_' : 'tmdb_';
      const id = String(item.id).startsWith(prefix) ? item.id : `${prefix}${item.id}`;
      navigate(`/library/movie/${id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'tv') {
      navigate(`/library/tv/${item.id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'person') {
      navigate(`/library/people/${item.id}`, { state: { allowAdult: true } });
    } else if (item.media_type === 'scene' || item.media_type === 'video' || isVideoMediaType(item.media_type)) {
      if (item.media_type === 'video' || isVideoMediaType(item.media_type)) {
        navigate(`/library/video/${item.id}`, { state: { allowAdult: true } });
      } else {
        const prefix = provider === 'porndb' ? 'porndb' : provider === 'fansdb' ? 'fansdb' : 'stash';
        const id = String(item.id).startsWith(`${prefix}_`) ? item.id : `${prefix}_${item.id}`;
        navigate(`/library/scene/${id}`, { state: { allowAdult: true } });
      }
    }
  };

  // Get active icons/labels
  const activeSourceObj = SOURCES.find(s => s.id === selectedSource) || SOURCES[0];
  const activeTypeObj = (TYPES_BY_SOURCE[selectedSource] || []).find(t => t.id === selectedType) || { name: 'All', icon: Clapperboard };
  const ActiveTypeIcon = activeTypeObj.icon;

  return (
    <div className={styles['global-search']} ref={containerRef}>
      <SearchInputCombo
        value={query}
        onChange={handleInputChange}
        placeholder={
          selectedSource === 'tmdb'
            ? t('search.placeholderTmdb', { type: (t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name).toLowerCase() }) || `Search ${(t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name).toLowerCase()}...`
            : t('search.placeholderPattern', { type: (t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name).toLowerCase(), source: activeSourceObj.name }) || `Search ${(t(`search.types.${activeTypeObj.id}`) || activeTypeObj.name).toLowerCase()} on ${activeSourceObj.name}...`
        }
        onFocus={() => query.trim().length >= 2 && setIsOverlayOpen(true)}
        onKeyDown={handleKeyDown}
        sources={filteredSources}
        selectedSource={selectedSource}
        onSourceChange={handleSourceSelect}
        sourceLabel={t('search.source') || 'Source'}
        optionLabel={t('search.type') || 'Type'}
        options={(TYPES_BY_SOURCE[selectedSource] || []).map(t => ({
          value: t.id,
          label: t.name,
          icon: t.icon
        }))}
        selectedOption={selectedType}
        onOptionChange={setSelectedType}
        size="xs"
        rightElement={query.trim() && (
          <Tooltip content={t('common.advancedSearch') || 'Advanced Search'} side="bottom">
            <button
              type="button"
              className={styles['more-btn']}
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
      />

      {/* Suggestion Results Overlay */}
      {isOverlayOpen && filteredResults.length > 0 && (
        <div className={styles.overlay}>
          <div className={styles['results-list']}>
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
                  <div key={type} className={styles.group}>
                    {groupIdx > 0 && <div className={styles['group-divider']} />}
                    <div className={styles['group-header']}>{groupTitles[type]}</div>
                    {items.map((item, idx) => (
                      <CompactCard
                        key={`${item.id}-${item.media_type}-${idx}`}
                        className={styles.card}
                        size="sm"
                        aspect={item.media_type === 'scene' ? 'landscape' : (item.media_type === 'person' ? 'circle' : 'poster')}
                        imageUrl={item.poster_path ? resolveMediaImageUrl(item.poster_path, 'posterThumb') : null}
                        fallbackIcon={GroupTypeIcon}
                        title={item.title}
                        meta={item.year ? getYearLabel(item.year) : null}
                        description={item.overview ? (item.overview.length > 60 ? item.overview.slice(0, 60) + '...' : item.overview) : null}
                        rightElement={<ArrowUpRight className={styles['arrow-icon']} size={14} />}
                        overlay={shouldBlur(item) && <AdultOverlay variant="blur" badgeText={null} className={styles['adult-overlay']} />}
                        onClick={() => handleResultClick(item)}
                      />
                    ))}
                  </div>
                );
              })
            ) : (
              filteredResults.map((item, idx) => (
                <CompactCard
                  key={`${item.id}-${item.media_type}-${idx}`}
                  className={styles.card}
                  size="sm"
                  aspect={item.media_type === 'scene' ? 'landscape' : (item.media_type === 'person' ? 'circle' : 'poster')}
                  imageUrl={item.poster_path ? resolveMediaImageUrl(item.poster_path, 'posterThumb') : null}
                  fallbackIcon={ActiveTypeIcon}
                  title={item.title}
                  meta={item.year ? getYearLabel(item.year) : null}
                  description={item.overview ? (item.overview.length > 60 ? item.overview.slice(0, 60) + '...' : item.overview) : null}
                  rightElement={<ArrowUpRight className={styles['arrow-icon']} size={14} />}
                  overlay={shouldBlur(item) && <AdultOverlay variant="blur" badgeText={null} className={styles['adult-overlay']} />}
                  onClick={() => handleResultClick(item)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

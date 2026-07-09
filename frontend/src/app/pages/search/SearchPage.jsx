import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Clapperboard, ENTITY_ICONS, ImageOff } from '@/ui/icons';
import api from '@/lib/api';
import Page from '@/ui/Page';
import Input from '@/ui/Input';
import SegmentedControl from '@/ui/SegmentedControl';
import Spinner from '@/ui/Spinner';
import EmptyState from '@/ui/EmptyState';
import PosterGrid from '@/ui/PosterGrid';
import PosterCard from '@/ui/PosterCard';
import Button from '@/ui/Button';
import { useSettingsQuery } from '@/queries/settingsQueries';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { normalizeMediaEntity } from '@/lib/normalizeMediaEntity';
import { useTranslation } from '@/providers/LanguageContext';
import './SearchPage.css';

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
    { id: 'person', name: 'People', icon: ENTITY_ICONS.performer },
  ],
  stashdb: [
    { id: 'scene', name: 'Scenes', icon: ENTITY_ICONS.episode },
    { id: 'person', name: 'Performers', icon: ENTITY_ICONS.performer },
  ],
  fansdb: [
    { id: 'scene', name: 'Scenes', icon: ENTITY_ICONS.episode },
    { id: 'person', name: 'Performers', icon: ENTITY_ICONS.performer },
  ],
  porndb: [
    { id: 'movie', name: 'Movies', icon: ENTITY_ICONS.movie },
    { id: 'scene', name: 'Scenes', icon: ENTITY_ICONS.episode },
    { id: 'person', name: 'Performers', icon: ENTITY_ICONS.performer },
  ],
};

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: settings } = useSettingsQuery();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const urlQuery = searchParams.get('q') || '';
  const urlSource = searchParams.get('source') || 'tmdb';
  const urlType = searchParams.get('type') || 'all';

  // Local state for the input field
  const [localQuery, setLocalQuery] = useState(urlQuery);

  // Component states for results and loading
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const hasAdult = settings?.include_adult;
  const filteredSources = useMemo(() => {
    return SOURCES.filter(s => !s.adult || hasAdult);
  }, [hasAdult]);

  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setLocalQuery(urlQuery);
  }

  const [prevCriteria, setPrevCriteria] = useState({ query: urlQuery, source: urlSource, type: urlType });
  if (urlQuery !== prevCriteria.query || urlSource !== prevCriteria.source || urlType !== prevCriteria.type) {
    setPrevCriteria({ query: urlQuery, source: urlSource, type: urlType });
    setVisibleCount(12);
    if (!urlQuery.trim()) {
      setResults([]);
    }
  }

  // Execute search when URL params change
  useEffect(() => {
    if (!urlQuery.trim()) {
      return;
    }

    let isCancelled = false;
    const fetchSearch = async () => {
      setIsLoading(true);
      try {
        const data = await api.metadata.globalSearch({
          query: urlQuery,
          source: urlSource,
          searchType: urlType,
          includeAdult: hasAdult,
        });
        if (!isCancelled) {
          setResults(data || []);
        }
      } catch (err) {
        console.error('Search error:', err);
        if (!isCancelled) {
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSearch();

    return () => {
      isCancelled = true;
    };
  }, [urlQuery, urlSource, urlType, hasAdult]);

  // Client-side preference filtering for adult performers
  const filteredResults = useMemo(() => {
    const pref = settings?.adult_gender_preference;
    const isAdultSource = SOURCES.find((s) => s.id === urlSource)?.adult;
    if (!isAdultSource || urlType !== 'person' || !pref || pref === 'all') {
      return results;
    }
    return results.filter((item) => {
      const g = item.gender;
      if (pref === 'female') return g === 1 || g === '1';
      if (pref === 'male') return g === 2 || g === '2';
      return true;
    });
  }, [results, urlSource, urlType, settings?.adult_gender_preference]);

  const handleCardClick = (item) => {
    const provider = item.provider || urlSource;
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

  // Handle changing source (applies type fallback logic)
  const handleSourceChange = (newSource) => {
    const availableTypes = TYPES_BY_SOURCE[newSource] || [];
    const hasSameType = availableTypes.some(t => t.id === urlType);
    const nextType = hasSameType ? urlType : (availableTypes[0]?.id || 'all');
    
    setSearchParams({
      q: urlQuery,
      source: newSource,
      type: nextType,
    });
  };

  const handleTypeChange = (newType) => {
    setSearchParams({
      q: urlQuery,
      source: urlSource,
      type: newType,
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({
      q: localQuery.trim(),
      source: urlSource,
      type: urlType,
    });
  };

  const sourceOptions = useMemo(() => {
    return filteredSources.map(s => ({
      value: s.id,
      label: s.name,
    }));
  }, [filteredSources]);

  const typeOptions = useMemo(() => {
    const types = TYPES_BY_SOURCE[urlSource] || [];
    return types.map(t => ({
      value: t.id,
      label: t.name,
    }));
  }, [urlSource]);

  const activeTypeObj = (TYPES_BY_SOURCE[urlSource] || []).find(t => t.id === urlType) || { name: urlType, icon: Clapperboard };
  const FallbackIcon = activeTypeObj.icon;

  const visibleResults = useMemo(() => {
    return filteredResults.slice(0, visibleCount);
  }, [filteredResults, visibleCount]);

  const remainingCount = filteredResults.length - visibleCount;

  return (
    <Page className="search-page-layout">
      <div className="search-page-header">
        <h1 className="search-page-title">
          {urlQuery ? t('search.resultsFor', { query: urlQuery, defaultValue: `Search Results for "${urlQuery}"` }) : t('search.title', { defaultValue: 'Global Search' })}
        </h1>
      </div>

      <div className="search-page-filters">
        <form onSubmit={handleSearchSubmit} className="search-page-input-form">
          <Input
            type="text"
            className="search-page-input"
            placeholder={t('search.inputPlaceholder', { defaultValue: 'Type query and press Enter...' })}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            leftElement={
              <button type="submit" className="search-page-input-btn" aria-label="Search">
                <Search size={18} />
              </button>
            }
          />
        </form>

        <div className="search-page-controls">
          <div className="search-page-control-group">
            <span className="search-page-control-label">{t('search.sourceLabel', { defaultValue: 'Source' })}</span>
            <SegmentedControl
              options={sourceOptions}
              value={urlSource}
              onChange={handleSourceChange}
              ariaLabel="Select search source"
            />
          </div>

          <div className="search-page-control-group">
            <span className="search-page-control-label">{t('search.typeLabel', { defaultValue: 'Type' })}</span>
            <SegmentedControl
              options={typeOptions}
              value={urlType}
              onChange={handleTypeChange}
              ariaLabel="Select search type"
            />
          </div>
        </div>
      </div>

      <div className="search-page-content">
        {isLoading ? (
          <div className="search-page-loading">
            <Spinner size="md" />
          </div>
        ) : !urlQuery.trim() ? (
          <EmptyState
            icon={Search}
            title={t('search.empty.title', { defaultValue: 'Start Searching' })}
            description={t('search.empty.desc', { defaultValue: 'Search metadata from TMDb, StashDB, FansDB, or PornDB' })}
          />
        ) : filteredResults.length === 0 ? (
          <EmptyState
            icon={ImageOff}
            title={t('common.noResults', { defaultValue: 'No Results Found' })}
            description={t('search.noResults.desc', { defaultValue: 'Try another query or change search settings.' })}
          />
        ) : (
          <>
            <PosterGrid className={`search-page-grid ${urlType === 'scene' ? 'library-scenes-grid' : ''}`}>
              {visibleResults.map((item, idx) => {
                const n = normalizeMediaEntity(item, { context: 'search', settings });
                const posterUrl = item.poster_path ? resolveMediaImageUrl(item.poster_path, 'posterThumb') : null;

                let subtitle = n.subtitle || undefined;
                let ratingPill;
                let performers;

                if (item.media_type === 'scene') {
                  performers = n.performers;
                  subtitle = undefined;

                  const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
                  ratingPill = displayDate ? (
                    <span className="search-page-card-date">{displayDate}</span>
                  ) : undefined;
                }

                return (
                  <PosterCard
                    key={`${item.id}-${item.media_type}-${idx}`}
                    aspect={item.media_type === 'scene' ? 'landscape' : 'poster'}
                    className={item.media_type === 'scene' ? 'library-scene-card' : ''}
                    title={item.title || item.name}
                    subtitle={subtitle}
                    ratingPill={ratingPill}
                    performers={performers}
                    imageUrl={posterUrl}
                    icon={FallbackIcon}
                    onClick={() => handleCardClick(item)}
                  />
                );
              })}
            </PosterGrid>

            {remainingCount > 0 && (
              <div className="search-page-more-container">
                <Button
                  variant="secondary-neutral"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                >
                  {t('search.moreMatches', {
                    count: remainingCount,
                    defaultValue: `More matches (+${remainingCount})`
                  })}
                </Button>
              </div>
            )}
            
          </>
        )}
      </div>
    </Page>
  );
}

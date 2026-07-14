import { Search, Clapperboard, ImageOff } from '@/ui/icons';
import Page from '@/ui/Page';
import Skeleton from '@/ui/Skeleton';
import EmptyState from '@/ui/EmptyState';
import PosterGrid from '@/ui/PosterGrid';
import { useSettingsQuery } from '@/queries/settingsQueries';
import useSearchPageController, { TYPES_BY_SOURCE } from './components/useSearchPageController';
import SearchInput from './components/SearchInput';
import SearchFilters from './components/SearchFilters';
import SearchResults from './components/SearchResults';
import './SearchPage.css';

export default function SearchPage() {
  const { data: settings } = useSettingsQuery();
  
  const {
    t,
    localQuery,
    setLocalQuery,
    urlQuery,
    urlSource,
    urlType,
    isLoading,
    isMoreLoading,
    setLoadedPage,
    hasMorePages,
    filteredResults,
    sourceOptions,
    typeOptions,
    handleSourceChange,
    handleTypeChange,
    handleSearchSubmit,
    handleCardClick,
    sessionMode,
  } = useSearchPageController();

  const activeTypeObj = (TYPES_BY_SOURCE[urlSource] || []).find(t => t.id === urlType) || { name: urlType, icon: Clapperboard };
  const FallbackIcon = activeTypeObj.icon;

  return (
    <Page className="search-page-layout">
      <div className="search-page-header">
        <h1 className="search-page-title">
          {urlQuery ? t('search.resultsFor', { query: urlQuery, defaultValue: `Search Results for "${urlQuery}"` }) : t('search.title', { defaultValue: 'Global Search' })}
        </h1>
      </div>

      <div className="search-page-filters">
        <SearchInput
          localQuery={localQuery}
          setLocalQuery={setLocalQuery}
          handleSearchSubmit={handleSearchSubmit}
          t={t}
        />

        <SearchFilters
          urlSource={urlSource}
          handleSourceChange={handleSourceChange}
          sourceOptions={sourceOptions}
          urlType={urlType}
          handleTypeChange={handleTypeChange}
          typeOptions={typeOptions}
          t={t}
        />
      </div>

      <div className="search-page-content">
        {isLoading ? (
          <PosterGrid className={`search-page-grid ${urlType === 'scene' ? 'library-scenes-grid' : ''}`}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <Skeleton.Card
                key={idx}
                className={urlType === 'scene' ? 'search-skeleton-card-scene' : 'search-skeleton-card-poster'}
              />
            ))}
          </PosterGrid>
        ) : !urlQuery.trim() ? (
          <EmptyState
            icon={Search}
            title={t('search.empty.title', { defaultValue: 'Start Searching' })}
            description={t('search.empty.desc', { defaultValue: 'Search metadata from TMDb, StashDB, FansDB, or PornDB' })}
          />
        ) : filteredResults.length === 0 ? (
          <EmptyState
            icon={ImageOff}
            title={t('search.noResults.title', { defaultValue: 'No Results Found' })}
            description={t('search.noResults.desc', { defaultValue: 'Try another query or change search settings.' })}
          />
        ) : (
          <SearchResults
            filteredResults={filteredResults}
            urlType={urlType}
            urlSource={urlSource}
            settings={settings}
            sessionMode={sessionMode}
            FallbackIcon={FallbackIcon}
            handleCardClick={handleCardClick}
            hasMorePages={hasMorePages}
            setLoadedPage={setLoadedPage}
            isMoreLoading={isMoreLoading}
            t={t}
          />
        )}
      </div>
    </Page>
  );
}

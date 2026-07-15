import { Search, Clapperboard, ImageOff } from '@/ui/icons';
import Page from '@/ui/Page';
import Skeleton from '@/ui/Skeleton';
import EmptyState from '@/ui/EmptyState';
import Grid from '@/ui/Grid';
import { useSettingsQuery } from '@/queries/settingsQueries';
import useSearchPageController, { TYPES_BY_SOURCE } from './components/useSearchPageController';
import SearchInput from './components/SearchInput';
import SearchFilters from './components/SearchFilters';
import SearchResults from './components/SearchResults';
import styles from './SearchPage.module.css';
import searchResultStyles from './components/SearchResults.module.css';

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
    <Page className={styles['search-page-layout']}>
      <div className={styles['search-page-header']}>
        <h1 className={styles['search-page-title']}>
          {urlQuery ? t('search.resultsFor', { query: urlQuery, defaultValue: `Search Results for "${urlQuery}"` }) : t('search.title', { defaultValue: 'Global Search' })}
        </h1>
      </div>

      <div className={styles['search-page-filters']}>
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

      <div className={styles['search-page-content']}>
        {isLoading ? (
          <Grid variant={urlType === 'scene' ? 'scene' : 'poster'} className={searchResultStyles['search-page-grid']}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <Skeleton.Card
                key={idx}
                className={urlType === 'scene' ? searchResultStyles['search-skeleton-card-scene'] : searchResultStyles['search-skeleton-card-poster']}
              />
            ))}
          </Grid>
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

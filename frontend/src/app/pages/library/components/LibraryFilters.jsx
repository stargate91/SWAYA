import { useMemo, useState } from 'react';
import Dropdown from '@/ui/Dropdown';
import SegmentedControl from '@/ui/SegmentedControl';
import Pill from '@/ui/Pill';
import {
  isLibraryCollectionTab,
  isLibraryPeopleTab,
  isLibraryTvTab,
  isLibraryTagsTab,
  isLibraryVideoTab,
  isLibraryScenesTab,
  isLibraryMovieTab,
} from '@/lib/libraryTabs';
import LibraryAdvancedFilters from './LibraryAdvancedFilters';
import AttributeFilterDropdown from './AttributeFilterDropdown';
import PanelHeader from '@/ui/PanelHeader';
import Inline from '@/ui/Inline';


const dummyFunc = () => { };

export default function LibraryFilters({
  t,
  settings,
  resolvedTab,
  isCollections,
  isPeople,
  activeSessionMode,
  sortKey,
  setSortKey,
  sortDirection,
  setSortDirection,
  setCurrentPage,
  collectionStatusFilter,
  setCollectionStatusFilter,
  peopleRoleFilter,
  setPeopleRoleFilter,
  genderFilter,
  setGenderFilter,
  ownershipFilter,
  watchedFilter,
  setWatchedFilter,
  genreFilter,
  setGenreFilter,
  decadeFilter,
  setDecadeFilter,
  yearFilter,
  setYearFilter,
  timeFilterMode,
  setTimeFilterMode,
  favoriteFilter,
  setFavoriteFilter,
  selectedTags = [],
  setSelectedTags = dummyFunc,
  tagsFilter = [],
  setTagsFilter = dummyFunc,
  performerFilter,
  setPerformerFilter,
  studioFilter,
  setStudioFilter,
  networkFilter,
  setNetworkFilter,
  hairColorFilter,
  setHairColorFilter,
  ethnicityFilter,
  setEthnicityFilter,
  eyeColorFilter,
  setEyeColorFilter,
  tattoosFilter,
  setTattoosFilter,
  piercingsFilter,
  setPiercingsFilter,
  breastTypeFilter,
  setBreastTypeFilter,
  breastSizeFilter,
  setBreastSizeFilter,
  buttShapeFilter,
  setButtShapeFilter,
  buttSizeFilter,
  setButtSizeFilter,
  filterData,
}) {
  const actualSelectedTags = selectedTags.length > 0 ? selectedTags : tagsFilter;
  const actualSetSelectedTags = setSelectedTags !== dummyFunc ? setSelectedTags : setTagsFilter;

  const isVideoTab = isLibraryVideoTab(resolvedTab);
  const isCollectionTab = isLibraryCollectionTab(resolvedTab);
  const isPeopleTab = isLibraryPeopleTab(resolvedTab);
  const isTagsTab = isLibraryTagsTab(resolvedTab);
  const isTvTab = isLibraryTvTab(resolvedTab);
  const isScenesTab = isLibraryScenesTab(resolvedTab);
  const isMovieTab = isLibraryMovieTab(resolvedTab);

  const yearsList = filterData?.years;
  const decades = useMemo(() => {
    if (!yearsList) return [];
    const set = new Set(yearsList.map(y => `${Math.floor(Number(y) / 10) * 10}s`));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [yearsList]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasAdvancedFilters = !!(
    (filterData?.ethnicities && filterData.ethnicities.length > 0) ||
    (settings?.include_adult && filterData?.breast_types && filterData.breast_types.length > 0) ||
    (settings?.include_adult && filterData?.breast_sizes && filterData.breast_sizes.length > 0) ||
    (settings?.include_adult && filterData?.butt_shapes && filterData.butt_shapes.length > 0) ||
    (settings?.include_adult && filterData?.butt_sizes && filterData.butt_sizes.length > 0) ||
    (filterData?.tattoos && filterData.tattoos.length > 0) ||
    (filterData?.piercings && filterData.piercings.length > 0)
  );

  return (
    <>
      <PanelHeader.Row variant="filters">
        <Inline gap="2xl" align="center" flex={1}>
          {(isVideoTab || isCollectionTab || isPeopleTab || isTagsTab) && (
            <Dropdown
              layout="inline"
              label={t('library.sort.label') || 'Sort:'}
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value);
                setCurrentPage(1);
              }}
              sortDirection={sortDirection}
              onSortDirectionToggle={() => {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                setCurrentPage(1);
              }}
              options={
                isCollectionTab
                  ? [
                    { value: 'owned_count', label: t('library.sort.ownedCount') || 'Item Count' },
                    { value: 'title', label: t('library.sort.title') || 'Title' },
                  ]
                  : isTagsTab
                    ? [
                      { value: 'total_count', label: t('library.sort.itemCount') || 'Item Count' },
                      { value: 'name', label: t('library.sort.name') || 'Name' },
                    ]
                    : isPeopleTab
                      ? [
                          { value: 'name', label: t('library.sort.name') || 'Name' },
                          { value: 'rating', label: activeSessionMode === 'nsfw' ? (t('library.sort.porndbPerformerRating') || 'PornDB performer rating') : (t('library.sort.popularity') || 'Popularity') },
                          ...(activeSessionMode === 'nsfw' ? [
                            { value: 'popularity', label: t('library.sort.popularity') || 'Popularity' },
                          ] : []),
                          { value: 'user_rating', label: t('library.sort.userRating') || 'User Rating' },
                          { value: 'library_count', label: t('library.sort.libraryCount') || 'Library Count' },
                          { value: 'birthday', label: t('library.sort.birthday') || 'Birthdate' },
                          { value: 'last_watched', label: t('library.sort.lastWatched') || 'Last Watched' },
                          { value: 'watch_count', label: t('library.sort.watchCount') || 'Watch Count' },
                          ...(activeSessionMode === 'nsfw' ? [
                            { value: 'finish_count', label: t('library.sort.finishCount') || 'Finish Count' },
                            { value: 'last_finish', label: t('library.sort.lastFinish') || 'Last Finish' },
                          ] : []),
                          { value: 'tag_count', label: t('library.sort.tagCount') || 'Tag Count' },
                          { value: 'height', label: t('library.sort.height') || 'Height' },
                          { value: 'weight', label: t('library.sort.weight') || 'Weight' },
                          ...(settings?.include_adult ? [
                            { value: 'cup_size', label: t('library.sort.cupSize') || 'Breast Size' },
                            { value: 'waist', label: t('library.sort.waist') || 'Waist Size' },
                            { value: 'hip', label: t('library.sort.hip') || 'Hip Size' },
                            { value: 'hourglass_ratio', label: t('library.sort.hourglassRatio') || 'Hourglass Ratio' },
                            { value: 'body_slender', label: t('library.sort.bodySlender') || 'Slender / Athletic' },
                            { value: 'body_curvy', label: t('library.sort.bodyCurvy') || 'Hourglass / Curvy' },
                          ] : []),
                          { value: 'random', label: t('library.sort.random') || 'Random' }
                        ]
                      : [
                        { value: 'title', label: t('library.sort.title') || 'Title' },
                        { value: 'year', label: isTvTab ? (t('library.sort.firstAirYear') || 'First Air Year') : (t('library.sort.year') || 'Year') },
                        { value: 'release_date', label: isTvTab ? (t('library.sort.firstAirDate') || 'First Air Date') : (t('library.sort.releaseDate') || 'Release Date') },
                        ...(!isScenesTab ? [
                          { value: 'rating_imdb', label: t('library.sort.imdbRating') || 'IMDb Rating' },
                          { value: 'rating', label: t('library.sort.tmdbRating') || 'TMDb Rating' },
                        ] : []),
                        { value: 'user_rating', label: t('library.sort.userRating') || 'User Rating' },
                        { value: 'duration', label: t('library.sort.duration') || 'Duration' },
                        { value: 'tag_count', label: t('library.sort.tagCount') || 'Tag Count' },
                        ...(ownershipFilter !== 'unowned' ? [
                          { value: 'file_size', label: t('library.sort.fileSize') || 'File Size' },
                          { value: 'last_watched', label: t('library.sort.lastWatched') || 'Last Watched' },
                          { value: 'watch_count', label: t('library.sort.watchCount') || 'Watch Count' },
                          ...(activeSessionMode === 'nsfw' ? [
                            { value: 'finish_count', label: t('library.sort.finishCount') || 'Finish Count' },
                            { value: 'last_finish', label: t('library.sort.lastFinish') || 'Last Finish' },
                          ] : []),
                        ] : []),
                        { value: 'random', label: t('library.sort.random') || 'Random' }
                      ]
              }
            />
          )}

          {isCollections && (
            <Dropdown
              layout="inline"
              label={t('library.filter.statusLabel') || 'Status:'}
              value={collectionStatusFilter}
              onChange={(e) => {
                setCollectionStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: t('library.filter.all') || 'All' },
                { value: 'complete', label: t('library.filter.complete') || 'Complete' },
                { value: 'in_progress', label: t('library.filter.inProgress') || 'In Progress' },
              ]}
            />
          )}

          {isPeople && (() => {
            const roleOptions = [
              { value: 'all', label: t('library.filter.all') || 'All' },
              { value: 'actor', label: t('library.people.roles.actor') || 'Actor' },
              { value: 'director', label: t('library.people.roles.director') || 'Director' },
              { value: 'writer', label: t('library.people.roles.writer') || 'Writer' },
              { value: 'sound', label: t('library.people.roles.sound') || 'Composer' },
            ];
            const filteredRoleOptions = roleOptions.filter(opt => {
              if (opt.value === 'all') return true;
              if (peopleRoleFilter === opt.value) return true;
              return filterData?.roles && filterData.roles.includes(opt.value);
            });
            return (
              <Dropdown
                layout="inline"
                label={t('library.filter.roleLabel') || 'Role:'}
                value={peopleRoleFilter}
                onChange={(e) => {
                  setPeopleRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={filteredRoleOptions}
              />
            );
          })()}

          {isPeople && (activeSessionMode !== 'nsfw' || !settings?.adult_gender_preference || settings.adult_gender_preference === 'all') && (() => {
            const genderOptions = [
              { value: 'all', label: t('library.filter.all') || 'All' },
              { value: 'female', label: t('library.filter.female') || 'Female' },
              { value: 'male', label: t('library.filter.male') || 'Male' },
            ];
            const filteredGenderOptions = genderOptions.filter(opt => {
              if (opt.value === 'all') return true;
              if (genderFilter === opt.value) return true;
              return filterData?.genders && filterData.genders.includes(opt.value);
            });
            return (
              <Dropdown
                layout="inline"
                label={t('library.filter.genderLabel') || 'Gender:'}
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={filteredGenderOptions}
              />
            );
          })()}
          {isPeople && (
            <AttributeFilterDropdown
              label={t('library.filter.ethnicityLabel') || 'Ethnicity:'}
              value={ethnicityFilter}
              onChange={setEthnicityFilter}
              items={filterData?.ethnicities}
              allLabel={t('library.filter.allEthnicities') || 'All Ethnicities'}
              setCurrentPage={setCurrentPage}
            />
          )}
          {isPeople && (
            <AttributeFilterDropdown
              label={t('library.filter.hairColorLabel') || 'Hair Color:'}
              value={hairColorFilter}
              onChange={setHairColorFilter}
              items={filterData?.hair_colors}
              allLabel={t('library.filter.allHairColors') || 'All'}
              setCurrentPage={setCurrentPage}
            />
          )}
          {isVideoTab && (
            <Dropdown
              layout="inline"
              label={t('library.filter.statusLabel') || 'Status:'}
              value={watchedFilter}
              onChange={(e) => {
                setWatchedFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: t('library.filter.all') || 'All' },
                { value: 'watched', label: t('library.filter.watched') || 'Watched' },
                { value: 'unwatched', label: t('library.filter.unwatched') || 'Unwatched' },
              ]}
            />
          )}

          {isVideoTab && !isScenesTab && activeSessionMode !== 'nsfw' && (
            <Dropdown
              layout="inline"
              label={t('library.filter.genreLabel') || 'Genre:'}
              value={genreFilter}
              onChange={(e) => {
                setGenreFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: t('library.filter.allGenres') || 'All Genres' },
                ...(filterData?.genres || []).map(g => ({ value: g, label: t(`library.genres.${g}`, { defaultValue: g }) })),
              ]}
            />
          )}

          {isScenesTab && activeSessionMode === 'nsfw' && filterData?.performers && filterData.performers.length > 0 && (
            <Dropdown
              layout="inline"
              label={t('library.filter.performerLabel') || 'Performer:'}
              value={performerFilter}
              searchable={true}
              onChange={(e) => {
                setPerformerFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: t('library.filter.allPerformers') || 'All Performers' },
                ...(filterData.performers).map(p => ({ value: String(p.id), label: p.name })),
              ]}
            />
          )}

          {((isMovieTab && filterData?.studios && filterData.studios.length > 0) ||
            (isScenesTab && activeSessionMode === 'nsfw' && filterData?.studios && filterData.studios.length > 0)) && (
            <Dropdown
              layout="inline"
              label={
                activeSessionMode === 'nsfw'
                  ? (t('library.filter.studioLabel') || 'Studio:')
                  : (t('library.filter.companyLabel') || 'Company:')
              }
              value={studioFilter}
              searchable={true}
              onChange={(e) => {
                setStudioFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                {
                  value: '',
                  label: activeSessionMode === 'nsfw'
                    ? (t('library.filter.allStudios') || 'All Studios')
                    : (t('library.filter.allCompanies') || 'All Companies'),
                },
                ...(filterData.studios).map(s => ({ value: String(s.id), label: s.name })),
              ]}
            />
          )}

          {isTvTab && filterData?.networks && filterData.networks.length > 0 && (
            <Dropdown
              layout="inline"
              label={t('library.filter.networkLabel') || 'Network:'}
              value={networkFilter}
              searchable={true}
              onChange={(e) => {
                setNetworkFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: t('library.filter.allNetworks') || 'All Networks' },
                ...(filterData.networks).map(n => ({ value: String(n.id), label: n.name })),
              ]}
            />
          )}

          {(isVideoTab || isPeopleTab) && filterData?.tags && filterData.tags.length > 0 && (
            <Dropdown
              layout="inline"
              label={t('library.filter.tagsLabel') || 'Tags:'}
              searchable={true}
              multiple={true}
              value={actualSelectedTags}
              onChange={(e) => {
                actualSetSelectedTags(e.target.value);
                setCurrentPage(1);
              }}
              options={filterData.tags.map((tag) => ({
                value: tag.name,
                label: tag.name,
                color: tag.color,
              }))}
              placeholder={t('library.filter.allTags') || 'All Tags'}
            />
          )}

          {isVideoTab && timeFilterMode === 'decade' && (
            <Dropdown
              layout="inline"
              label={t('library.filter.decadeLabel') || 'Decade:'}
              value={decadeFilter}
              onChange={(e) => {
                setDecadeFilter(e.target.value);
                setYearFilter('');
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: t('library.filter.allDecades') || 'All Decades' },
                ...(decades || []).map(d => ({ value: d, label: d })),
              ]}
            />
          )}

          {isVideoTab && timeFilterMode === 'year' && (
            <Dropdown
              layout="inline"
              label={t('library.filter.yearLabel') || 'Year:'}
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setDecadeFilter('all');
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: t('library.filter.allYears') || 'All Years' },
                ...(filterData?.years || []).map(y => ({ value: String(y), label: String(y) })),
              ]}
            />
          )}
        </Inline>

        <Inline gap="md" align="center">
            {isPeople && (
              <Pill
                variant={favoriteFilter === 'favorite' ? 'favorite-active' : 'favorite'}
                onClick={() => {
                  setFavoriteFilter(prev => prev === 'favorite' ? 'all' : 'favorite');
                  setCurrentPage(1);
                }}
              >
                {t('library.filter.favorite') || 'Favourite'}
              </Pill>
            )}

          {isPeopleTab && hasAdvancedFilters && (
            <Pill
              variant={showAdvanced ? 'filter-active' : 'favorite'}
              onClick={() => setShowAdvanced(prev => !prev)}
              className="advanced-filters-toggle"
            >
              {showAdvanced ? (t('library.filter.lessFilters') || 'Less') : (t('library.filter.advancedFilters') || 'Filters')}
            </Pill>
          )}

          {isVideoTab && (
            <SegmentedControl
              variant="filter"
              value={timeFilterMode}
              onChange={(val) => {
                setTimeFilterMode(val);
                setDecadeFilter('all');
                setYearFilter('');
                setCurrentPage(1);
              }}
              options={[
                { value: 'decade', label: t('library.filter.decadeMode') || 'Decade' },
                { value: 'year', label: t('library.filter.yearMode') || 'Year' },
              ]}
            />
          )}
        </Inline>
      </PanelHeader.Row>

      {showAdvanced && isPeopleTab && (
        <LibraryAdvancedFilters
          t={t}
          ethnicityFilter={ethnicityFilter}
          setEthnicityFilter={setEthnicityFilter}
          breastTypeFilter={breastTypeFilter}
          setBreastTypeFilter={setBreastTypeFilter}
          breastSizeFilter={breastSizeFilter}
          setBreastSizeFilter={setBreastSizeFilter}
          buttShapeFilter={buttShapeFilter}
          setButtShapeFilter={setButtShapeFilter}
          buttSizeFilter={buttSizeFilter}
          setButtSizeFilter={setButtSizeFilter}
          tattoosFilter={tattoosFilter}
          setTattoosFilter={setTattoosFilter}
          piercingsFilter={piercingsFilter}
          setPiercingsFilter={setPiercingsFilter}
          eyeColorFilter={eyeColorFilter}
          setEyeColorFilter={setEyeColorFilter}
          filterData={filterData}
          setCurrentPage={setCurrentPage}
          activeSessionMode={activeSessionMode}
          settings={settings}
        />
      )}
    </>
  );
}

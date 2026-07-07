import SegmentedControl from '@/ui/SegmentedControl';
import { Search } from '@/ui/icons';

export default function DrawerSearchHeader({
  listType,
  isAdultActive,
  source,
  setSource,
  mediaType,
  setMediaType,
  provider,
  setProvider,
  statusFilter,
  setStatusFilter,
  query,
  setQuery,
  setResults,
}) {
  return (
    <div className="lists-drawer__search-area">
      <SegmentedControl
        options={[
          { label: 'My Library', value: 'library' },
          { label: isAdultActive ? 'Discover (Online)' : 'Discover (TMDB)', value: 'discover' }
        ]}
        value={source}
        onChange={(val) => {
          setSource(val);
          if (val === 'discover') {
            if (mediaType === 'scene') {
              if (isAdultActive) {
                setProvider('porndb');
              } else {
                setMediaType('movie');
                setProvider('tmdb');
              }
            } else if (mediaType === 'videos') {
              setMediaType('movie');
              setProvider('tmdb');
            } else {
              setProvider('tmdb');
            }
          }
          setResults([]);
        }}
      />

      {listType === 'media' && (
        <SegmentedControl
          options={[
            { label: 'Movies', value: 'movie' },
            { label: 'TV Shows', value: 'tv' },
            ...(isAdultActive ? [{ label: 'Scenes', value: 'scene' }] : []),
            ...(source === 'library' ? [{ label: 'Videos', value: 'videos' }] : [])
          ]}
          value={mediaType}
          onChange={(val) => {
            setMediaType(val);
            if (val === 'scene') {
              setProvider('porndb');
            } else {
              setProvider('tmdb');
            }
            setResults([]);
          }}
        />
      )}

      {isAdultActive && source === 'discover' && (mediaType === 'movie' || mediaType === 'scene' || listType === 'person') && (
        <SegmentedControl
          options={
            listType === 'person' ? [
              { label: 'TMDB', value: 'tmdb' },
              { label: 'ThePornDB', value: 'porndb' },
              { label: 'StashDB', value: 'stashdb' },
              { label: 'FansDB', value: 'fansdb' }
            ] : mediaType === 'scene' ? [
              { label: 'ThePornDB', value: 'porndb' },
              { label: 'StashDB', value: 'stashdb' },
              { label: 'FansDB', value: 'fansdb' }
            ] : [
              { label: 'TMDB', value: 'tmdb' },
              { label: 'ThePornDB', value: 'porndb' }
            ]
          }
          value={provider}
          onChange={(val) => {
            setProvider(val);
            setResults([]);
          }}
        />
      )}

      {source === 'library' && (
        <SegmentedControl
          options={[
            { label: 'Not in List', value: 'not_added' },
            { label: 'In List', value: 'added' }
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      )}

      <div className="lists-drawer__search-input-wrap">
        <Search size={16} className="lists-drawer__search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={listType === 'person' ? 'Search performers...' : 'Search movies, series...'}
        />
      </div>
    </div>
  );
}

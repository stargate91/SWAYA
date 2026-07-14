import SegmentedControl from '@/ui/SegmentedControl';

export default function SearchFilters({
  urlSource,
  handleSourceChange,
  sourceOptions,
  urlType,
  handleTypeChange,
  typeOptions,
  t,
}) {
  return (
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
  );
}

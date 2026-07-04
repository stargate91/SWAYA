 
import Dropdown from '@/ui/Dropdown';

export default function DecadeFilterDropdown({
  t,
  decadeFilter,
  setDecadeFilter,
  setYearFilter,
  setCurrentPage,
  decades
}) {
  return (
    <div className="library-sorter-container">
      <span className="library-sorter-label">{t('library.filter.decadeLabel') || 'Decade:'}</span>
      <Dropdown
        variant="sorter"
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
    </div>
  );
}

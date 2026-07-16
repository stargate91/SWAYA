import SegmentedControl from '@/ui/SegmentedControl';
import Inline from '@/ui/Inline';
import styles from './SearchFilters.module.css';

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
    <Inline gap="lg" align="center" className={styles['search-page-controls']}>
      <div className={styles['search-page-control-group']}>
        <span className={styles['search-page-control-label']}>{t('search.sourceLabel', { defaultValue: 'Source' })}</span>
        <SegmentedControl
          options={sourceOptions}
          value={urlSource}
          onChange={handleSourceChange}
          ariaLabel="Select search source"
        />
      </div>

      <div className={styles['search-page-control-group']}>
        <span className={styles['search-page-control-label']}>{t('search.typeLabel', { defaultValue: 'Type' })}</span>
        <SegmentedControl
          options={typeOptions}
          value={urlType}
          onChange={handleTypeChange}
          ariaLabel="Select search type"
        />
      </div>
    </Inline>
  );
}

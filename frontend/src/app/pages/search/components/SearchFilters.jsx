import SegmentedControl from '@/ui/SegmentedControl';
import Inline from '@/ui/Inline';
import Field from '@/ui/Field';

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
    <Inline gap="lg" align="center">
      <Field label={t('search.sourceLabel', { defaultValue: 'Source' })}>
        <SegmentedControl
          options={sourceOptions}
          value={urlSource}
          onChange={handleSourceChange}
          ariaLabel="Select search source"
        />
      </Field>

      <Field label={t('search.typeLabel', { defaultValue: 'Type' })}>
        <SegmentedControl
          options={typeOptions}
          value={urlType}
          onChange={handleTypeChange}
          ariaLabel="Select search type"
        />
      </Field>
    </Inline>
  );
}

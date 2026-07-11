import FilterDropdown from '@/ui/FilterDropdown';
import { formatPhysicalAttributeLabel } from '../utils/formatPhysicalAttributeLabel';

export default function AttributeFilterDropdown({
  label,
  value,
  onChange,
  items = [],
  allLabel,
  setCurrentPage,
  ...props
}) {
  if (!items || items.length === 0) return null;

  const options = [
    { value: '', label: allLabel },
    ...items.map(item => ({
      value: typeof item === 'object' ? item.value : item,
      label: typeof item === 'object' ? item.label : formatPhysicalAttributeLabel(item)
    }))
  ];

  return (
    <FilterDropdown
      label={label}
      value={value}
      onFilterChange={onChange}
      setCurrentPage={setCurrentPage}
      options={options}
      {...props}
    />
  );
}

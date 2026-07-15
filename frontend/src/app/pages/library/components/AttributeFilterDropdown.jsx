import Dropdown from '@/ui/Dropdown';
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
  const isDisabled = (!items || items.length === 0) && !value;

  const options = [
    { value: '', label: allLabel },
    ...items.map(item => ({
      value: typeof item === 'object' ? item.value : item,
      label: typeof item === 'object' ? item.label : formatPhysicalAttributeLabel(item)
    }))
  ];

  return (
    <Dropdown
      layout="inline"
      label={label}
      value={value}
      onFilterChange={onChange}
      setCurrentPage={setCurrentPage}
      options={options}
      disabled={isDisabled}
      {...props}
    />
  );
}

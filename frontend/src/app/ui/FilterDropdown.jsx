import React from 'react';
import FilterField from './FilterField';
import Dropdown from './Dropdown';

const FilterDropdown = React.forwardRef(({
  label,
  className = '',
  onFilterChange,
  setCurrentPage,
  onChange,
  ...dropdownProps
}, ref) => {
  const handleDropdownChange = (e) => {
    const val = e.target.value;
    if (onFilterChange) {
      onFilterChange(val);
    } else if (onChange) {
      onChange(e);
    }
    if (setCurrentPage) {
      setCurrentPage(1);
    }
  };

  return (
    <FilterField label={label} className={className} ref={ref}>
      <Dropdown variant="sorter" onChange={handleDropdownChange} {...dropdownProps} />
    </FilterField>
  );
});


FilterDropdown.displayName = 'FilterDropdown';

export default FilterDropdown;

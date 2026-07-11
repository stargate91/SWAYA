import React from 'react';

const FilterField = React.forwardRef(({ label, children, className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`library-sorter-container ${className}`.trim()} {...props}>
      {label && <span className="library-sorter-label">{label}</span>}
      {children}
    </div>
  );
});

FilterField.displayName = 'FilterField';

export default FilterField;

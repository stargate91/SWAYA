import './SegmentedControl.css';

export default function SegmentedControl({ options, value, onChange, ariaLabel, variant = 'default', className = '', ...props }) {
  return (
    <div
      className={`ui-segmented-control ui-segmented-control--${variant} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      {...props}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const isDisabled = Boolean(option.disabled);
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            className={`ui-segmented-control__option${isActive ? ' is-active' : ''}${isDisabled ? ' is-disabled' : ''}`}
            onClick={() => !isDisabled && onChange(option.value)}
            disabled={isDisabled}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

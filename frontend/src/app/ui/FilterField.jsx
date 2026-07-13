import './FilterField.css';

export default function FilterField({ label, children, className = '', ref, ...props }) {
  return (
    <div ref={ref} className={`ui-filter-field ${className}`.trim()} {...props}>
      {label && <span className="ui-filter-field__label">{label}</span>}
      {children}
    </div>
  );
}



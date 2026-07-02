import './Radio.css';

export default function Radio({ checked, onChange, disabled, className = '', children, ...props }) {
  return (
    <label className={`ui-radio-wrap ${disabled ? 'is-disabled' : ''} ${className}`.trim()}>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="ui-radio-input"
        {...props}
      />
      <span className="ui-radio" />
      {children ? <span className="ui-radio-label">{children}</span> : null}
    </label>
  );
}

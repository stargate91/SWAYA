export default function BulkOverrideFieldRow({ label, checked, onChange, children }) {
  return (
    <div className="organizer-override-field">
      <label className="organizer-override-field__checkbox-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="ui-checkbox"
        />
        <span className="organizer-override-field__label-text">{label}</span>
      </label>
      <div className={`organizer-override-field__input ${!checked ? 'is-disabled' : ''}`}>
        {children}
      </div>
    </div>
  );
}

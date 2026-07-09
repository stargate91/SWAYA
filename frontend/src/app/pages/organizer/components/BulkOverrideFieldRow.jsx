import Checkbox from '../../../ui/Checkbox';

export default function BulkOverrideFieldRow({ label, checked, onChange, children }) {
  return (
    <div className="organizer-override-field">
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="organizer-override-field__checkbox-label"
      >
        <span className="organizer-override-field__label-text">{label}</span>
      </Checkbox>
      <div className={`organizer-override-field__input ${!checked ? 'is-disabled' : ''}`}>
        {children}
      </div>
    </div>
  );
}

